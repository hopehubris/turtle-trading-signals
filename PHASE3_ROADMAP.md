# PHASE 3: BUILD - Detailed Roadmap

## Status: PHASE 2 COMPLETE → Ready for Phase 3

**Estimated Duration:** 10-12 hours  
**Start Date:** Ready now  
**Target Completion:** Same session  

---

## What's Already Built (Don't Repeat)

✅ **Signal Engine** (`backend/src/engine/`)
- Donchian channel calculations
- ATR-14 calculation
- Entry/exit signal generation
- Position sizing logic
- All fully typed and documented

✅ **Database Schema** (`backend/src/db/schema.sql`)
- 5 tables defined
- All indexes created
- Foreign keys configured
- Ready to migrate

✅ **Data Fetcher Interface** (`backend/src/data/fetcher.ts`)
- IDataFetcher interface defined
- YahooFinanceFetcher skeleton
- PolygonIOFetcher skeleton
- Both need implementation only

✅ **API Route Structures** (`backend/src/routes/`)
- All endpoints scaffolded
- Response format standardized
- Need handler implementations

✅ **Job Scheduler Framework** (`backend/src/jobs/`)
- Cron job setup ready
- Scan execution structure in place
- Need to wire scan logic

---

## What Needs Implementation (Phase 3)

### 3.1 - Database Setup & Migrations (0.5 - 1 hour)

**File:** `backend/src/db/migrate.ts` (CREATE THIS)

```typescript
// TODO: Implement
export async function migrate(): Promise<void>
  1. Check if database exists
  2. If not, run schema.sql
  3. If exists, check version
  4. Run any pending migrations
  5. Log success/failure
```

**File:** `backend/src/db/seed.ts` (CREATE THIS)

```typescript
// TODO: Implement
export async function seedTestData(): Promise<void>
  1. Create sample Russell 2000 tickers
  2. Create sample price data
  3. Create sample signals/trades
  4. Useful for testing before data fetcher is ready
```

**Test:** `npm run db:migrate` should create `data/signals.db` without errors

---

### 3.2 - Data Fetcher Implementation (2 - 2.5 hours)

#### 3.2a - Russell 2000 Tickers List

**File:** `backend/src/data/russell2000.ts` (CREATE THIS)

Options:
1. **Hardcoded list** - Pre-computed list of ~2000 tickers
2. **Polygon IO fetch** - Pull from API if available
3. **Cache file** - Store fetched tickers in JSON

```typescript
// TODO: Choose one approach
export async function getRussell2000Tickers(): Promise<string[]>
  1. Fetch or load Russell 2000 constituents
  2. Return array of 2000 tickers (or top N)
  3. Cache result to avoid repeated fetches
```

**Status:** ~1 hour work

#### 3.2b - Yahoo Finance Implementation

**File:** `backend/src/data/fetcher.ts` - Extend YahooFinanceFetcher

```typescript
// TODO: Complete implementation
async getHistoricalData(ticker, days): Promise<OHLC[]>
  1. Construct URL for ticker
  2. Fetch CSV from Yahoo
  3. Parse OHLC rows
  4. Return sorted by date ascending
  5. Error handling for missing tickers

async getRussell2000Tickers(): Promise<string[]>
  1. Call getRussell2000Tickers() helper
  2. Return list
```

**Test:** Fetch data for 5 tickers, verify OHLC format

**Status:** ~0.5-1 hour work

#### 3.2c - Polygon IO Implementation (Optional)

**File:** `backend/src/data/fetcher.ts` - Complete PolygonIOFetcher

```typescript
// TODO: Complete if API key available
async getHistoricalData(ticker, days): Promise<OHLC[]>
  1. Batch fetch from Polygon API
  2. Handle rate limiting
  3. Parse JSON response
  4. Return OHLC array

async getRussell2000Tickers(): Promise<string[]>
  1. Fetch from Polygon tickers endpoint
  2. Filter for Russell 2000
  3. Return top 2000
```

**Test:** Verify API key works, fetch 10 tickers

**Status:** ~0.5 hour work (if doing Polygon)

---

### 3.3 - Signal Engine Unit Tests (1.5 - 2 hours)

**Files to Create:**
- `tests/engine/indicators.test.ts`
- `tests/engine/signals.test.ts`
- `tests/engine/positionSizing.test.ts`

**3.3a - Indicators Tests** (`tests/engine/indicators.test.ts`)

```typescript
describe('Indicators', () => {
  test('calculateDonchian20High', () => {
    // TODO: Test with known data
    // Input: 21 days of OHLC
    // Expected: Highest high of last 20 days
    // Verify calculation correct
  })

  test('calculateDonchian20Low', () => {
    // TODO: Similar test
  })

  test('calculateDonchian10High/Low', () => {
    // TODO: Similar tests
  })

  test('calculateATR14', () => {
    // TODO: Test ATR calculation
    // Verify true range calculation
    // Verify 14-day average
  })

  test('validateHistoricalData', () => {
    // TODO: Test validation rules
    // Should reject < 21 days
    // Should reject invalid OHLC (high < low, etc)
  })
})
```

**Expected:** 100% coverage of indicator calculations

#### 3.3b - Signals Tests (`tests/engine/signals.test.ts`)

```typescript
describe('Signal Generation', () => {
  test('Buy signal triggered when close > 20-day high', () => {
    // TODO: Create test data where signal triggers
    // Verify entryPrice and stopLoss calculated
  })

  test('Sell signal triggered when close < 20-day low', () => {
    // TODO: Similar test
  })

  test('No signal when no breakout', () => {
    // TODO: Data where no signal
    // Verify returns false for both signals
  })

  test('Stop loss calculated correctly', () => {
    // TODO: Verify stop = entry ± (2 × ATR)
  })

  test('Exit signal when in long position and close < 10-day low', () => {
    // TODO: Test exit logic
  })
})
```

**Expected:** 100% coverage of signal rules

#### 3.3c - Position Sizing Tests (`tests/engine/positionSizing.test.ts`)

```typescript
describe('Position Sizing', () => {
  test('Calculates units based on 2% risk rule', () => {
    // TODO: Account: $100,000
    // Entry: $150, Stop: $145 (distance = $5)
    // Risk: $2,000, Units: 400
    // Position: $60,000
  })

  test('Caps position at 20% of account', () => {
    // TODO: Position exceeds 20% cap
    // Verify units reduced to fit cap
  })

  test('Validates input parameters', () => {
    // TODO: Test validation for negative amounts, zero distance, etc
  })
})
```

**Expected:** 100% coverage of position sizing

**Status:** ~1.5-2 hours work

---

### 3.4 - API Implementation (2 hours)

**File:** `backend/src/routes/` - Complete all route handlers

#### 3.4a - Signals Routes (`backend/src/routes/signals.ts`)

Currently: Scaffolded with GET, POST, GET by ID

```typescript
// TODO: Implement full handlers
GET /api/signals
  ✅ Query params: date, status, ticker, limit
  ✅ Response: array of signals
  Need: Test with actual database

GET /api/signals/:id
  ✅ Response: single signal or 404
  Need: Test with actual database

POST /api/signals
  ✅ Body validation
  ✅ Database insert
  ✅ Return created signal
  Need: Test creation flow
```

**Status:** 30 minutes

#### 3.4b - Trades Routes (`backend/src/routes/trades.ts`)

Currently: Scaffolded with GET, POST, POST /import

```typescript
// TODO: Implement full handlers
GET /api/trades
  ✅ Query params: ticker, limit, offset
  ✅ Response: array of trades
  Need: Test filtering

POST /api/trades
  ✅ Body validation
  ✅ Database insert
  ✅ Return created trade
  Need: Test creation

POST /api/trades/import
  ✅ CSV parsing
  ✅ Batch insert
  ✅ Return imported trades
  Need: Test CSV format
```

**Status:** 30 minutes

#### 3.4c - Admin Routes (`backend/src/routes/admin.ts`)

Currently: Scaffolded with /health, /scan, /settings

```typescript
// TODO: Implement full handlers
GET /api/admin/health
  ✅ Query database for last scan
  ✅ Calculate next scan time (4 PM ET)
  ✅ Return status
  Need: Test database query

POST /api/admin/scan
  ✅ Trigger manual scan
  ✅ Return scan ID
  ✅ Wire to scheduler
  Need: Test scan execution

GET /api/admin/settings
  ✅ Return system configuration
  ✅ Load from .env or defaults
  Need: Test return format
```

**Status:** 45 minutes

#### 3.4d - Add Analytics Endpoint (NEW)

```typescript
// Create backend/src/routes/analytics.ts
GET /api/analytics/performance
  1. Query all trades from database
  2. Calculate metrics:
     - Win rate
     - Profit factor
     - Average P&L
     - Best/worst trade
  3. Return summary
```

**Status:** 15 minutes

**Total Section 3.4:** ~2 hours

---

### 3.5 - Job Scheduler Implementation (1 - 1.5 hours)

**File:** `backend/src/jobs/scan.ts` - Implement actual scan logic

Currently: Scaffolded with placeholder

```typescript
// TODO: Implement performDailyScan()
export async function performDailyScan(trigger, tickersOverride)
  1. Get list of Russell 2000 tickers
  2. Create scan_history record (in_progress)
  3. For each ticker:
     a. Fetch historical data (21+ days)
     b. Calculate Turtle indicators
     c. Check for buy/sell signals
     d. If signal, insert into signals table
  4. Update scan_history (completed)
  5. Log results

Pseudocode:
  const tickers = await getTickers()
  const scanId = generateId()
  await createScanRecord(scanId, 'in_progress')
  
  let buySignals = 0, sellSignals = 0
  for (const ticker of tickers) {
    try {
      const prices = await fetchHistoricalData(ticker, 21)
      const signal = generateSignal(ticker, prices)
      if (signal.buySignal || signal.sellSignal) {
        await insertSignal(scanId, signal)
        if (signal.buySignal) buySignals++
        if (signal.sellSignal) sellSignals++
      }
    } catch (e) {
      // Log error, continue
    }
  }
  
  await updateScanRecord(scanId, 'completed', buySignals, sellSignals)
```

**Status:** ~1 hour

---

### 3.6 - Frontend Dashboard (2 - 2.5 hours)

**Files to Create:** `frontend/src/` (Vue 3)

#### 3.6a - Main App (`frontend/src/App.vue`)

```vue
<template>
  <div class="app">
    <nav>
      <router-link to="/dashboard">Dashboard</router-link>
      <router-link to="/trades">Trades</router-link>
      <router-link to="/admin">Admin</router-link>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>
```

**Status:** 15 minutes

#### 3.6b - Dashboard View (`frontend/src/views/Dashboard.vue`)

```vue
<template>
  <div class="dashboard">
    <h1>Turtle Trading Signals</h1>
    
    <!-- Status Panel -->
    <div class="status">
      <p>Last Scan: {{ lastScan?.created_at }}</p>
      <p>Next Scan: {{ nextScan }}</p>
      <p>Signals Today: {{ todaySignals.length }}</p>
    </div>
    
    <!-- Signals Table -->
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Type</th>
          <th>Entry Price</th>
          <th>Stop Loss</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="signal in todaySignals" :key="signal.id">
          <td>{{ signal.ticker }}</td>
          <td :class="signal.signal_type">{{ signal.signal_type }}</td>
          <td>${{ signal.entry_price }}</td>
          <td>${{ signal.stop_loss_price }}</td>
          <td>{{ formatTime(signal.created_at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const todaySignals = ref([])
const lastScan = ref(null)
const nextScan = ref(null)

onMounted(async () => {
  // Fetch signals
  const response = await api.get('/signals')
  todaySignals.value = response.data.data
  
  // Fetch health
  const health = await api.get('/admin/health')
  lastScan.value = health.data.data.lastScan
  nextScan.value = health.data.data.nextScan
  
  // Auto-refresh every 5 minutes
  setInterval(async () => {
    const updated = await api.get('/signals')
    todaySignals.value = updated.data.data
  }, 300000)
})

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString()
}
</script>

<style scoped>
/* Dashboard styles */
</style>
```

**Status:** 45 minutes

#### 3.6c - Router Setup (`frontend/src/router.ts`)

```typescript
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import Trades from './views/Trades.vue'
import Admin from './views/Admin.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/dashboard', component: Dashboard },
    { path: '/trades', component: Trades },
    { path: '/admin', component: Admin },
  ]
})
```

**Status:** 10 minutes

#### 3.6d - API Client (`frontend/src/api.ts`)

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
})

export default api
```

**Status:** 5 minutes

**Total Section 3.6:** ~2 hours

---

### 3.7 - Trade History & Portfolio (1 - 1.5 hours)

#### 3.7a - Trades View (`frontend/src/views/Trades.vue`)

```vue
<template>
  <div class="trades">
    <h1>Trade History</h1>
    
    <!-- Manual Entry Form -->
    <form @submit.prevent="addTrade">
      <input v-model="newTrade.ticker" placeholder="TICKER" />
      <input v-model.number="newTrade.entry_price" placeholder="Entry Price" type="number" />
      <input v-model.number="newTrade.entry_shares" placeholder="Shares" type="number" />
      <button type="submit">Add Trade</button>
    </form>
    
    <!-- CSV Import -->
    <input type="file" accept=".csv" @change="importCSV" />
    
    <!-- Trades Table -->
    <table>
      <thead>
        <tr>
          <th>Ticker</th>
          <th>Entry Date</th>
          <th>Entry Price</th>
          <th>Shares</th>
          <th>Exit Date</th>
          <th>Exit Price</th>
          <th>P&L %</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in trades" :key="trade.id">
          <td>{{ trade.ticker }}</td>
          <td>{{ trade.entry_date }}</td>
          <td>${{ trade.entry_price }}</td>
          <td>{{ trade.entry_shares }}</td>
          <td>{{ trade.exit_date || '-' }}</td>
          <td>${{ trade.exit_price || '-' }}</td>
          <td :class="{ gain: pnlPercent(trade) > 0, loss: pnlPercent(trade) < 0 }">
            {{ pnlPercent(trade).toFixed(2) }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const trades = ref([])
const newTrade = ref({ ticker: '', entry_price: 0, entry_shares: 0 })

onMounted(async () => {
  const response = await api.get('/trades')
  trades.value = response.data.data
})

async function addTrade() {
  await api.post('/trades', newTrade.value)
  newTrade.value = { ticker: '', entry_price: 0, entry_shares: 0 }
  const response = await api.get('/trades')
  trades.value = response.data.data
}

async function importCSV(event) {
  const file = event.target.files[0]
  const text = await file.text()
  const lines = text.split('\n')
  const records = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const [ticker, entryDate, entryPrice, entryShares] = lines[i].split(',')
    records.push({ ticker, entryDate, entryPrice: parseFloat(entryPrice), entryShares: parseInt(entryShares) })
  }
  await api.post('/trades/import', { trades: records })
  const response = await api.get('/trades')
  trades.value = response.data.data
}

function pnlPercent(trade) {
  if (!trade.exit_price) return 0
  return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
}
</script>
```

**Status:** 45 minutes

#### 3.7b - Portfolio Overlay Component

```vue
<template>
  <div class="portfolio">
    <h1>Portfolio Overlay</h1>
    <p>Current Positions vs. New Signals</p>
    
    <div class="conflicts" v-if="conflicts.length > 0">
      <h2>Signal Conflicts</h2>
      <div v-for="conflict in conflicts" :key="conflict.ticker" class="conflict">
        <p>{{ conflict.ticker }}: {{ conflict.conflictType }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const conflicts = ref([])

onMounted(async () => {
  // TODO: Call /api/portfolio/overlay endpoint
  // Display conflicts
})
</script>
```

**Status:** 30 minutes

**Total Section 3.7:** ~1.5 hours

---

### 3.8 - Admin Panel (1 hour)

#### 3.8a - Admin View (`frontend/src/views/Admin.vue`)

```vue
<template>
  <div class="admin">
    <h1>Admin Panel</h1>
    
    <!-- Force Scan -->
    <button @click="forceScan" :disabled="scanning">
      {{ scanning ? 'Scanning...' : 'Force Scan Now' }}
    </button>
    
    <!-- Settings -->
    <div class="settings">
      <h2>Settings</h2>
      <p>Scan Time: {{ settings.scanTime }}</p>
      <p>Min Volume: {{ settings.minVolumeFilter }}</p>
    </div>
    
    <!-- Last Scan Results -->
    <div class="last-scan" v-if="lastScan">
      <h2>Last Scan</h2>
      <p>Status: {{ lastScan.scan_status }}</p>
      <p>Tickers Scanned: {{ lastScan.tickers_scanned }}</p>
      <p>Buy Signals: {{ lastScan.buy_signals }}</p>
      <p>Sell Signals: {{ lastScan.sell_signals }}</p>
      <p>Execution Time: {{ lastScan.execution_time_ms }}ms</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const scanning = ref(false)
const settings = ref({})
const lastScan = ref(null)

onMounted(async () => {
  const settingsResponse = await api.get('/admin/settings')
  settings.value = settingsResponse.data.data
  
  const healthResponse = await api.get('/admin/health')
  lastScan.value = healthResponse.data.data.lastScan
})

async function forceScan() {
  scanning.value = true
  try {
    await api.post('/admin/scan')
    // Poll for completion
    let completed = false
    while (!completed) {
      const response = await api.get('/admin/health')
      if (response.data.data.lastScan?.scan_status === 'completed') {
        completed = true
        lastScan.value = response.data.data.lastScan
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } finally {
    scanning.value = false
  }
}
</script>
```

**Status:** 1 hour

---

## Implementation Order (Recommended)

1. **3.1** - Database migrations (0.5h) - Need this for everything else
2. **3.2** - Data fetcher (2h) - Need data to test signals
3. **3.3** - Signal tests (2h) - Validate core logic works
4. **3.5** - Job scheduler (1h) - Wire up scan execution
5. **3.4** - API implementation (2h) - Test endpoints with real data
6. **3.6** - Frontend dashboard (2h) - Display signals
7. **3.7** - Trade history (1.5h) - Manual entry & CSV import
8. **3.8** - Admin panel (1h) - Manual controls

**Total: ~12 hours**

---

## Testing Strategy (Phase 4 prep)

For each section, create tests:

**3.1 Tests:** `tests/db/` 
- Database creation works
- Schema is correct
- Migrations are idempotent

**3.2 Tests:** `tests/data/`
- Yahoo Finance parsing works
- Polygon API integration (if available)
- Error handling for bad tickers

**3.3 Tests:** Already planned

**3.4 Tests:** `tests/routes/`
- All endpoints return correct format
- Validation works
- Error handling works

**3.5 Tests:** `tests/jobs/`
- Scan logic works end-to-end
- Database updates correctly
- Error recovery works

**3.6+ Tests:** `tests/e2e/` (Phase 4)
- Browser automation for UI
- Full workflow testing

---

## Success Criteria for Phase 3

- [ ] Database creates and migrations work
- [ ] Data fetcher can pull Russell 2000 daily data
- [ ] Signal engine tests all pass (100% coverage)
- [ ] API endpoints respond correctly with real data
- [ ] Job scheduler runs scan and stores results
- [ ] Frontend displays today's signals
- [ ] Can manually add trades and view history
- [ ] Admin panel can force scan
- [ ] All systems integrated and working together
- [ ] No console errors or unhandled exceptions
- [ ] Code is committed and documented

---

## Notes for Implementation

1. **Start with database** - Everything depends on it
2. **Use test data first** - Before implementing real data fetcher
3. **Test each module independently** - Signal engine, fetcher, API
4. **Wire together incrementally** - Scan → API → Frontend
5. **Document as you go** - Keep README and code comments current
6. **Commit frequently** - Every completed subtask
7. **Test manually** - Use curl and browser before moving on

---

**Ready to start Phase 3! 🚀**
