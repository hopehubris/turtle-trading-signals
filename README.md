# Turtle Trading Signals - Complete Web App

A full-stack web application that scans the Russell 2000 daily for Turtle Trading entry/exit signals, provides actionable alerts, tracks manual trade history, and measures signal performance.

## 🎯 Project Overview

**Core Functionality:**
- 🔍 Daily Russell 2000 scans for Turtle Trading signals (4 PM ET)
- 📊 Entry/exit signals based on Donchian channels + trailing stops
- 📈 Portfolio tracking (manual trades + CSV import)
- 💹 Performance analytics (accuracy, win-rate, P&L)
- 🖥️ Web UI with dashboard, trade history, and admin panel
- 🌐 Network accessible (192.168.1.51:3001)

## 📋 Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Express.js + TypeScript |
| Frontend | Vue 3 + Vite |
| Database | SQLite |
| Scheduler | node-cron |
| Data Source | Yahoo Finance + Polygon IO |

## 🏗️ Project Structure

```
turtle-trading-signals-AdmiralMondy/
├── backend/
│   └── src/
│       ├── db/
│       │   ├── database.ts       # Database initialization
│       │   └── schema.sql        # SQLite schema
│       ├── engine/
│       │   ├── indicators.ts     # Donchian, ATR calculations
│       │   ├── signals.ts        # Entry/exit logic
│       │   └── positionSizing.ts # Risk management
│       ├── data/
│       │   └── fetcher.ts        # Yahoo Finance, Polygon IO
│       ├── jobs/
│       │   ├── scheduler.ts      # Cron job orchestration
│       │   └── scan.ts           # Daily scan execution
│       ├── routes/
│       │   ├── signals.ts        # Signal endpoints
│       │   ├── trades.ts         # Trade endpoints
│       │   └── admin.ts          # Admin endpoints
│       ├── types/
│       │   └── index.ts          # TypeScript interfaces
│       └── index.ts              # Main app entry
├── frontend/
│   ├── src/
│   │   ├── components/           # Vue components (TBD)
│   │   ├── views/                # Pages (TBD)
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
├── tests/
│   ├── engine/                   # Signal engine tests (TBD)
│   ├── data/                     # Data fetcher tests (TBD)
│   └── routes/                   # API integration tests (TBD)
├── data/                         # SQLite database (created at runtime)
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your configuration (optional: add Polygon IO API key)
```

3. **Initialize database:**
```bash
npm run db:migrate
```

### Running the App

**Development mode (backend only):**
```bash
npm run dev
```

This starts:
- Express server on `http://localhost:3001`
- SQLite database at `data/signals.db`
- Job scheduler (4 PM ET daily scan)

**Production mode:**
```bash
npm run build
npm start
```

## 📡 API Endpoints

### Signals
- `GET /api/signals` - Get today's signals (filterable by date, status, ticker)
- `GET /api/signals/:id` - Get specific signal
- `POST /api/signals` - Create signal (used by scan engine)

### Trades
- `GET /api/trades` - Get all trades (with filters)
- `POST /api/trades` - Create manual trade entry
- `POST /api/trades/import` - Import trades from CSV

### Admin
- `GET /api/admin/health` - System health + scan status
- `POST /api/admin/scan` - Trigger manual scan
- `GET /api/admin/settings` - Get system settings

### Health
- `GET /api/health` - Basic health check

## 🔧 Database Schema

### Tables
- **signals** - Generated Turtle Trading signals
- **trades** - Manual entries + performance tracking
- **scan_history** - Daily scan logs
- **portfolio_positions** - Current open positions
- **price_cache** - Daily price data for Russell 2000

See `backend/src/db/schema.sql` for full schema.

## 🎯 Turtle Trading Rules

**Entry Signal (BUY):**
- Close > 20-day highest high

**Entry Signal (SELL):**
- Close < 20-day lowest low

**Exit Signal (LONG):**
- Close < 10-day lowest low

**Exit Signal (SHORT):**
- Close > 10-day highest high

**Stop Loss:**
- Distance = 2 × ATR(14)
- BUY stop = Entry - Distance
- SELL stop = Entry + Distance

**Position Sizing:**
- Risk per trade = 2% of account balance
- Units = Risk Amount / Stop Distance
- Max position capped at 20% of account

See `backend/src/engine/` for implementation.

## 📊 Performance Metrics

The app calculates and tracks:
- **Win Rate** - % of profitable trades
- **Accuracy** - % of signals that moved in correct direction
- **P&L** - Profit/loss for each trade
- **Profit Factor** - Gross profit / gross loss
- **Average Trade** - Mean profit per trade
- **Best/Worst Trade** - Largest win and loss

## 🛠️ Development Commands

```bash
# Build TypeScript
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Reset database (WARNING: deletes all data)
npm run db:reset

# Frontend development
npm run frontend:dev

# Build frontend
npm run frontend:build
```

## 🚨 System Status

**Current Phase:** PHASE 2 - ARCHITECTURE ✅
- ✅ Repository created
- ✅ Project structure scaffolded
- ✅ Database schema designed
- ✅ Signal engine architecture defined
- ✅ Data fetcher architecture designed
- ✅ API endpoint specs defined
- ✅ Job scheduler framework set up
- ⏳ TypeScript compilation & testing (Next)

**Next Phase:** PHASE 3 - BUILD
- Database setup & migrations
- Data fetcher implementation
- Signal engine unit tests
- API implementation
- Frontend dashboard
- Job scheduler testing

## 🔐 Security Notes

- No authentication in MVP (localhost only)
- Environment variables for sensitive data (.env)
- Input validation on all API endpoints
- SQL queries use parameterized statements (no injection risk)
- CORS enabled for local development

## 📞 Support

For questions or issues, check:
- `TURTLE_TRADING_PLAN.md` - Project specification
- `TURTLE_RULES.md` - Turtle Trading rules
- API documentation in `backend/src/routes/`

## 📅 Timeline

- Phase 2 (Architecture): 2-3 hours ← **Currently here**
- Phase 3 (Build): 10-12 hours
- Phase 4 (Testing): 2-3 hours
- Phase 5 (Deployment): 1-2 hours

**Estimated completion:** ~16 hours total

---

Built with 🐢 for quantitative traders
