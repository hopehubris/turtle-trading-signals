# Quick Start: Run Everything

Complete guide to get the Turtle Trading Signals system up and running in under 5 minutes.

## Prerequisites
- Node.js v18+ (`node --version`)
- npm v9+ (`npm --version`)

## Step 1: Install Dependencies (2 min)

```bash
# Root directory - Install backend dependencies
npm install

# Frontend directory - Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Build Everything (2 min)

```bash
# Compile TypeScript backend
npm run build

# Build Vue frontend
cd frontend && npm run build && cd ..
```

## Step 3: Setup Database (30 sec)

```bash
# Create database and schema
npm run db:migrate

# Add test data (optional but recommended)
npm run db:seed
```

## Step 4: Run the Application

### Terminal 1: Backend Server
```bash
PORT=3001 npm start
```

Expected output:
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

### Terminal 2: Frontend Dev Server (Optional - for development)
```bash
cd frontend
npm run dev
```

Open browser to: http://localhost:5173

OR: Serve production build:
```bash
npx http-server frontend/dist -p 8080
```

Open browser to: http://localhost:8080

## Step 5: Test the API

### Terminal 3: Test API endpoints
```bash
# Check server health
curl http://localhost:3001/api/health | json_pp

# Get today's signals
curl http://localhost:3001/api/signals | json_pp

# Get trade history
curl http://localhost:3001/api/trades | json_pp

# Get system health/status
curl http://localhost:3001/api/admin/health | json_pp

# Trigger a manual scan
curl -X POST http://localhost:3001/api/admin/scan | json_pp
```

## Accessing the Application

### API Endpoints (Backend only)
- **Health:** http://localhost:3001/api/health
- **Signals:** http://localhost:3001/api/signals
- **Trades:** http://localhost:3001/api/trades
- **Admin:** http://localhost:3001/api/admin/health
- **Analytics:** http://localhost:3001/api/analytics/performance
- **Portfolio:** http://localhost:3001/api/portfolio/overlay

### Web Dashboard
- **Frontend (Dev):** http://localhost:5173
- **Frontend (Production):** http://localhost:8080

### Available Pages
1. **Dashboard** (`/`) - Signal summary and today's trades
2. **Trades** (`/trades`) - Trade history and manual entry
3. **Analytics** (`/analytics`) - Performance metrics
4. **Admin** (`/admin`) - System status and scan control

## Running Tests

```bash
# Run all unit tests (49 tests)
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

Expected results:
```
Test Suites: 3 passed, 3 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        3.6s
```

## Database Reset

If you need a clean slate:

```bash
# Delete database and recreate
npm run db:reset

# Then optionally seed again
npm run db:seed
```

## Environment Configuration

Create `.env` file in project root:

```bash
# Server Configuration
PORT=3001
DB_PATH=data/signals.db

# Data Provider (optional)
POLYGON_API_KEY=your_api_key_here

# Scan Settings
SCAN_TIME=16:00
MIN_VOLUME_FILTER=100000
LIQUIDITY_FILTER=true
```

## Troubleshooting

### Port Already in Use
```bash
# Kill existing process on port 3001
lsof -i :3001 | grep node | awk '{print $2}' | xargs kill -9

# Start on different port
PORT=3002 npm start
```

### Database Locked
```bash
# Remove database and reinitialize
rm data/signals.db
npm run db:migrate
npm run db:seed
```

### Build Errors
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Dependencies Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## File Structure

```
turtle-trading-signals/
├── backend/src/
│   ├── db/              # Database (migrate.ts, seed.ts)
│   ├── engine/          # Turtle logic (indicators, signals)
│   ├── data/            # Data fetchers (Yahoo, Polygon)
│   ├── jobs/            # Scheduler (scan.ts)
│   ├── routes/          # API endpoints
│   ├── types/           # TypeScript interfaces
│   └── index.ts         # Main server
├── frontend/src/
│   ├── views/           # Dashboard, Trades, Admin, Analytics
│   ├── App.vue          # Main component
│   └── main.ts          # Vue entry point
├── tests/               # Unit tests
├── data/                # SQLite database (created on first run)
└── dist/                # Compiled output
```

## What Happens on First Run

1. **Database created** (`data/signals.db`)
2. **Schema applied** (5 tables created)
3. **Test data seeded** (sample signals, trades, positions)
4. **Server starts** (listening on port 3001)
5. **Scheduler initialized** (4 PM ET daily scan scheduled)
6. **Frontend ready** (available on http://localhost:5173 or 8080)

## Next Steps

1. **Explore the Dashboard** - See today's signals
2. **Add Manual Trades** - Test the trade entry form
3. **Check Admin Panel** - View system status
4. **Run a Scan** - Click "Force Scan Now" to trigger analysis
5. **Review Analytics** - Check performance metrics

## API Examples

### Fetch Today's Signals
```bash
curl -s http://localhost:3001/api/signals | jq '.data[] | {ticker, signal_type, entry_price, stop_loss_price}'
```

### Manually Trigger Scan
```bash
curl -X POST http://localhost:3001/api/admin/scan

# Check scan status
curl http://localhost:3001/api/admin/health | jq '.data.lastScan'
```

### Add Manual Trade
```bash
curl -X POST http://localhost:3001/api/trades \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "entry_date": "2026-02-06",
    "entry_price": 150.25,
    "entry_shares": 100
  }'
```

### Import CSV Trades
```bash
# Prepare trades.csv with columns:
# ticker,entryDate,entryPrice,entryShares,exitDate,exitPrice,exitShares
# MSFT,2026-02-01,315.50,50
# GOOGL,2026-02-02,140.25,25

curl -X POST http://localhost:3001/api/trades/import \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {"ticker":"MSFT","entryDate":"2026-02-01","entryPrice":315.50,"entryShares":50},
      {"ticker":"GOOGL","entryDate":"2026-02-02","entryPrice":140.25,"entryShares":25}
    ]
  }'
```

## Monitoring the System

### Check Logs
- Backend logs: Terminal running `npm start`
- Frontend errors: Browser console (F12)
- Database issues: Check `data/signals.db` exists

### Monitor Scan Progress
```bash
# Watch scan history
sqlite3 data/signals.db "SELECT id, scan_status, tickers_scanned, signals_generated FROM scan_history ORDER BY created_at DESC LIMIT 5;"

# Watch signals table
sqlite3 data/signals.db "SELECT ticker, signal_type, entry_price, created_at FROM signals WHERE entry_date = date('now');"
```

## Performance Tips

1. **Index Queries** - Database has optimal indexes
2. **Caching** - Price data cached to avoid refetches
3. **Batch Operations** - CSV import processes in batches
4. **Connection Pooling** - Database connections reused

## Support

For issues or questions:
1. Check `PHASE3_COMPLETE.md` for detailed documentation
2. Review test files in `tests/engine/` for usage examples
3. Check API contract in `ARCHITECTURE.md`

---

**Ready to go!** Follow the steps above and you'll have the system running in minutes. 🚀
