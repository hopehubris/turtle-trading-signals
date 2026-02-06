# Setup Instructions - Turtle Trading Signals

## Prerequisites
- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- macOS/Linux/Windows

## Installation Steps

### 1. Install Dependencies
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
npm install
```

This will:
- Install 23 dependencies from package.json
- Create `node_modules/` folder
- Generate `package-lock.json`

**Expected time:** 3-5 minutes

### 2. Compile TypeScript
```bash
npm run build
```

This will:
- Compile all `.ts` files to `dist/` folder
- Generate source maps for debugging
- Validate all types

**Expected output:** No errors if TypeScript is valid

### 3. Verify Database Setup
```bash
npm run db:migrate
```

This will:
- Create `data/` directory
- Initialize `data/signals.db` SQLite database
- Create all tables from `schema.sql`

**Expected output:**
```
Database initialized at data/signals.db
```

### 4. Test API Server
```bash
npm run dev
```

This will start the Express server in development mode:
```
╔════════════════════════════════════════════════════════════╗
║       Turtle Trading Signals Server Started               ║
║                                                            ║
║  Server: http://localhost:3001                            ║
║  Database: data/signals.db                                ║
║  API: /api/signals, /api/trades, /api/admin               ║
║                                                            ║
║  Scheduler: Running (4 PM ET daily scan)                  ║
╚════════════════════════════════════════════════════════════╝
```

### 5. Test Health Endpoint
```bash
curl http://localhost:3001/api/health
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-02-06T20:55:00.000Z"
  }
}
```

### 6. Stop Server
Press `Ctrl+C` to stop the development server.

---

## Configuration

### Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```
PORT=3001                          # Server port
NODE_ENV=development               # dev/production
DB_PATH=data/signals.db           # Database file path
POLYGON_API_KEY=                  # Optional: Polygon IO API key
SCAN_TIME=16:00                   # 4 PM ET
SCAN_TIMEZONE=America/New_York    # Eastern Time
```

**Note:** If `POLYGON_API_KEY` is not set, the system will fall back to Yahoo Finance (free).

---

## Development Workflow

### Build TypeScript
```bash
npm run build
```

### Run in Development Mode (with auto-reload)
```bash
npm run dev
```

### Run Tests (once written)
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Lint Code
```bash
npm run lint
```

### Reset Database (WARNING: Deletes all data)
```bash
npm run db:reset
```

---

## Production Deployment

### Build
```bash
npm run build
npm run db:migrate
```

### Start with PM2
```bash
npm install -g pm2
pm2 start dist/backend/src/index.js --name "turtle-trading"
pm2 startup
pm2 save
```

### Verify Running
```bash
pm2 list
pm2 logs turtle-trading
```

---

## Troubleshooting

### Port 3001 Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Database Lock Error
```bash
# Database is locked (another process using it)
# Solution: Make sure only one server instance is running
pm2 kill
npm run dev
```

### Network Access Issues
If connecting from another machine on the network:

1. **Find your machine's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Connect from another machine:**
   ```bash
   curl http://<YOUR_IP>:3001/api/health
   ```

3. **Fix firewall (macOS):**
   ```bash
   # System Preferences > Security & Privacy > Firewall
   # Add Node.js to allowed apps
   ```

### TypeScript Compilation Errors
```bash
# Check for TypeScript errors
npx tsc --noEmit

# View detailed errors
npm run build 2>&1 | head -50
```

---

## Architecture Summary

Once installed and running, the system has:

- **Backend API** (port 3001)
  - `/api/signals` - Turtle Trading signals
  - `/api/trades` - Trade history
  - `/api/admin` - Admin controls

- **Database** (SQLite)
  - `signals` - Generated signals
  - `trades` - Manual entries
  - `scan_history` - Daily scan logs
  - `portfolio_positions` - Current positions
  - `price_cache` - Historical prices

- **Job Scheduler**
  - Daily scan at 4 PM ET (configurable)
  - Manual trigger via API

- **Signal Engine**
  - Donchian channels (20-day high/low)
  - ATR-14 for stop loss
  - Position sizing (2% risk rule)

---

## Next Steps

1. **Test the API:**
   - GET /api/signals
   - GET /api/admin/health
   - POST /api/admin/scan (manual trigger)

2. **Build Frontend:**
   - Frontend files in `frontend/src/`
   - Use `npm run frontend:dev` for Vite dev server

3. **Implement Phase 3:**
   - Data fetcher implementation
   - Full scan execution
   - Unit tests

---

## Support

- **Architecture:** See `ARCHITECTURE.md`
- **Database Schema:** See `backend/src/db/schema.sql`
- **Turtle Rules:** See `TURTLE_RULES.md` (from backtester)
- **Phase Status:** See `PHASE2_COMPLETE.md`

---

**Ready to build!** ✅
