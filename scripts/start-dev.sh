#!/usr/bin/env bash
# =============================================================
# HMS — Project Startup Script
# =============================================================
# Analyzes the project state and sets up everything needed
# to run the Hospital Management System locally.
#
# Usage:
#   ./scripts/start-dev.sh          # Full startup
#   ./scripts/start-dev.sh --skip-docker   # Skip Docker checks
#   ./scripts/start-dev.sh --no-dev        # Setup only, don't start dev server
# =============================================================

set -euo pipefail

# ── Colors & Helpers ──────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
step()    { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# ── Parse Flags ───────────────────────────────────────────────

SKIP_DOCKER=false
NO_DEV=false

for arg in "$@"; do
  case $arg in
    --skip-docker) SKIP_DOCKER=true ;;
    --no-dev)      NO_DEV=true ;;
    --help|-h)
      echo "Usage: ./scripts/start-dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-docker   Skip Docker container checks"
      echo "  --no-dev        Setup only, don't start the dev server"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      error "Unknown option: $arg"
      exit 1
      ;;
  esac
done

# ── Navigate to project root ─────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   HMS — Development Startup Script   ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Check Prerequisites ───────────────────────────────────

step "Checking prerequisites"

# Node.js
if command -v node &>/dev/null; then
  NODE_VERSION=$(node -v)
  success "Node.js found: $NODE_VERSION"

  # Check minimum version (Node 18+)
  NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    error "Node.js 18+ required, found $NODE_VERSION"
    exit 1
  fi
else
  error "Node.js is not installed. Install Node.js 18+ to continue."
  exit 1
fi

# npm
if command -v npm &>/dev/null; then
  success "npm found: $(npm -v)"
else
  error "npm is not installed."
  exit 1
fi

# Docker (optional but needed for DB)
if [ "$SKIP_DOCKER" = false ]; then
  if command -v docker &>/dev/null; then
    success "Docker found: $(docker --version | head -1)"
  else
    warn "Docker not found. Database containers cannot be managed."
    warn "Use --skip-docker to skip Docker checks, or install Docker."
    SKIP_DOCKER=true
  fi
fi

# ── 2. Environment File ──────────────────────────────────────

step "Checking environment configuration"

if [ -f .env ]; then
  success ".env file exists"

  # Validate that key variables are present
  MISSING_VARS=()
  for var in DATABASE_URL JWT_SECRET REFRESH_TOKEN_SECRET; do
    if ! grep -q "^${var}=" .env; then
      MISSING_VARS+=("$var")
    fi
  done

  if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    warn "Missing variables in .env: ${MISSING_VARS[*]}"
    warn "Check .env.example for reference."
  else
    success "Required environment variables present"
  fi

  # Warn about default secrets in non-development
  if grep -q 'NODE_ENV="production"' .env 2>/dev/null; then
    if grep -q 'change-me\|dev-jwt-secret' .env 2>/dev/null; then
      error "Production .env contains default/insecure secrets!"
      error "Update JWT_SECRET and REFRESH_TOKEN_SECRET before deploying."
      exit 1
    fi
  fi
elif [ -f .env.example ]; then
  warn ".env file not found — creating from .env.example"
  cp .env.example .env
  success ".env created from .env.example"
  warn "Review .env and update secrets before deploying to production."
else
  error "Neither .env nor .env.example found!"
  error "Create a .env file with the required configuration. See README."
  exit 1
fi

# ── 3. Dependencies ──────────────────────────────────────────

step "Checking dependencies"

NEEDS_INSTALL=false

if [ ! -d node_modules ]; then
  info "node_modules/ not found — install required"
  NEEDS_INSTALL=true
elif [ ! -f node_modules/.package-lock.json ]; then
  info "node_modules appears incomplete — install required"
  NEEDS_INSTALL=true
else
  # Compare package.json modification time against node_modules
  # If package.json is newer, dependencies may have changed
  if [ package.json -nt node_modules/.package-lock.json ]; then
    info "package.json is newer than last install — running install to sync"
    NEEDS_INSTALL=true
  elif [ package-lock.json -nt node_modules/.package-lock.json ]; then
    info "package-lock.json is newer than last install — running install to sync"
    NEEDS_INSTALL=true
  else
    success "Dependencies are up to date"
  fi
fi

if [ "$NEEDS_INSTALL" = true ]; then
  info "Installing dependencies..."
  npm install
  success "Dependencies installed"
fi

# ── 4. Prisma Client ─────────────────────────────────────────

step "Checking Prisma client"

PRISMA_CLIENT_DIR="node_modules/.prisma/client"
PRISMA_SCHEMA="prisma/schema.prisma"

if [ ! -d "$PRISMA_CLIENT_DIR" ]; then
  info "Prisma client not generated — generating now..."
  npx prisma generate
  success "Prisma client generated"
elif [ "$PRISMA_SCHEMA" -nt "$PRISMA_CLIENT_DIR" ]; then
  info "Schema changed since last generate — regenerating Prisma client..."
  npx prisma generate
  success "Prisma client regenerated"
else
  success "Prisma client is up to date"
fi

# ── 5. Docker Containers ─────────────────────────────────────

if [ "$SKIP_DOCKER" = false ]; then
  step "Checking Docker containers"

  CONTAINERS=("hms-db" "hms-redis" "hms-minio")
  CONTAINER_LABELS=("PostgreSQL" "Redis" "MinIO")
  ALL_RUNNING=true
  HAS_EXITED=false

  for i in "${!CONTAINERS[@]}"; do
    NAME="${CONTAINERS[$i]}"
    LABEL="${CONTAINER_LABELS[$i]}"
    STATUS=$(docker inspect --format='{{.State.Status}}' "$NAME" 2>/dev/null || echo "not_found")

    case "$STATUS" in
      running)
        success "$LABEL ($NAME) is running"
        ;;
      exited)
        warn "$LABEL ($NAME) has exited — will NOT auto-restart an exited container"
        warn "  To inspect: docker logs $NAME"
        warn "  To restart: docker start $NAME"
        ALL_RUNNING=false
        HAS_EXITED=true
        ;;
      not_found)
        info "$LABEL ($NAME) not found — will be created"
        ALL_RUNNING=false
        ;;
      *)
        warn "$LABEL ($NAME) is in state: $STATUS"
        ALL_RUNNING=false
        ;;
    esac
  done

  if [ "$ALL_RUNNING" = true ]; then
    success "All containers are running"
  elif [ "$HAS_EXITED" = true ]; then
    warn "Some containers have exited. Investigate logs before restarting."
    warn "Starting only missing (new) containers..."
    # Only start containers that don't exist at all
    for i in "${!CONTAINERS[@]}"; do
      NAME="${CONTAINERS[$i]}"
      STATUS=$(docker inspect --format='{{.State.Status}}' "$NAME" 2>/dev/null || echo "not_found")
      if [ "$STATUS" = "not_found" ]; then
        info "Starting $NAME..."
      fi
    done
    # docker compose up -d won't restart exited containers unless --force-recreate
    # It only starts containers that don't exist
    docker compose up -d --no-recreate 2>/dev/null || warn "docker compose up failed"
  else
    info "Starting Docker containers..."
    docker compose up -d
    success "Docker containers started"

    # Wait for PostgreSQL to be healthy
    info "Waiting for PostgreSQL to be ready..."
    RETRIES=0
    MAX_RETRIES=30
    until docker exec hms-db pg_isready -U hms_user -d hms_db &>/dev/null; do
      RETRIES=$((RETRIES + 1))
      if [ $RETRIES -ge $MAX_RETRIES ]; then
        error "PostgreSQL did not become ready in time"
        exit 1
      fi
      sleep 1
    done
    success "PostgreSQL is ready"
  fi
fi

# ── 6. Database Migrations ───────────────────────────────────

step "Checking database"

# Source .env to get DATABASE_URL
set -a
source .env
set +a

if [ -n "${DATABASE_URL:-}" ]; then
  # Check if database is reachable
  if npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
    success "Database is reachable"

    # Check for pending migrations
    MIGRATION_DIR="prisma/migrations"
    if [ -d "$MIGRATION_DIR" ] && [ "$(ls -A "$MIGRATION_DIR" 2>/dev/null)" ]; then
      # There are migration files, check if they're applied
      MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)
      if echo "$MIGRATION_STATUS" | grep -q "have not yet been applied"; then
        warn "Pending migrations detected — applying..."
        npx prisma migrate deploy
        success "Migrations applied"
      else
        success "All migrations are applied"
      fi
    else
      info "No migration files found — pushing schema directly"
      npx prisma db push
      success "Database schema synced"
    fi
  else
    warn "Database is not reachable — skipping migration check"
    warn "Make sure Docker containers are running and DATABASE_URL is correct"
  fi
else
  warn "DATABASE_URL not set — skipping database checks"
fi

# ── 7. Port Availability ─────────────────────────────────────

step "Checking port availability"

check_port() {
  local PORT=$1
  local SERVICE=$2
  if command -v lsof &>/dev/null; then
    if lsof -i ":$PORT" &>/dev/null; then
      warn "Port $PORT ($SERVICE) is already in use"
      return 1
    fi
  elif command -v ss &>/dev/null; then
    if ss -tlnp | grep -q ":$PORT "; then
      warn "Port $PORT ($SERVICE) is already in use"
      return 1
    fi
  fi
  success "Port $PORT ($SERVICE) is available"
  return 0
}

check_port 3000 "Next.js dev server" || true
check_port 54320 "PostgreSQL" || true
check_port 6379 "Redis" || true
check_port 9000 "MinIO API" || true

# ── 8. TypeScript Check ──────────────────────────────────────

step "Quick TypeScript check"

if npx tsc --noEmit --pretty 2>/dev/null; then
  success "No TypeScript errors"
else
  warn "TypeScript errors found — dev server will still start but fix these"
fi

# ── Summary ───────────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Useful commands:"
echo "    npm run dev            Start development server"
echo "    npm run db:studio      Open Prisma Studio"
echo "    npm run db:seed        Seed the database"
echo "    npm run lint           Run linter"
echo "    npm run docker:down    Stop Docker containers"
echo ""

# ── 9. Start Dev Server ──────────────────────────────────────

if [ "$NO_DEV" = false ]; then
  step "Starting development server"
  info "Starting Next.js dev server on http://localhost:3000"
  echo ""
  exec npm run dev
fi
