/**
 * Template generation utilities for NexusCore CLI
 */

export function generatePackageJson(projectName: string) {
  return {
    name: projectName,
    version: '0.1.0',
    private: true,
    description: 'A NexusCore application',
    engines: {
      node: '>=18.0.0',
      pnpm: '>=8.0.0',
    },
    packageManager: 'pnpm@8.15.0',
    scripts: {
      dev: 'turbo run dev',
      build: 'turbo run build',
      lint: 'turbo run lint',
      format: 'prettier --write "**/*.{ts,tsx,md,json}"',
      clean: 'turbo run clean && rm -rf node_modules',
      'db:generate': 'pnpm --filter @nexuscore/db generate',
      'db:push': 'pnpm --filter @nexuscore/db push',
      'db:migrate': 'pnpm --filter @nexuscore/db migrate',
      'db:studio': 'pnpm --filter @nexuscore/db studio',
      'docker:up': 'docker-compose up -d',
      'docker:down': 'docker-compose down',
      api: 'pnpm --filter @nexuscore/api dev',
      web: 'pnpm --filter @nexuscore/web dev',
    },
    devDependencies: {
      '@turbo/gen': '^1.12.0',
      prettier: '^3.2.5',
      turbo: '^1.12.0',
      typescript: '^5.3.3',
    },
  };
}

export function generateApiEnv() {
  return `# Application
NODE_ENV=development
PORT=4000
API_URL=http://localhost:4000

# Database
DATABASE_URL="postgresql://nexuscore:nexuscore_dev_password@localhost:5432/nexuscore_db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nexuscore_redis_password

# JWT (CHANGE THESE IN PRODUCTION!)
JWT_ACCESS_SECRET=${generateRandomSecret()}
JWT_REFRESH_SECRET=${generateRandomSecret()}
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs
`;
}

export function generateWebEnv() {
  return `# API Configuration
VITE_API_URL=http://localhost:4000/api
VITE_APP_NAME=NexusCore
`;
}

export function generateDbEnv() {
  return `# Database connection string
DATABASE_URL="postgresql://nexuscore:nexuscore_dev_password@localhost:5432/nexuscore_db"
`;
}

export function generateReadme(projectName: string) {
  return `# ${projectName}

Built with [NexusCore](https://github.com/ersinkoc/NexusCore) - The Ultimate Node.js & React Boilerplate

## Quick Start

1. **Install dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Start infrastructure (Docker)**
   \`\`\`bash
   pnpm docker:up
   \`\`\`

3. **Setup database**
   \`\`\`bash
   pnpm db:generate
   pnpm db:push
   pnpm --filter @nexuscore/db seed
   \`\`\`

4. **Start development servers**
   \`\`\`bash
   pnpm dev
   \`\`\`

## Access Points

- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000
- **pgAdmin**: http://localhost:5050

## Default Credentials

- **Admin**: admin@nexuscore.local / Admin123!
- **User**: user@nexuscore.local / User123!

## Documentation

- [NexusCore Documentation](https://github.com/ersinkoc/NexusCore)
- [API Reference](./API.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Tech Stack

- **Backend**: Node.js + Express + TypeScript + Prisma
- **Frontend**: React 18 + Vite + TailwindCSS
- **Database**: PostgreSQL + Redis
- **Monorepo**: Turborepo + pnpm

## Scripts

- \`pnpm dev\` - Start all apps in development
- \`pnpm build\` - Build all packages
- \`pnpm docker:up\` - Start Docker services
- \`pnpm db:studio\` - Open Prisma Studio

## Learn More

Visit [NexusCore GitHub](https://github.com/ersinkoc/NexusCore) for complete documentation.
`;
}

export function generateGitignore() {
  return `# Dependencies
node_modules
.pnp
.pnp.js

# Production builds
dist
build
.next
out

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/*
!.vscode/settings.json
.idea
*.swp

# Turbo
.turbo

# Database
*.db
*.sqlite

# Misc
.cache
tmp
`;
}

function generateRandomSecret(): string {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
