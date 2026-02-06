# System Architecture - Turtle Trading Signals

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Browser                          │
│                    (Vue 3 Dashboard)                        │
└─────────────────────────────────────────────────────────────┘
                             ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│                   Express.js API Server                     │
│                    (Port 3001)                              │
│  ┌───────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │ /signals  │  │ /trades  │  │ /admin                  │  │
│  │ endpoints │  │endpoints │  │ ├─ /health              │  │
│  │           │  │          │  │ ├─ /scan (trigger)      │  │
│  │           │  │          │  │ └─ /settings            │  │
│  └───────────┘  └──────────┘  └─────────────────────────┘  │
│       ↕                ↕                    ↕               │
└──────┼────────────────┼────────────────────┼────────────────┘
       │                │                    │
       ├────────────────┴────────────────────┤
       │                                     │
       ↕                                     ↕
┌─────────────────────────┐    ┌──────────────────────────┐
│    Signal Engine        │    │   Job Scheduler          │
│                         │    │                          │
│ ├─ Donchian channels    │    │ ├─ Cron: 4 PM ET daily   │
│ ├─ ATR calculation      │    │ ├─ Manual trigger        │
│ ├─ Entry/exit logic     │    │ └─ Scan history logging  │
│ └─ Position sizing      │    │                          │
└──────────┬──────────────┘    └────────────┬─────────────┘
           │                               │
           └───────────────┬───────────────┘
                           ↓
                    ┌──────────────────┐
                    │   SQLite DB      │
                    │  (signals.db)    │
                    │                  │
                    │ ├─ signals       │
                    │ ├─ trades        │
                    │ ├─ scan_history  │
                    │ ├─ positions     │
                    │ └─ price_cache   │
                    └──────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              Data Fetcher                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Primary: Polygon IO (premium data)                 │ │
│  │ Fallback: Yahoo Finance (free)                     │ │
│  └────────────────────────────────────────────────────┘ │
│                           ↓                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Russell 2000 daily OHLC data (100+ tickers)       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 📦 Module Breakdown

### 1. Backend Core (`backend/src/`)

#### 1a. Database Layer (`db/`)
- **database.ts** - SQLite initialization, connection management
- **schema.sql** - Tables: signals, trades, scan_history, positions, price_cache

#### 1b. Signal Engine (`engine/`)
- **indicators.ts** - Donchian channels, ATR calculation
- **signals.ts** - Entry/exit signal generation
- **positionSizing.ts** - Risk management (2% rule, position caps)
- **types.ts** - Internal type definitions

**Key Functions:**
```typescript
// Indicators
calculateDonchian20High(prices) → number
calculateDonchian20Low(prices) → number
calculateDonchian10High(prices) → number
calculateDonchian10Low(prices) → number
calculateATR14(prices) → number

// Signal Generation
generateSignal(ticker, prices) → SignalCalculation
checkExitSignal(prices, positionType) → boolean
checkStopLoss(currentPrice, stopLoss, positionType) → boolean

// Position Sizing
calculatePositionSize(input) → PositionSizingOutput
validatePositionSizing(input) → {valid, error?}
```

#### 1c. Data Fetcher (`data/`)
- **fetcher.ts** - IDataFetcher interface with implementations
  - YahooFinanceFetcher (free, fallback)
  - PolygonIOFetcher (premium, primary)

**Interface:**
```typescript
interface IDataFetcher {
  getHistoricalData(ticker, days) → Promise<OHLC[]>
  getRussell2000Tickers() → Promise<string[]>
}
```

#### 1d. API Routes (`routes/`)
- **signals.ts** - GET, POST signal endpoints
- **trades.ts** - GET, POST, import trade endpoints
- **admin.ts** - Health, scan trigger, settings

#### 1e. Job Scheduler (`jobs/`)
- **scheduler.ts** - Cron job orchestration (4 PM ET)
- **scan.ts** - Daily scan execution and logging

### 2. Frontend (`frontend/src/`)
- **Components/** - Reusable Vue components
- **Views/** - Dashboard, trade history, admin panel
- **main.ts** - Vite entry point
- **App.vue** - Root component

### 3. Testing (`tests/`)
- **engine/** - Unit tests for signal calculations
- **data/** - Data fetcher tests
- **routes/** - Integration tests for API endpoints

## 🔄 Data Flow: Daily Scan

```
1. Scheduler triggers at 4 PM ET (cron)
   ↓
2. performDailyScan() starts
   ├─ Create scan_history record (in_progress)
   ├─ Get Russell 2000 tickers from cache/fetcher
   ├─ Fetch historical data for each ticker (last 21+ days)
   ├─ For each ticker:
   │  ├─ Calculate Donchian channels
   │  ├─ Calculate ATR-14
   │  ├─ Check for buy signal (close > 20-day high)
   │  ├─ Check for sell signal (close < 10-day low)
   │  └─ Store signal in database (if triggered)
   ├─ Store scan results (count, signals, execution time)
   └─ Update scan_history record (completed)
   ↓
3. Frontend auto-refreshes at 5-minute intervals
   ├─ Fetch GET /api/signals (today)
   ├─ Display new signals
   └─ Show last scan status
```

## 🗄️ Database Schema

### signals
```sql
id TEXT PRIMARY KEY
ticker TEXT NOT NULL
signal_type TEXT CHECK('buy' | 'sell')
entry_price REAL
stop_loss_price REAL
entry_date TEXT (YYYY-MM-DD)
scan_id TEXT (FK → scan_history.id)
created_at TEXT (ISO8601)
signal_status TEXT CHECK('pending'|'active'|'triggered'|'expired')
notes TEXT
```

### trades
```sql
id TEXT PRIMARY KEY
ticker TEXT NOT NULL
entry_date TEXT
entry_price REAL
entry_shares INTEGER
exit_date TEXT (nullable for open trades)
exit_price REAL (nullable)
exit_shares INTEGER (nullable)
trade_type TEXT CHECK('manual'|'csv_import'|'signal_followup')
source_signal_id TEXT (FK → signals.id, nullable)
created_at TEXT
updated_at TEXT
```

### scan_history
```sql
id TEXT PRIMARY KEY
scan_timestamp TEXT
scan_trigger TEXT CHECK('scheduled'|'manual')
tickers_scanned INTEGER
signals_generated INTEGER
buy_signals INTEGER
sell_signals INTEGER
scan_status TEXT CHECK('in_progress'|'completed'|'failed')
error_message TEXT (nullable)
execution_time_ms INTEGER
created_at TEXT
```

### portfolio_positions
```sql
id TEXT PRIMARY KEY
ticker TEXT NOT NULL UNIQUE
entry_date TEXT
entry_price REAL
current_shares INTEGER
cost_basis REAL
created_at TEXT
updated_at TEXT
```

### price_cache
```sql
ticker TEXT NOT NULL
date TEXT (YYYY-MM-DD)
open REAL
high REAL
low REAL
close REAL
volume INTEGER
created_at TEXT
PRIMARY KEY (ticker, date)
```

## 🔌 API Contract

### Response Format
```json
{
  "success": true,
  "data": { /* endpoint-specific */ },
  "error": null,
  "timestamp": "2026-02-06T20:47:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": "Human-readable error message",
  "timestamp": "2026-02-06T20:47:00Z"
}
```

## 🔐 Authentication & Authorization

**MVP (Phase 3):** None
- Server runs on localhost/private network
- Basic API validation only

**Future (Phase 5+):** JWT tokens
- Admin endpoints require authentication
- Signal subscriptions per user

## ⚡ Performance Targets

| Operation | Target | Priority |
|-----------|--------|----------|
| GET /api/signals | <100ms | Critical |
| GET /api/trades | <200ms | Critical |
| Full daily scan (2000 tickers) | <5 min | Critical |
| Database query | <50ms | High |
| API response overhead | <20ms | High |

**Optimization strategies:**
- Index on (ticker, date) for fast lookups
- Price cache to avoid refetching
- Batch data fetches (Polygon API limit handling)
- Connection pooling for database

## 🔄 Extensibility Points

### Adding a New Data Source
1. Create class implementing `IDataFetcher`
2. Add to `createDataFetcher()` factory function
3. No changes to rest of system

### Adding New Signal Rules
1. Add calculation method to `engine/signals.ts`
2. Extend `SignalCalculation` type if needed
3. Integrate into `generateSignal()` function

### Adding Broker Integration
1. Create `backend/src/integrations/brokers/` folder
2. Implement broker-specific API client
3. Connect to trade execution in `routes/trades.ts`

## 🚀 Deployment Architecture

```
┌──────────────────────────────┐
│   macOS Mini (192.168.1.51)  │
│  ┌──────────────────────────┐│
│  │  PM2 Process Manager     ││
│  │  ├─ Main app (port 3001) ││
│  │  ├─ Auto-restart on crash││
│  │  └─ Logging              ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │  SQLite Database         ││
│  │  (data/signals.db)       ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │  Nginx (reverse proxy)   ││
│  │  (optional, for HTTPS)   ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

## 📊 Monitoring & Logging

**Logs stored in:**
- Console (development)
- Files (production, via pm2)
- Database (scan_history table)

**Health metrics:**
- Last scan time
- Next scan time
- Scan success/failure rate
- Database connection status

---

**For implementation details, see:**
- `backend/src/engine/` - Signal calculation
- `backend/src/data/` - Data fetching
- `backend/src/db/schema.sql` - Database schema
- `backend/src/routes/` - API contracts
