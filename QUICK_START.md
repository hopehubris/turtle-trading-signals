# Quick Start - Turtle Trading Signals App

## 60-Second Setup

```bash
# 1. Navigate to project
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Initialize database
npm run db:migrate

# 5. Start server
npm run dev
```

## Verify It's Working

In another terminal:
```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{"success":true,"data":{"status":"ok","timestamp":"2026-02-06T..."}
```

## Key Commands

```bash
npm run dev              # Start dev server with auto-reload
npm run build           # Compile TypeScript
npm run test            # Run Jest tests (once written)
npm run db:migrate      # Initialize database
npm run db:reset        # Delete and recreate database
npm run lint            # Check code style
npm run frontend:dev    # Start Vue dev server (when ready)
```

## Project Structure Quick Reference

```
backend/src/
├── engine/              ← Signal calculation logic
│   ├── indicators.ts   (Donchian, ATR)
│   ├── signals.ts      (Entry/exit logic)
│   └── positionSizing.ts (2% risk rule)
├── data/
│   └── fetcher.ts      (Yahoo Finance, Polygon IO)
├── db/
│   ├── database.ts     (SQLite setup)
│   └── schema.sql      (Tables definition)
├── jobs/
│   ├── scheduler.ts    (4 PM ET cron)
│   └── scan.ts         (Scan execution)
├── routes/
│   ├── signals.ts      (GET /api/signals)
│   ├── trades.ts       (GET /api/trades)
│   └── admin.ts        (GET /api/admin/*)
└── index.ts            (Express app)
```

## API Endpoints (Already Scaffolded)

### Signals
- `GET /api/signals` - Today's signals
- `GET /api/signals/:id` - Specific signal
- `POST /api/signals` - Create signal (used by scan)

### Trades
- `GET /api/trades` - All trades
- `POST /api/trades` - Manual entry
- `POST /api/trades/import` - CSV import

### Admin
- `GET /api/admin/health` - System status
- `POST /api/admin/scan` - Trigger scan manually
- `GET /api/admin/settings` - System config

### Health
- `GET /api/health` - Basic check

## Database Tables (Created at Startup)

```sql
signals       -- Turtle Trading signals
trades        -- Manual trade entries
scan_history  -- Daily scan logs
portfolio_positions -- Current open positions
price_cache   -- Daily OHLC prices
```

## Environment Variables

See `.env.example`:
```
PORT=3001
DB_PATH=data/signals.db
POLYGON_API_KEY=       (optional, for premium data)
SCAN_TIME=16:00        (4 PM ET)
SCAN_TIMEZONE=America/New_York
```

## Next Phase (Phase 3) Tasks

- [ ] Implement data fetcher (Yahoo Finance + Polygon IO)
- [ ] Implement daily scan execution
- [ ] Write unit tests for signal engine
- [ ] Implement full API route handlers
- [ ] Test job scheduler timing
- [ ] Build Vue 3 frontend dashboard
- [ ] Implement trade history view
- [ ] Implement admin panel

## Important Notes

**Signal Engine Rules:**
- BUY: Close > 20-day highest high
- SELL: Close < 20-day lowest low
- EXIT LONG: Close < 10-day lowest low
- EXIT SHORT: Close > 10-day highest high
- STOP LOSS: Entry ± (2 × ATR-14)
- POSITION SIZE: Risk Amount / Stop Distance (2% risk rule, 20% cap)

**Data Required:**
- 21+ days of OHLC data per ticker
- Daily data only (no intraday)
- Russell 2000 tickers (~2000 symbols)

**Scan Timing:**
- Scheduled: Daily at 4 PM ET (configurable)
- Manual: Via POST /api/admin/scan
- Execution: < 5 minutes for 2000 tickers (target)

## Troubleshooting

**Port 3001 in use:**
```bash
lsof -i :3001
kill -9 <PID>
```

**Database locked:**
```bash
# Kill any running instances
pkill -f "node dist"
npm run dev
```

**TypeScript errors:**
```bash
npm run build 2>&1 | grep -A 2 "error TS"
```

**Need to reset database:**
```bash
npm run db:reset
npm run dev
```

## Documentation

- `README.md` - Full project overview
- `ARCHITECTURE.md` - System design & data flows
- `SETUP_INSTRUCTIONS.md` - Detailed setup
- `PHASE2_COMPLETE.md` - Phase 2 summary
- `backend/src/db/schema.sql` - Database schema
- `TURTLE_RULES.md` - Turtle Trading rules (from backtester)

## Getting Help

1. Check the README
2. Review ARCHITECTURE.md for system design
3. Look at backend/src/ for code structure
4. Check git log for what's been done

---

**Ready to code Phase 3!** 🚀
