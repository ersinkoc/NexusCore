# NexusCore Deployment Guide

This guide covers deploying NexusCore to production environments.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
- [Security Checklist](#security-checklist)
- [Monitoring](#monitoring)

---

## Prerequisites

### Required Services

- **Node.js** 18 LTS or higher
- **PostgreSQL** 15+ database
- **Redis** 7+ (for caching and queues)
- **pnpm** 8+ (or npm/yarn)

### Optional

- **Docker** & **Docker Compose** (for containerized deployment)
- **Nginx** or other reverse proxy
- **PM2** for process management
- **CI/CD** pipeline (GitHub Actions, GitLab CI, etc.)

---

## Environment Variables

### Production API (.env)

```env
# Application
NODE_ENV=production
PORT=4000
API_URL=https://api.yourdomain.com

# Database (use managed PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Redis (use managed Redis)
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password

# JWT - MUST BE CHANGED!
JWT_ACCESS_SECRET=<generate-strong-random-secret-64-chars>
JWT_REFRESH_SECRET=<generate-different-strong-random-secret-64-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/nexuscore
```

**Generate Secrets:**
```bash
# On Unix/macOS
openssl rand -hex 64

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Production Web (.env)

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_NAME=YourAppName
```

---

## Database Setup

### Managed PostgreSQL (Recommended)

Use a managed database service:
- **AWS RDS** (PostgreSQL)
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**
- **Heroku Postgres**
- **Supabase**
- **Neon**

### Migrations

```bash
# Production migration
pnpm db:migrate:deploy

# Or manually
cd packages/db
npx prisma migrate deploy
```

### Backups

Set up automated backups:
- Daily snapshots
- Point-in-time recovery
- Offsite backup storage
- Test restore procedures regularly

---

## Deployment Options

### Option 1: Docker Deployment

#### Build Images

```bash
# Build API image
docker build -f Dockerfile.api -t nexuscore-api:latest .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml build
```

#### Run with Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: nexuscore-api:latest
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: redis
      # ... other env vars
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  web:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./apps/web/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl

volumes:
  redis_data:
```

### Option 2: VPS Deployment (Ubuntu/Debian)

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2
```

#### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/yourusername/your-nexuscore-app.git
cd your-nexuscore-app

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

#### 3. Start with PM2

```bash
# Start API
pm2 start apps/api/dist/index.js --name nexuscore-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 4. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/nexuscore

# API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/nexuscore/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/nexuscore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

### Option 3: Platform as a Service

#### Vercel (Frontend)

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "apps/web/dist",
  "framework": "vite"
}
```

#### Railway / Render (Backend)

```yaml
# render.yaml
services:
  - type: web
    name: nexuscore-api
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm --filter @nexuscore/api start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: nexuscore-db
          property: connectionString
```

### Option 4: Kubernetes

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexuscore-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexuscore-api
  template:
    metadata:
      labels:
        app: nexuscore-api
    spec:
      containers:
      - name: api
        image: your-registry/nexuscore-api:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: nexuscore-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Security Checklist

### Before Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Update all dependencies
- [ ] Remove debug code/logs
- [ ] Configure firewall rules
- [ ] Set up database SSL
- [ ] Enable Redis password
- [ ] Review exposed ports

### Environment

- [ ] Set `NODE_ENV=production`
- [ ] Use environment variables, never hardcode secrets
- [ ] Implement proper logging
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure log rotation
- [ ] Limit file upload sizes
- [ ] Validate all inputs
- [ ] Sanitize outputs

### Database

- [ ] Use connection pooling
- [ ] Enable SSL connections
- [ ] Regular backups automated
- [ ] Point-in-time recovery configured
- [ ] Least privilege database user
- [ ] Monitor query performance
- [ ] Set up replication (if needed)

### Monitoring

- [ ] Application health checks
- [ ] Database connection monitoring
- [ ] Redis connection monitoring
- [ ] CPU/Memory alerts
- [ ] Disk space alerts
- [ ] Error rate tracking
- [ ] Response time monitoring

---

## Monitoring

### Health Checks

API provides `/health` endpoint:

```bash
curl https://api.yourdomain.com/health
```

### Logging

Use structured logging with Winston:
- Centralize logs (ELK Stack, CloudWatch, etc.)
- Set up log aggregation
- Create alerts for errors
- Monitor correlation IDs

### Metrics

Recommended tools:
- **Application**: New Relic, Datadog, AppDynamics
- **Infrastructure**: Prometheus + Grafana
- **Errors**: Sentry, Rollbar
- **Uptime**: Pingdom, UptimeRobot

### Key Metrics to Track

- Request rate and response times
- Error rate (4xx, 5xx)
- Database query performance
- Redis hit/miss rate
- Memory usage
- CPU usage
- Active connections
- JWT token refresh rate

---

## Performance Optimization

### Backend

- Enable compression middleware
- Implement Redis caching
- Optimize database queries
- Use database indexes
- Enable connection pooling
- Implement pagination
- Use CDN for static assets

### Frontend

- Enable code splitting
- Lazy load routes
- Optimize images
- Use CDN
- Enable gzip compression
- Implement caching headers
- Minimize bundle size

---

## Scaling

### Horizontal Scaling

NexusCore is stateless and ready for horizontal scaling:

1. **Load Balancer**: Add nginx/HAProxy in front
2. **Multiple API Instances**: Run multiple containers/servers
3. **Shared Redis**: Use managed Redis for all instances
4. **Managed Database**: Use connection pooling

### Vertical Scaling

- Increase server resources
- Optimize database
- Upgrade Redis instance
- Profile and optimize bottlenecks

---

## Rollback Procedure

1. **Database**: Keep migrations backward compatible
2. **Code**: Tag releases and keep previous versions
3. **Quick Rollback**:
   ```bash
   # Using PM2
   pm2 stop nexuscore-api
   git checkout previous-tag
   pnpm install
   pnpm build
   pm2 restart nexuscore-api
   ```

---

## Support

For deployment issues:
- Check logs first
- Review environment variables
- Verify database connectivity
- Test Redis connection
- Check firewall rules
- Review nginx/proxy configuration

For help:
- GitHub Issues: https://github.com/ersinkoc/NexusCore/issues
- Documentation: https://github.com/ersinkoc/NexusCore

---

**Remember**: Always test in staging before deploying to production!
