# Kelly OS - Bank Reconciliation Module
# Production Deployment Guide

## 🎯 Deployment Overview

This guide covers deploying Kelly OS to production on various platforms.

---

## 1️⃣ Vercel Deployment (Recommended)

### Prerequisites
- Vercel account (https://vercel.com)
- Production PostgreSQL database

### Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Configure Environment Variables**

In Vercel dashboard, add:
```
DATABASE_URL=postgresql://user:pass@host:5432/kelly_os
JWT_SECRET=<64-character-random-string>
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

3. **Deploy**
```bash
vercel --prod
```

4. **Run Database Migration**
```bash
# From Vercel CLI
vercel env pull
npm run prisma:migrate deploy
npm run prisma:seed
```

---

## 2️⃣ Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: kelly_os
      POSTGRES_USER: kelly_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://kelly_user:${DB_PASSWORD}@db:5432/kelly_os
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - db

volumes:
  postgres_data:
```

### Deploy
```bash
docker-compose up -d
```

---

## 3️⃣ AWS Deployment

### Architecture
- **Compute**: AWS ECS (Elastic Container Service)
- **Database**: AWS RDS PostgreSQL
- **Storage**: AWS S3 (for uploads)
- **CDN**: CloudFront

### Steps

1. **Create RDS PostgreSQL Instance**
```bash
aws rds create-db-instance \
  --db-instance-identifier kelly-os-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 20
```

2. **Build and Push Docker Image**
```bash
# Build
docker build -t kelly-os .

# Tag
docker tag kelly-os:latest <account>.dkr.ecr.<region>.amazonaws.com/kelly-os:latest

# Push to ECR
docker push <account>.dkr.ecr.<region>.amazonaws.com/kelly-os:latest
```

3. **Create ECS Service**
- Use AWS Console or CloudFormation
- Configure auto-scaling
- Set up load balancer

---

## 4️⃣ Digital Ocean Deployment

### Using App Platform

1. **Connect Repository**
   - Link GitHub/GitLab repository

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm run start`

3. **Add Database**
   - Create PostgreSQL cluster
   - Link to app

4. **Set Environment Variables**
   ```
   DATABASE_URL=${db.DATABASE_URL}
   JWT_SECRET=<secret>
   ```

5. **Deploy**
   - Automatic deployment on push

---

## 5️⃣ Traditional VPS (Ubuntu)

### Setup on Ubuntu 22.04

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo> /var/www/kelly-os
cd /var/www/kelly-os

# Install dependencies
npm install

# Build
npm run build

# Setup database
sudo -u postgres psql
CREATE DATABASE kelly_os;
CREATE USER kelly_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE kelly_os TO kelly_user;
\q

# Run migrations
npm run prisma:migrate deploy

# Start with PM2
pm2 start npm --name "kelly-os" -- start
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit `.env` to version control
- Use secure vault for production secrets
- Rotate JWT_SECRET regularly

### 2. Database
- Use strong passwords
- Enable SSL/TLS connections
- Regular backups
- Restrict network access

### 3. Application
- Enable HTTPS only
- Configure CORS properly
- Implement rate limiting
- Enable security headers

### 4. Monitoring
- Set up error tracking (Sentry)
- Configure application monitoring
- Database performance monitoring
- Set up alerts for critical errors

---

## 📊 Performance Optimization

### Database
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_bank_txn_status ON bank_transactions(status);
CREATE INDEX idx_bank_txn_date ON bank_transactions(transaction_date);
CREATE INDEX idx_customer_code ON customers(customer_code);
CREATE INDEX idx_invoice_customer ON invoices(customer_id);
```

### Caching
- Use Redis for session storage
- Cache dashboard queries
- Implement query result caching

### CDN
- Serve static assets via CDN
- Enable Next.js image optimization
- Implement asset compression

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📦 Backup Strategy

### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="kelly_os"

# Database backup
pg_dump -U kelly_user $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Keep last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-bucket/backups/
```

### Cron Job
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 🚨 Monitoring & Alerts

### Health Check Endpoint

Add to `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'healthy' });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

### Uptime Monitoring
- Use UptimeRobot or similar
- Monitor `/api/health` endpoint
- Alert on failures

---

## 📝 Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Initial admin user created
- [ ] SSL certificate installed
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Error tracking enabled
- [ ] Performance baselines recorded
- [ ] Security scan completed
- [ ] Load testing performed
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Rollback plan documented

---

## 🆘 Emergency Procedures

### Database Restore
```bash
# Stop application
pm2 stop kelly-os

# Restore database
psql -U kelly_user kelly_os < backup_20240211.sql

# Restart application
pm2 start kelly-os
```

### Rollback Deployment
```bash
# Vercel
vercel rollback

# PM2
pm2 stop kelly-os
git checkout <previous-commit>
npm install
npm run build
pm2 start kelly-os
```

---

**Your Kelly OS Bank Reconciliation system is now production-ready!** 🚀

Always test deployments in a staging environment first.
