# Contributing to NexusCore

Thank you for your interest in contributing to NexusCore! This document provides guidelines and instructions for contributing.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Creating a Module](#creating-a-module)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/NexusCore.git
   cd NexusCore
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   cp packages/db/.env.example packages/db/.env
   ```

4. **Start infrastructure**
   ```bash
   pnpm docker:up
   pnpm db:generate
   pnpm db:push
   ```

5. **Run in development mode**
   ```bash
   pnpm dev
   ```

---

## Development Workflow

### Branching Strategy

- `main`: Production-ready code
- `feature/your-feature-name`: New features
- `fix/bug-description`: Bug fixes
- `docs/update-description`: Documentation updates

### Creating a Branch

```bash
git checkout -b feature/add-notifications-module
```

### Making Changes

1. Make your changes
2. Test thoroughly
3. Commit with meaningful messages
4. Push to your fork
5. Create a Pull Request

---

## Creating a Module

NexusCore uses a modular architecture. Here's how to create a new module:

### 1. Module Structure

```
apps/api/src/modules/your-module/
├── index.ts              # Module definition (IModule export)
├── your-module.service.ts     # Business logic
├── your-module.controller.ts  # HTTP handlers
├── your-module.routes.ts      # Express routes
├── your-module.events.ts      # Event handlers (optional)
└── your-module.schema.ts      # Zod schemas (optional)
```

### 2. Module Template

**index.ts**:
```typescript
import { IModule } from '@nexuscore/types';
import { logger } from '../../core/logger';
import YourModuleRoutes from './your-module.routes';
import { YourModuleEventHandlers } from './your-module.events';

export const YourModuleModule: IModule = {
  name: 'your-module',
  routes: YourModuleRoutes,
  events: YourModuleEventHandlers,
  init: async () => {
    logger.info('YourModule initialized');
    // Initialization logic here
  },
  cleanup: async () => {
    logger.info('YourModule cleanup');
    // Cleanup logic here
  },
};
```

**your-module.service.ts**:
```typescript
import { prisma } from '@nexuscore/db';
import { NotFoundError } from '../../core/errors';

export class YourModuleService {
  async getSomething(id: string) {
    const item = await prisma.yourModel.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundError('Item not found');
    }
    return item;
  }
}
```

**your-module.controller.ts**:
```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils';
import { YourModuleService } from './your-module.service';

const service = new YourModuleService();

export class YourModuleController {
  getSomething = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await service.getSomething(id);

    res.status(200).json({
      success: true,
      data: item,
    });
  });
}
```

**your-module.routes.ts**:
```typescript
import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { YourModuleController } from './your-module.controller';

const router = Router();
const controller = new YourModuleController();

router.get('/:id', requireAuth, controller.getSomething);

export default router;
```

### 3. Auto-Discovery

The module will be automatically discovered and loaded by the ModuleLoader. No manual registration needed!

Routes will be available at: `/api/your-module/*`

---

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use Zod for runtime validation
- Export types from `@nexuscore/types` when shared

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` with `I` prefix for core interfaces

### Code Style

- Use Prettier for formatting (runs automatically)
- Use ESLint rules (defined in `packages/config`)
- Max line length: 100 characters
- Use 2 spaces for indentation

### Error Handling

Always use custom error classes:

```typescript
import { NotFoundError, ValidationError } from '../../core/errors';

// ❌ Don't
throw new Error('User not found');

// ✅ Do
throw new NotFoundError('User not found');
```

### Async/Await

Always wrap async route handlers with `asyncHandler`:

```typescript
// ❌ Don't
router.get('/users', async (req, res) => {
  const users = await service.getUsers();
  res.json(users);
});

// ✅ Do
router.get('/users', asyncHandler(async (req, res) => {
  const users = await service.getUsers();
  res.json(users);
}));
```

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Writing Tests

Create tests alongside your modules:

```typescript
// your-module.service.test.ts
import { YourModuleService } from './your-module.service';

describe('YourModuleService', () => {
  it('should get item by id', async () => {
    const service = new YourModuleService();
    const item = await service.getSomething('uuid');
    expect(item).toBeDefined();
  });
});
```

---

## Pull Request Process

### Before Submitting

1. **Lint your code**
   ```bash
   pnpm lint
   ```

2. **Format your code**
   ```bash
   pnpm format
   ```

3. **Run tests**
   ```bash
   pnpm test
   ```

4. **Build successfully**
   ```bash
   pnpm build
   ```

### PR Guidelines

- **Title**: Use conventional commits format
  - `feat: Add notifications module`
  - `fix: Resolve token refresh bug`
  - `docs: Update API documentation`
  - `refactor: Improve error handling`

- **Description**:
  - Describe what changes were made
  - Explain why the changes were necessary
  - Reference any related issues
  - Include screenshots for UI changes

- **Size**: Keep PRs focused and reasonably sized
  - Small PRs are easier to review
  - Split large changes into multiple PRs

### Review Process

1. Automated checks must pass (lint, tests, build)
2. At least one maintainer approval required
3. All comments must be resolved
4. Branch must be up to date with main

---

## Event-Driven Development

When creating features that other modules might care about, emit events:

```typescript
import { eventBus } from '../../core/event-bus';

// In your service
async createOrder(data: CreateOrderInput) {
  const order = await prisma.order.create({ data });

  // Emit event for other modules
  eventBus.emit('order.created', {
    orderId: order.id,
    userId: order.userId,
    total: order.total,
  });

  return order;
}
```

Other modules can listen:

```typescript
// In another module's events file
export const InventoryEventHandlers = {
  'order.created': async (payload) => {
    // Update inventory when order is created
    await updateInventory(payload.orderId);
  },
};
```

---

## Database Changes

### Adding a Model

1. Update `packages/db/prisma/schema.prisma`
2. Create migration: `pnpm db:migrate`
3. Update seed file if needed: `packages/db/prisma/seed.ts`

### Best Practices

- Always include `createdAt` and `updatedAt`
- Use UUIDs for IDs
- Add indexes for frequently queried fields
- Use `@@map()` for snake_case table names

---

## Documentation

Update documentation when:
- Adding new endpoints (update `API.md`)
- Changing existing behavior (update `README.md`)
- Adding new modules (add examples)
- Modifying configuration (update `.env.example`)

---

## Questions or Need Help?

- **GitHub Issues**: https://github.com/ersinkoc/NexusCore/issues
- **Discussions**: https://github.com/ersinkoc/NexusCore/discussions

---

Thank you for contributing to NexusCore! 🚀
