# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NexusCore is a production-ready, modular, event-driven full-stack boilerplate built as a monorepo using Turborepo and pnpm workspaces. The architecture centers around a dynamic module system with auto-discovery and typed event-driven communication between modules.

## Key Commands

### Development
```bash
pnpm dev              # Start all apps in development mode (API: 4000, Web: 5173)
pnpm api              # Run API only
pnpm web              # Run web only
pnpm build            # Build all packages and applications
pnpm test             # Run tests across all packages
pnpm test:coverage    # Run tests with coverage reporting
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting
```

### Database Management
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema changes to database
pnpm db:migrate       # Create and apply database migrations
pnpm db:seed          # Seed database with test data
pnpm db:studio        # Open Prisma Studio database browser
```

### Docker Infrastructure
```bash
pnpm docker:up        # Start PostgreSQL, Redis, and pgAdmin containers
pnpm docker:down      # Stop Docker services
pnpm docker:logs      # View Docker logs
pnpm docker:prod      # Start production Docker stack
```

## Architecture Overview

### Monorepo Structure
- **apps/api**: Express.js backend with modular architecture
- **apps/web**: React frontend with Vite
- **packages/db**: Prisma schema and database client
- **packages/types**: Shared TypeScript types and Zod schemas
- **packages/ui**: Shared React component library
- **packages/config**: ESLint and TypeScript configurations
- **tools/cli**: Interactive project scaffolding tool

### Dynamic Module System

All backend features are implemented as modules in `apps/api/src/modules/`. Each module must implement the `IModule` interface:

```typescript
export interface IModule {
  name: string;                           // Module identifier
  routes: Router;                        // Express routes
  events?: Record<string, Function>;     // Event handlers
  init?: () => Promise<void>;            // Optional startup initialization
  cleanup?: () => Promise<void>;         // Optional cleanup logic
}
```

Modules are **auto-discovered** at startup by the `ModuleLoader` class in [`apps/api/src/core/module-loader.ts`](apps/api/src/core/module-loader.ts:15). No manual registration required.

### Event-Driven Architecture

Modules communicate through a typed `EventBus` located in [`apps/api/src/core/event-bus.ts`](apps/api/src/core/event-bus.ts):

```typescript
// Emit events
eventBus.emit('auth.registered', { userId, email });

// Listen to events
eventBus.on('auth.registered', async ({ userId, email }) => {
  // Handle event
});
```

### Current Core Modules

1. **Auth Module** (`/api/auth`): JWT authentication with access/refresh tokens
2. **Users Module** (`/api/users`): User management with RBAC (ADMIN/MODERATOR/USER roles)
3. **Posts Module** (`/api/posts`): Full CRUD operations with owner/admin permissions
4. **Health Module** (`/api/health`): System health checks and Kubernetes probes
5. **Docs Module** (`/docs`): Interactive Swagger UI documentation

### Authentication & Authorization

- **JWT Strategy**: 15-minute access tokens + 7-day refresh tokens with rotation
- **Role-Based Access**: `requireAuth` and `requireRole([UserRole.ADMIN])` middleware
- **Test Credentials**:
  - Admin: `admin@nexuscore.local` / `Admin123!`
  - Moderator: `moderator@nexuscore.local` / `Moderator123!`
  - User: `user@nexuscore.local` / `User123!`

### Technology Stack

**Backend**: Node.js 18+, Express.js, TypeScript (strict), PostgreSQL 15+, Prisma ORM, Redis, Winston logging, Zod validation, JWT auth, Swagger docs

**Frontend**: React 18+, Vite, TypeScript, TailwindCSS, Shadcn/UI, Zustand, TanStack Query, React Hook Form

**Infrastructure**: Turborepo, pnpm workspaces, Docker multi-stage builds, Husky pre-commit hooks

### Testing Standards

- **Framework**: Jest with 90% coverage thresholds
- **Location**: Test files in `__tests__/*.test.ts` directories
- **Coverage Requirements**: 90% lines/functions, 85% branches, 90% statements
- **Setup**: Test configuration in `apps/api/jest.config.js` with custom setup in `apps/api/src/__tests__/setup.ts`

### Development Workflow

1. Start infrastructure: `pnpm docker:up`
2. Setup database: `pnpm db:generate && pnpm db:push && pnpm db:seed`
3. Start development: `pnpm dev`

### Environment Configuration

- **API**: `.env` file with `DATABASE_URL`, JWT secrets, Redis config
- **Web**: `.env` file with `VITE_API_URL`
- **Database**: `packages/db/.env` with database connection string

### Docker Services

- **PostgreSQL**: localhost:5432 (nexuscore/nexuscore_dev_password)
- **Redis**: localhost:6397 (nexuscore_redis_password)
- **pgAdmin**: localhost:5050 (admin/admin)

## Code Quality Standards

- **TypeScript**: Strict mode enabled across all packages
- **ESLint**: Custom rules with @typescript-eslint/recommended
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for lint-staged
- **Security**: Helmet, CORS, rate limiting, bcrypt password hashing