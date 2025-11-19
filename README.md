# NexusCore - The Ultimate Node.js & React Boilerplate

**Production-ready, modular, event-driven full-stack boilerplate for scalable SaaS applications.**

---

## Philosophy

- **Configuration over boilerplate code**: Reduce repetitive code with smart defaults
- **Modular Architecture**: Plugin-based system with auto-discovery
- **Developer Experience First**: Intuitive patterns, TypeScript strict mode, comprehensive tooling

---

## Tech Stack

### Backend
- **Runtime**: Node.js (LTS)
- **Framework**: Express.js with custom App wrapper
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache/Queue**: Redis (ioredis + BullMQ)
- **Validation**: Zod schemas
- **Logging**: Winston with structured logging

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: TailwindCSS + Shadcn/UI
- **State Management**: Zustand (global) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod resolvers

### Infrastructure
- **Monorepo**: Turborepo with pnpm workspaces
- **Containerization**: Docker & Docker Compose
- **CLI**: Interactive project scaffolding

---

## Project Structure

```
/
├── apps/
│   ├── api/                    # Express backend
│   │   ├── src/
│   │   │   ├── core/          # EventBus, Logger, Middleware, Module Loader
│   │   │   ├── modules/       # Feature modules (auth, users, etc.)
│   │   │   ├── shared/        # Shared utilities
│   │   │   └── app.ts         # Application entry
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── features/      # Feature-based UI
│       │   ├── components/    # Reusable components
│       │   └── lib/           # API client & utilities
├── packages/
│   ├── db/                    # Prisma schema & client
│   ├── types/                 # Shared TypeScript types & Zod schemas
│   ├── ui/                    # Shared UI component library
│   └── config/                # ESLint & TypeScript configs
├── tools/
│   └── cli/                   # Interactive project generator
└── docker-compose.yml
```

---

## Key Features

### 1. Dynamic Module System
All features are isolated modules in `apps/api/src/modules/`. Each module exports:

```typescript
export const UserModule: IModule = {
  name: 'users',
  routes: UserRoutes,        // Express Router
  events: UserEventHandlers, // Event listeners
  init: async () => { ... }  // Startup logic
};
```

Modules are **auto-discovered** on startup - no manual registration needed!

### 2. Event-Driven Architecture
Decouple modules using a typed EventBus:

```typescript
// Auth module emits event
eventBus.emit('auth.registered', { userId, email });

// Notification module listens
eventBus.on('auth.registered', async ({ email }) => {
  await sendWelcomeEmail(email);
});
```

### 3. Type-Safe Everything
- Shared Zod schemas in `packages/types`
- Auto-generated TypeScript types
- End-to-end type safety from DB to UI

### 4. Production-Ready Error Handling
Standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (optional but recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/ersinkoc/NexusCore.git
   cd NexusCore
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # API
   cp apps/api/.env.example apps/api/.env

   # Web
   cp apps/web/.env.example apps/web/.env

   # Database
   cp packages/db/.env.example packages/db/.env
   ```

4. **Start infrastructure (Docker)**
   ```bash
   pnpm docker:up
   ```
   This starts PostgreSQL, Redis, and pgAdmin.

5. **Generate Prisma client**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

6. **Seed the database (optional)**
   ```bash
   pnpm --filter @nexuscore/db seed
   ```
   Creates test users:
   - Admin: `admin@nexuscore.local` / `Admin123!`
   - User: `user@nexuscore.local` / `User123!`

7. **Start development servers**
   ```bash
   pnpm dev
   ```
   - API: http://localhost:4000
   - Web: http://localhost:5173
   - pgAdmin: http://localhost:5050

---

## Available Scripts

### Root
- `pnpm dev` - Start all apps in dev mode
- `pnpm build` - Build all packages
- `pnpm docker:up` - Start Docker services
- `pnpm docker:down` - Stop Docker services

### Database
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:migrate` - Create migration
- `pnpm db:studio` - Open Prisma Studio

### Individual Apps
- `pnpm api` - Run API only
- `pnpm web` - Run web only

---

## Architecture Deep Dive

### Module Loader
The `ModuleLoader` scans `apps/api/src/modules/` on startup and:
1. Imports each module
2. Calls `init()` for setup logic
3. Registers routes at `/api/{moduleName}`
4. Subscribes to events

### Event Bus
A typed wrapper around Node's `EventEmitter`:
- Supports async handlers
- Automatic error handling
- Debug logging
- Type-safe payloads

### Error Handling
Custom error classes:
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)

All errors return consistent JSON format with correlation IDs for tracing.

---

## Roadmap

### Phase 1: Foundation ✅
- [x] Turborepo setup
- [x] Docker Compose
- [x] Prisma schema
- [x] Core packages

### Phase 2: Backend Core (Next)
- [ ] Module Loader implementation
- [ ] EventBus system
- [ ] Advanced error handling
- [ ] Request logging with correlation IDs

### Phase 3: Authentication
- [ ] JWT authentication
- [ ] RBAC middleware
- [ ] Refresh token rotation
- [ ] Password reset flow

### Phase 4: Frontend Integration
- [ ] Auth UI components
- [ ] Admin dashboard layout
- [ ] User management CRUD

### Phase 5: CLI Tool
- [ ] Interactive scaffolding
- [ ] Template generation
- [ ] Package as `npx create-nexuscore`

---

## Environment Variables

### API (`apps/api/.env`)
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://..."
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
CORS_ORIGIN=http://localhost:5173
```

### Web (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:4000/api
```

---

## Docker Services

Access these services when running `pnpm docker:up`:

- **PostgreSQL**: `localhost:5432`
  - User: `nexuscore`
  - Password: `nexuscore_dev_password`
  - Database: `nexuscore_db`

- **Redis**: `localhost:6379`
  - Password: `nexuscore_redis_password`

- **pgAdmin**: http://localhost:5050
  - Email: `admin@nexuscore.local`
  - Password: `admin`

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/ersinkoc/NexusCore/issues
- Documentation: Coming soon

---

Built with by the NexusCore team.
