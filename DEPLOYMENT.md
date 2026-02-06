# Deployment Guide - Turtle Trading Signals

**Phase 3 Implementation Complete**  
Ready for testing and deployment

---

## Pre-Deployment Checklist

- ✅ Backend compiled (npm run build)
- ✅ Database migrated (npm run db:migrate)
- ✅ All endpoints tested
- ✅ Frontend built and working
- ✅ Environment variables configured

---

## Deployment Steps

### 1. Prepare Production Environment

```bash
# Clone repository
git clone <repository-url>
cd turtle-trading-signals-AdmiralMondy

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Create production .env
cat > .env << EOF
DB_PATH=data/signals.db
PORT=3001
NODE_ENV=production
POLYGON_API_KEY=  # Optional: Add if you have Polygon API
EOF
```

### 2. Build for Production

```bash
# Build backend
npm run build

# Build frontend
cd frontend && npm run build && cd ..
```

### 3. Initialize Database

```bash
# Run migrations
npm run db:migrate

# Optional: Seed with test data
npm run db:seed
```

### 4. Start Services

#### Option A: Separate Terminals

```bash
# Terminal 1: Backend (port 3001)
npm run start

# Terminal 2: Frontend dev server (port 3000)
cd frontend && npm run dev
```

#### Option B: Production Setup with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'turtle-trading-api',
      script: './dist/backend/src/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_PATH: 'data/signals.db'
      }
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Auto-restart on reboot
pm2 startup
pm2 save
```

#### Option C: Docker Deployment

```dockerfile
# Dockerfile.backend
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY backend/src/db/schema.sql ./backend/src/db/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "dist/backend/src/index.js"]
```

```dockerfile
# Dockerfile.frontend
FROM node:20-alpine as builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run with Docker
docker build -f Dockerfile.backend -t turtle-trading-api .
docker build -f Dockerfile.frontend -t turtle-trading-ui .

docker run -p 3001:3001 -v /data:/app/data turtle-trading-api
docker run -p 3000:80 turtle-trading-ui
```

---

## Post-Deployment Verification

### 1. Check Backend Health

```bash
# Health endpoint
curl http://localhost:3001/api/health

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "ok",
#     "timestamp": "2026-02-06T..."
#   }
# }
```

### 2. Verify Database

```bash
# Check signals table
sqlite3 data/signals.db "SELECT COUNT(*) as signal_count FROM signals;"

# Check scan history
sqlite3 data/signals.db "SELECT * FROM scan_history LIMIT 1;"
```

### 3. Test API Endpoints

```bash
# Get today's signals
curl http://localhost:3001/api/signals

# Get trades
curl http://localhost:3001/api/trades

# Check admin health
curl http://localhost:3001/api/admin/health

# Get analytics
curl http://localhost:3001/api/analytics/performance
```

### 4. Verify Frontend

```bash
# Open in browser
open http://localhost:3000

# Or for production build
cd frontend && npm run preview
```

---

## Performance Tuning

### Database Optimization

```sql
-- Run periodically to optimize database
VACUUM;
ANALYZE;

-- Check index usage
PRAGMA index_info(idx_signals_ticker);

-- Monitor database size
SELECT page_count * page_size as size_bytes FROM pragma_page_count(), pragma_page_size();
```

### API Rate Limiting

Add to Express app for production:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Data Fetcher Optimization

- Increase scan parallelization
- Cache price data more aggressively
- Implement request batching for multiple tickers

---

## Monitoring & Maintenance

### Monitor Key Metrics

```bash
# Database size growth
du -sh data/signals.db

# Check recent scans
sqlite3 data/signals.db "SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 5;"

# Count signals per month
sqlite3 data/signals.db "SELECT DATE(created_at) as date, COUNT(*) as count FROM signals GROUP BY date ORDER BY date DESC;"
```

### Regular Maintenance Tasks

- **Daily:** Monitor scan completion, check error logs
- **Weekly:** Backup database, analyze performance metrics
- **Monthly:** Vacuum database, archive old scan results, review signal accuracy

### Backup Strategy

```bash
# Backup database daily
cp data/signals.db data/signals.db.backup.$(date +%Y%m%d)

# Or automated backup
0 2 * * * cp /path/to/data/signals.db /backup/signals.db.$(date +\%Y\%m\%d)
```

---

## Troubleshooting

### Server fails to start

```bash
# Check port availability
lsof -i :3001

# Check logs for errors
tail -f /tmp/server.log

# Verify database permissions
ls -la data/signals.db
```

### Scan not running

```bash
# Check scheduler logs in console
# Should see "Scheduler initialized" message

# Manually trigger scan for testing
curl -X POST http://localhost:3001/api/admin/scan

# Check scan history
sqlite3 data/signals.db "SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 1;"
```

### Data fetcher failing

```bash
# Test Yahoo Finance directly
curl "https://query1.finance.yahoo.com/v7/finance/download/AAPL?period1=1609459200&period2=1609545600&interval=1d&events=history"

# If Polygon IO fallback, check API key in .env
echo $POLYGON_API_KEY
```

### Database corruption

```bash
# Check integrity
sqlite3 data/signals.db "PRAGMA integrity_check;"

# If corrupted, rebuild from backup
cp data/signals.db.backup.YYYYMMDD data/signals.db

# Or reset completely
rm data/signals.db
npm run db:migrate
npm run db:seed
```

---

## Scaling Considerations

### For 100+ Concurrent Users

1. **Database** → Migrate to PostgreSQL
2. **API** → Add load balancer (nginx)
3. **Frontend** → Use CDN for static assets
4. **Caching** → Add Redis for frequently accessed data

### Recommended Architecture (Scale)

```
Load Balancer (Nginx)
    ↓
  [API 1] [API 2] [API 3]  (Multiple Node.js instances)
    ↓
PostgreSQL (Primary)
    ↓
Redis Cache
    ↓
CDN (Frontend assets)
```

### Migration Path

1. Phase 1: SQLite + Single server (Current)
2. Phase 2: PostgreSQL + PM2 clustering
3. Phase 3: Docker + Kubernetes orchestration
4. Phase 4: Microservices with dedicated databases

---

## Security Checklist

- [ ] Environment variables not committed to git
- [ ] Database backups encrypted
- [ ] API rate limiting enabled
- [ ] CORS properly configured for frontend domain
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive data
- [ ] Database permissions restricted
- [ ] Logs rotated to prevent disk fill
- [ ] SSL/TLS enabled in production
- [ ] Regular dependency updates (npm audit)

---

## Support & Documentation

- **API Docs:** See inline comments in `backend/src/routes/*.ts`
- **Database Schema:** `backend/src/db/schema.sql`
- **Signal Engine:** `backend/src/engine/README.md` (to be created)
- **Frontend:** `frontend/README.md` (to be created)
- **Troubleshooting:** See issues section above

---

## Rollback Plan

If issues occur:

```bash
# Stop services
pm2 stop all
npm stop

# Restore from backup
cp data/signals.db.backup.YYYYMMDD data/signals.db

# Restore database schema
npm run db:migrate

# Restart services
npm run start
```

---

**Deployment Complete!** 🚀

For issues or questions, review the implementation documentation in IMPLEMENTATION_COMPLETE.md
