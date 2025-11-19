# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-11-19

### Added

#### Developer Experience
- Husky pre-commit hooks for automated code quality checks
- lint-staged configuration for automatic linting and formatting before commits
- Prettier configuration (`.prettierrc.json`) with comprehensive formatting rules
- Enhanced `.prettierignore` with detailed ignore patterns
- Pre-commit hook that runs ESLint and Prettier on staged files

#### Health Check Module
- Comprehensive health monitoring endpoints:
  - `GET /health` - Full system health check with database, Redis, and memory metrics
  - `GET /health/live` - Kubernetes liveness probe
  - `GET /health/ready` - Kubernetes readiness probe
- Response time metrics for all service checks
- Proper HTTP status codes (200 for healthy/degraded, 503 for unhealthy)
- Memory usage monitoring with configurable thresholds

#### API Documentation
- Swagger/OpenAPI 3.0 integration
- Interactive Swagger UI at `/docs`
- Complete API schema definitions for:
  - User, Authentication, Health Check, Error responses
  - Security schemes (Bearer auth, Cookie auth)
- JSDoc annotations on all endpoints
- JSON spec export at `/docs/json`
- swagger-jsdoc and swagger-ui-express dependencies

#### Posts Module (Example CRUD)
- Full CRUD operations with proper authorization
- Post model with fields:
  - Title, slug, content, excerpt
  - Status management (DRAFT, PUBLISHED, ARCHIVED)
  - SEO fields (metaTitle, metaDescription)
  - View count tracking
  - Author relation
- Endpoints:
  - `GET /posts` - List posts with pagination and filters
  - `POST /posts` - Create post (auth required)
  - `GET /posts/:id` - Get post by ID
  - `PUT /posts/:id` - Update post (owner/admin only)
  - `DELETE /posts/:id` - Delete post (owner/admin only)
  - `POST /posts/:id/publish` - Publish post (owner/admin only)
- Event-driven architecture with 4 events:
  - `post.created`, `post.updated`, `post.published`, `post.deleted`
- Automatic slug generation from titles
- Pagination and search functionality
- Audit logging for all operations
- Full OpenAPI documentation

#### Database Enhancements
- Post model added to Prisma schema
- PostStatus enum (DRAFT, PUBLISHED, ARCHIVED)
- Database migration for posts table
- Enhanced seed script:
  - Uses bcrypt for secure password hashing (12 rounds)
  - Creates 6 test users (admin, moderator, 3 users, 1 inactive)
  - Generates 5 sample blog posts with realistic content
  - Creates comprehensive audit logs
  - Summary output with counts

#### Type Definitions
- Post schemas in `@nexuscore/types`:
  - `createPostSchema`, `updatePostSchema`, `queryPostsSchema`
  - Type exports: `CreatePostInput`, `UpdatePostInput`, `QueryPostsInput`
  - `PostStatus` enum export

### Changed
- Updated root package.json with new scripts:
  - `format:check` for CI/CD validation
  - `test` and `test:coverage` at root level
  - `db:seed` for database seeding
  - `docker:prod` for production Docker Compose
  - `prepare` hook for Husky installation
- Enhanced database package with bcrypt dependency
- Updated API package with Swagger dependencies

### Improved
- Better developer experience with automatic code formatting
- More comprehensive test data with realistic blog posts
- Enhanced database seeding with proper password hashing
- Complete API documentation for all endpoints

## [1.0.0] - 2025-11-19

### Phase 1: Foundation
#### Added
- Monorepo structure with Turborepo configuration
- Root package.json with workspace setup
- Docker Compose with PostgreSQL 15, Redis 7, and pgAdmin
- Prisma schema with User, RefreshToken, Session, and AuditLog models
- Shared packages:
  - `@nexuscore/types` - Shared TypeScript types and Zod schemas
  - `@nexuscore/db` - Prisma database client
  - `@nexuscore/ui` - Shared React components
  - `@nexuscore/config` - Shared configuration (ESLint, TypeScript, Tailwind)
- Environment configuration templates
- Git ignore patterns for monorepo

### Phase 2: Backend Core
#### Added
- Dynamic Module Loader in `apps/api/src/core/module-loader.ts`
  - Auto-discovery of modules from `src/modules/` directory
  - Automatic route and event registration
  - Support for module initialization hooks
- EventBus wrapper with typed events
  - Async handler support
  - Error handling for event listeners
  - Type-safe event payloads
- Custom error classes:
  - `AppError` - Base error class
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)
  - `NotFoundError` (404)
  - `ConflictError` (409)
- Winston logger with structured logging
  - File rotation support
  - Correlation ID tracking
  - Environment-specific configuration
- Middleware stack:
  - Error handling middleware
  - Request logging middleware
  - Not found middleware
  - CORS configuration
  - Helmet security headers
  - Rate limiting

### Phase 3: Authentication & Authorization
#### Added
- Password service with bcrypt (12 rounds)
  - Password hashing
  - Password verification
  - Rehash detection
- JWT service for token management
  - Access token generation (15m expiry)
  - Refresh token generation (7d expiry)
  - Token verification
  - Token decoding
- Auth module with complete authentication flow:
  - User registration with validation
  - Login with credentials
  - Logout with token cleanup
  - Token refresh mechanism
  - Get current user endpoint
- Users module with RBAC demonstration:
  - List users with pagination
  - Get user by ID
  - Update user
  - Deactivate user
  - Delete user (Admin only)
- Auth middleware:
  - `requireAuth` - Protect routes requiring authentication
  - `requireRole` - Role-based access control
  - `optionalAuth` - Optional authentication
- Event handlers:
  - `auth.registered` - User registration events
  - `auth.login` - Login tracking events

### Phase 4: Frontend Integration
#### Added
- API client with axios
  - Automatic token refresh interceptor
  - Request queue management during refresh
  - Access token injection
  - Error handling
- Zustand store for auth state management
  - User state
  - Access token storage
  - Authentication helpers
- React pages:
  - Login page with React Hook Form + Zod validation
  - Register page with form validation
  - Dashboard layout with sidebar navigation
  - Users management page with pagination and search
- Protected routes component
  - Role-based route protection
  - Automatic redirect to login
- React Router v6 setup with route configuration
- TailwindCSS styling throughout
- Responsive design for mobile and desktop

### Phase 5: CLI Tool & Documentation
#### Added
- Interactive CLI tool (`@nexuscore/cli`)
  - Project creation with prompts
  - Template cloning from GitHub
  - Environment file generation with random secrets
  - Dependency installation
  - Git initialization
  - Docker setup option
- Template generation utilities:
  - API .env template
  - Web .env template
  - README template
  - Random secret generation
- Comprehensive documentation:
  - `README.md` - Main documentation with quick start
  - `API.md` - Complete API reference with examples
  - `CONTRIBUTING.md` - Developer contribution guide
  - `FEATURES.md` - Feature checklist and architecture
  - `DEPLOYMENT.md` - Production deployment guide
  - `PROJECT_SUMMARY.md` - Project overview and statistics
- MIT License

### Testing & CI/CD
#### Added
- Jest configuration with TypeScript support
  - 70% coverage threshold
  - Module path mapping
  - Setup files for test environment
- Unit tests:
  - Password service tests (8 test cases)
  - JWT service tests (11 test cases)
  - EventBus tests (12 test cases)
- GitHub Actions CI/CD pipeline:
  - Lint job
  - Type check job
  - Build job
  - Docker build job
  - Security audit job
- GitHub templates:
  - Bug report template
  - Feature request template
  - Pull request template with checklist

### Security
#### Added
- bcrypt password hashing with 12 rounds
- JWT access tokens (short-lived, 15m)
- JWT refresh tokens (long-lived, 7d) in HttpOnly cookies
- CORS configuration
- Helmet security headers
- Rate limiting on API endpoints
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS protection via React and proper sanitization

### Developer Experience
#### Added
- Hot reload for backend with tsx watch
- Hot reload for frontend with Vite HMR
- TypeScript strict mode throughout
- ESLint configuration
- Prettier configuration
- Shared TypeScript configs
- Module auto-discovery (no manual registration)
- End-to-end type safety with Zod
- Correlation IDs for request tracing
- Structured logging with Winston

### Infrastructure
#### Added
- Docker Compose for local development
  - PostgreSQL 15
  - Redis 7
  - pgAdmin 4
- Prisma migrations
- Environment variable validation
- Production-ready error handling
- Request/response logging
- Health check endpoints

---

## Version History

### [1.0.0] - 2025-11-19
- Initial release with all 5 phases complete
- Production-ready full-stack boilerplate
- Complete documentation and testing infrastructure

---

## Legend

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements

---

## Links

- [Documentation](./README.md)
- [API Reference](./API.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Project Summary](./PROJECT_SUMMARY.md)
