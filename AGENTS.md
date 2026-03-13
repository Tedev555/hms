# AGENTS.md — HMS (Hospital Management System)

Next.js 16 app with TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, and shadcn/ui.
Monorepo-style single package. App Router with route groups for auth and dashboard.

## Build / Dev / Lint Commands

```bash
npm run dev              # Start Next.js dev server (port 30000)
npm run build            # Production build
npm run lint             # ESLint check (next lint)
npm run lint:fix         # ESLint autofix
npm run format           # Prettier write on src/**/*.{ts,tsx,css}
npm run format:check     # Prettier check only
```

## Test Commands

### Unit tests (Vitest + jsdom + React Testing Library)

```bash
npm test                 # Run all unit tests once (vitest run)
npm run test:watch       # Watch mode
npm run test:coverage    # With V8 coverage (covers src/lib/** and src/middleware/**)

# Run a single test file:
npx vitest run src/__tests__/lib/auth.test.ts

# Run tests matching a name pattern:
npx vitest run -t "hashPassword"
```

Test files live in `src/__tests__/` mirroring the source tree. Tests use `*.test.ts` suffix.
Setup file: `src/__tests__/setup.ts` (sets env vars and imports jest-dom matchers).
Path alias `@/*` resolves to `./src/*` in vitest config.

### E2E tests (Playwright)

```bash
npm run test:e2e         # Headless (launches dev server automatically)
npm run test:e2e:headed  # Headed browser
npm run test:e2e:ui      # Playwright UI mode

# Run a single e2e spec:
npx playwright test e2e/login.spec.ts

# Run a single test by title:
npx playwright test -g "logs in successfully"
```

E2E tests live in `e2e/`. Auth setup (`e2e/auth.setup.ts`) runs first and persists
storage state to `e2e/.auth/user.json`. Test credentials come from `e2e/fixtures/test-data.ts`
and must match seeded data (`npm run db:seed`).

## Database Commands

```bash
npm run db:generate      # prisma generate (also runs on postinstall)
npm run db:migrate       # prisma migrate dev (creates migration)
npm run db:migrate:prod  # prisma migrate deploy
npm run db:push          # prisma db push (no migration file)
npm run db:seed          # npx tsx prisma/seed.ts
npm run db:studio        # Prisma Studio GUI
npm run docker:up        # Start Postgres, Redis, MinIO containers
npm run docker:down      # Stop containers
npm run setup            # Full dev setup (docker + migrations + seed + dev server)
```

Database is PostgreSQL (port 54320 in dev). Schema: `prisma/schema.prisma`.

## Code Style

### Formatting (Prettier)

- Double quotes (`"`)
- Semicolons required
- Trailing commas everywhere (`"all"`)
- 100 character print width
- 2-space indentation
- Arrow parens always: `(x) => x`
- Bracket spacing: `{ foo }`

### Linting (ESLint)

Config: `eslint.config.mjs` — flat config extending `next/core-web-vitals` + `prettier`.

- `no-unused-vars`: warn
- `no-console`: warn (except `console.warn` and `console.error`)
- `@next/next/no-img-element`: off

### TypeScript

- Strict mode enabled (`"strict": true`)
- Use `type` keyword for type-only imports: `import type { Foo } from "..."`
- Use `type` keyword for type exports: `export type Foo = { ... }`
- Prefer `type` over `interface` for object shapes (project convention)
- Path alias: `@/*` maps to `./src/*` — always use it instead of relative paths
- Target: ES2017, module: ESNext, JSX: react-jsx

### Imports — Ordering Convention

1. External packages (`next`, `react`, `zod`, `lucide-react`, etc.)
2. Internal aliases (`@/lib/...`, `@/components/...`, `@/middleware/...`)
3. Type-only imports last within each group

```ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import type { JwtPayload } from "@/lib/auth";
```

### Naming Conventions

- **Files**: kebab-case (`api-response.ts`, `sidebar-nav.tsx`, `mobile-sidebar.tsx`)
- **Functions/variables**: camelCase (`generateCode`, `parsePagination`)
- **React components**: PascalCase (`SidebarNav`, `MobileSidebar`)
- **Types**: PascalCase (`JwtPayload`, `AuthUser`, `ApiResponse<T>`)
- **Prisma enums**: snake_case values (`lab_tech`, `follow_up`, `no_show`)
- **Prisma models**: PascalCase with `@@map("snake_case_table")` for DB table names
- **API routes**: versioned under `/api/v1/`, exported as named HTTP methods (`GET`, `POST`)
- **Test files**: `*.test.ts` in `src/__tests__/` mirroring source structure
- **E2E specs**: `*.spec.ts` in `e2e/`

### Error Handling

API routes use standardized response helpers from `@/lib/api-response`:

```ts
successResponse(data, status?)        // 200 default, wraps as { data }
paginatedResponse(data[], total, page, limit)  // adds { data, meta }
errorResponse(message, status?, errors?)       // { statusCode, message, errors? }
notFoundResponse(resource?)           // 404
unauthorizedResponse(message?)        // 401
forbiddenResponse(message?)           // 403
```

API route pattern — always wrap handler body in try/catch:

```ts
export const POST = withAuth(
  async (request: NextRequest, payload: JwtPayload) => {
    try {
      const body = await request.json();
      const parsed = someSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }
      // ... business logic
      return successResponse(result, 201);
    } catch (error) {
      console.error("Descriptive error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
  ["admin", "director"],
);
```

### Validation

All request validation uses Zod schemas defined in `src/lib/validations.ts`.
Use `safeParse` for API routes (returns field-level errors), `parse` only in tests.

### Authentication

- JWT-based auth with access tokens (15min) and refresh tokens (7-day, HttpOnly cookie)
- `withAuth(handler, allowedRoles?)` higher-order function in `src/middleware/auth.ts`
- Edge middleware in `src/middleware.ts` redirects unauthenticated page requests to `/login`
- Passwords hashed with bcrypt (12 rounds) via `src/lib/auth.ts`

### Components

- UI primitives from shadcn/ui (new-york style), located in `src/components/ui/`
- Do NOT manually edit shadcn/ui files — regenerate with `npx shadcn@latest add <component>`
- Use `cn()` from `@/lib/utils` for conditional/merged Tailwind classes
- Client components must have `"use client"` directive at top of file
- Server components are the default — only add `"use client"` when using hooks or browser APIs
- Icons from `lucide-react`

### Database

- Prisma Client singleton in `src/lib/prisma.ts` (avoids hot-reload connection exhaustion)
- Use `@default(uuid())` for all primary keys
- All models use `@@map("snake_case")` for Postgres table names
- Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Pagination: use `parsePagination()` from `@/lib/utils` for consistent page/limit/skip
- Sequential codes: use `generateCode(prefix, sequence)` for human-readable IDs (e.g., `PAT-000001`)
