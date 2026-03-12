#!/usr/bin/env bash
# =============================================================
# HMS — Development Stop Script
# =============================================================
# Stops all HMS development processes and Docker containers.
# This is the companion to scripts/start-dev.sh.
#
# What it stops:
#   - Next.js dev server (next dev)
#   - Prisma Studio (prisma studio)
#   - Docker containers (all services defined in docker-compose.yml)
#
# What it preserves:
#   - Docker volumes (database data, Redis data, MinIO files)
#   - Node modules, .env, and all project files
#   - Unrelated processes and containers
#
# Usage:
#   ./scripts/stop-dev.sh              # Stop everything
#   ./scripts/stop-dev.sh --skip-docker   # Skip Docker, only stop processes
#   npm run stop                       # Same as above (via package.json)
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

for arg in "$@"; do
  case $arg in
    --skip-docker) SKIP_DOCKER=true ;;
    --help|-h)
      echo "Usage: ./scripts/stop-dev.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-docker   Skip stopping Docker containers"
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
echo "  ║   HMS — Development Stop Script      ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

STOPPED_SOMETHING=false

# ── 1. Stop Next.js Dev Server ───────────────────────────────

step "Stopping Next.js dev server"

# Find next dev processes that belong to THIS project
NEXT_PIDS=$(ps -ax -o pid=,command= | grep "[n]ode.*${PROJECT_ROOT}/node_modules/.bin/next dev" | awk '{print $1}' || true)

if [ -n "$NEXT_PIDS" ]; then
  # Also check for any child node processes spawned by next dev for this project
  NEXT_CHILD_PIDS=$(ps -ax -o pid=,ppid=,command= | awk -v pids="$NEXT_PIDS" '
    BEGIN { split(pids, arr) ; for (i in arr) parents[arr[i]]=1 }
    { if ($2 in parents && $0 ~ /node/) print $1 }
  ' 2>/dev/null || true)

  for PID in $NEXT_PIDS; do
    kill "$PID" 2>/dev/null && success "Stopped Next.js dev server (PID $PID)" || warn "Could not stop process $PID"
  done

  if [ -n "$NEXT_CHILD_PIDS" ]; then
    for PID in $NEXT_CHILD_PIDS; do
      kill "$PID" 2>/dev/null || true
    done
  fi

  STOPPED_SOMETHING=true
else
  info "Next.js dev server is not running"
fi

# ── 2. Stop Prisma Studio ────────────────────────────────────

step "Stopping Prisma Studio"

PRISMA_PIDS=$(ps -ax -o pid=,command= | grep "[p]risma studio" | grep "$PROJECT_ROOT" | awk '{print $1}' || true)

if [ -n "$PRISMA_PIDS" ]; then
  for PID in $PRISMA_PIDS; do
    kill "$PID" 2>/dev/null && success "Stopped Prisma Studio (PID $PID)" || warn "Could not stop process $PID"
  done
  STOPPED_SOMETHING=true
else
  info "Prisma Studio is not running"
fi

# ── 3. Stop Docker Containers ────────────────────────────────

if [ "$SKIP_DOCKER" = false ]; then
  step "Stopping Docker containers"

  if ! command -v docker &>/dev/null; then
    warn "Docker not found — skipping container shutdown"
  else
    # Check which HMS containers are running
    HMS_CONTAINERS=("hms-db" "hms-redis" "hms-minio")
    RUNNING_CONTAINERS=()

    for NAME in "${HMS_CONTAINERS[@]}"; do
      STATUS=$(docker inspect --format='{{.State.Status}}' "$NAME" 2>/dev/null || echo "not_found")
      if [ "$STATUS" = "running" ]; then
        RUNNING_CONTAINERS+=("$NAME")
      fi
    done

    if [ ${#RUNNING_CONTAINERS[@]} -gt 0 ]; then
      info "Stopping: ${RUNNING_CONTAINERS[*]}"
      docker compose down 2>/dev/null && success "Docker containers stopped" || error "Failed to stop Docker containers"
      STOPPED_SOMETHING=true
    else
      info "No HMS Docker containers are running"
    fi
  fi
else
  info "Skipping Docker (--skip-docker)"
fi

# ── Summary ───────────────────────────────────────────────────

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$STOPPED_SOMETHING" = true ]; then
  echo -e "${GREEN}  HMS development environment stopped.${NC}"
else
  echo -e "${YELLOW}  Nothing was running.${NC}"
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Data preserved:"
echo "    - Docker volumes (database, Redis, MinIO)"
echo "    - Project files and node_modules"
echo ""
echo "  To start again:"
echo "    npm run setup"
echo ""
