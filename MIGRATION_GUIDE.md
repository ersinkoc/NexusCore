# Migration Guide

This guide helps you upgrade NexusCore to the latest version.

---

## Upgrading to v1.1.0

Version 1.1.0 introduces several new features and modules. Follow these steps to upgrade:

### 1. Update Dependencies

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
pnpm install
```

### 2. Run Database Migration

The new version includes the Posts module with a new database schema.

```bash
# Apply the migration
pnpm --filter @nexuscore/db migrate:deploy

# Or push schema directly (development only)
pnpm db:push
```

### 3. Update Environment Variables (Optional)

No new required environment variables in this version. However, you can optionally configure:

```bash
# apps/api/.env
# (All existing variables still work)
```

### 4. Regenerate Prisma Client

```bash
pnpm db:generate
```

### 5. Re-seed Database (Optional)

The seed script now creates more comprehensive test data including sample posts:

```bash
pnpm db:seed
```

This will create:
- 6 users (admin, moderator, 3 users, 1 inactive)
- 5 sample blog posts
- Audit logs for all operations

### 6. Set Up Pre-commit Hooks (Optional but Recommended)

The new version includes Husky for pre-commit hooks:

```bash
# This is automatically run by `pnpm install`
# But you can manually run it with:
pnpm prepare
```

### 7. Test New Features

Start your development server and test the new modules:

```bash
pnpm dev
```

#### New Endpoints to Test:

**Health Checks:**
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/live
curl http://localhost:4000/api/health/ready
```

**API Documentation:**
- Visit http://localhost:4000/docs in your browser
- Interactive Swagger UI with all API endpoints

**Posts Module:**
```bash
# List posts (public)
curl http://localhost:4000/api/posts

# Create post (requires auth)
curl -X POST http://localhost:4000/api/posts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Post",
    "content": "Post content here",
    "status": "DRAFT"
  }'
```

---

## Breaking Changes

### v1.0.0 → v1.1.0

**No breaking changes.** This is a minor version bump with new features only.

All existing code will continue to work without modifications.

---

## New Features in v1.1.0

### 1. Health Check Module

Monitor your application health with comprehensive checks:

- `/api/health` - Full system health (database, Redis, memory)
- `/api/health/live` - Kubernetes liveness probe
- `/api/health/ready` - Kubernetes readiness probe

### 2. API Documentation

Interactive API documentation powered by Swagger:

- Navigate to `/docs` for Swagger UI
- Export OpenAPI spec from `/docs/json`
- Try out API endpoints directly from the browser

### 3. Posts Module

Example CRUD module demonstrating best practices:

- Full CRUD operations with authorization
- Event-driven architecture
- Pagination and search
- SEO support with meta fields
- Automatic slug generation
- View counting
- Status management (DRAFT, PUBLISHED, ARCHIVED)

### 4. Developer Experience Improvements

- **Husky + lint-staged**: Automatic code formatting on commit
- **Prettier**: Consistent code formatting across the project
- **Enhanced seed data**: More realistic test data
- **Better documentation**: Updated README and comprehensive CHANGELOG

### 5. Production Deployment

- Production-ready Docker Compose configuration
- Multi-stage Dockerfiles for API and Web apps
- Nginx configuration for web app
- Environment variable templates for production

---

## Rollback Instructions

If you need to rollback to v1.0.0:

### 1. Revert Code

```bash
git checkout v1.0.0
pnpm install
```

### 2. Rollback Database (if you applied migrations)

```bash
# Option 1: Reset database (development only)
pnpm db:push --force-reset

# Option 2: Rollback specific migration
cd packages/db
pnpm prisma migrate resolve --rolled-back 20251119115730_add_posts
```

### 3. Restart Services

```bash
pnpm dev
```

---

## Getting Help

If you encounter issues during migration:

1. Check the [CHANGELOG](./CHANGELOG.md) for detailed changes
2. Review the [README](./README.md) for updated documentation
3. Open an issue on [GitHub](https://github.com/ersinkoc/NexusCore/issues)
4. Check existing issues for similar problems

---

## Best Practices

### Before Upgrading

1. **Backup your database**: Always backup before running migrations
   ```bash
   # Example with PostgreSQL
   pg_dump -U nexuscore nexuscore_db > backup.sql
   ```

2. **Review the CHANGELOG**: Understand what's changing

3. **Test in development first**: Never upgrade production directly

### After Upgrading

1. **Run tests**: Ensure everything still works
   ```bash
   pnpm test
   ```

2. **Check logs**: Monitor for any errors or warnings

3. **Update documentation**: If you have custom docs, update them

4. **Train your team**: Share new features with your team

---

## Version Compatibility

| NexusCore | Node.js | pnpm | PostgreSQL | Redis |
|-----------|---------|------|------------|-------|
| 1.1.0     | ≥18.0   | ≥8.0 | ≥15.0      | ≥7.0  |
| 1.0.0     | ≥18.0   | ≥8.0 | ≥15.0      | ≥7.0  |

---

## Future Migrations

We follow [Semantic Versioning](https://semver.org/):

- **Major version (2.0.0)**: Breaking changes, requires migration
- **Minor version (1.x.0)**: New features, backward compatible
- **Patch version (1.1.x)**: Bug fixes, backward compatible

Always check the CHANGELOG and this migration guide before upgrading.
