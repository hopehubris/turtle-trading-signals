# START HERE 🚀

**Welcome to Turtle Trading Signals - Complete Web App**

This document gets you oriented in 2 minutes.

---

## What This Is

A complete full-stack web application that:
- 🔍 Scans Russell 2000 daily for Turtle Trading entry/exit signals
- 📊 Provides actionable trade alerts
- 📈 Tracks manual trade history + performance
- 🖥️ Shows portfolio overlay (current positions vs signals)
- ⚡ Runs on your Mac mini (192.168.1.51:3001)

**Current Status:** PHASE 2 ARCHITECTURE ✅ COMPLETE
**Next:** Phase 3 BUILD (implementation)

---

## Get Started (3 Steps)

### 1. Understand the Project (5 min)
Read these in order:
1. **QUICK_START.md** ← Start here! (2 min read)
2. **README.md** ← Full overview (3 min read)

### 2. Set Up Your Environment (5 min)
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
npm install
npm run build
```

### 3. Start Development (2 min)
```bash
npm run dev
```

Then visit: `http://localhost:3001/api/health`

---

## Documentation Map

| Document | Read When | Time |
|----------|-----------|------|
| **QUICK_START.md** | Getting oriented fast | 2 min |
| **README.md** | Understanding the project | 5 min |
| **SETUP_INSTRUCTIONS.md** | Setting up for development | 10 min |
| **ARCHITECTURE.md** | Learning system design | 15 min |
| **PHASE3_ROADMAP.md** | Before starting Phase 3 BUILD | 20 min |

---

## What's Already Built (Don't Repeat!)

✅ **Signal Engine** - Ready to test
- Donchian channel calculations
- ATR stop loss calculation
- Entry/exit logic
- Position sizing (2% risk rule)

✅ **Database Schema** - Ready to migrate
- SQLite with 5 tables
- All indexes designed
- Foreign keys configured

✅ **API Specifications** - Ready to implement
- Routes designed
- Response format standardized
- Handler stubs in place

✅ **Job Scheduler Framework** - Ready to wire up
- 4 PM ET daily scan scheduled
- Manual trigger support
- Status tracking

---

## What Needs Building (Phase 3)

- [ ] Implement data fetcher (Yahoo Finance)
- [ ] Unit test signal engine
- [ ] Implement API handlers
- [ ] Wire up daily scan execution
- [ ] Build Vue 3 dashboard
- [ ] Add trade history view
- [ ] Create admin panel

**Estimated time:** ~12 hours (detailed breakdown in PHASE3_ROADMAP.md)

---

## Key Commands

```bash
# Development
npm run dev              # Start server with hot-reload
npm run build          # Compile TypeScript

# Database
npm run db:migrate     # Create database
npm run db:reset       # Wipe and recreate (WARNING!)

# Testing (Phase 4)
npm run test           # Run Jest tests
npm run test:coverage  # Coverage report

# Deployment
npm run build          # Build for production
npm start              # Run compiled code
```

---

## Project Structure at a Glance

```
turtle-trading-signals-AdmiralMondy/
├── backend/src/
│   ├── engine/         ← Signal calculations (READY)
│   ├── data/           ← Data fetcher (PARTIAL)
│   ├── db/             ← Database layer (READY)
│   ├── routes/         ← API endpoints (SKELETON)
│   ├── jobs/           ← Scheduler (PARTIAL)
│   └── index.ts        ← Express app (READY)
├── frontend/           ← Vue 3 (PHASE 3)
├── tests/              ← Jest tests (PHASE 3-4)
├── README.md           ← Full documentation
├── ARCHITECTURE.md     ← System design
├── PHASE3_ROADMAP.md   ← Implementation guide
└── SETUP_INSTRUCTIONS.md ← Detailed setup
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Express.js | ^4.18 |
| **Language** | TypeScript | ^5.3 |
| **Database** | SQLite | 3+ |
| **Frontend** | Vue 3 | ^3.3 |
| **Bundler** | Vite | ^5.0 |
| **Scheduler** | node-cron | ^3.0 |

---

## Key Concepts

### Turtle Trading Rules (Built Into Signal Engine)

**Entry:**
- BUY when: Close > 20-day highest high
- SELL when: Close < 20-day lowest low

**Exit:**
- LONG EXIT when: Close < 10-day lowest low
- SHORT EXIT when: Close > 10-day highest high

**Stop Loss:**
- Distance = 2 × ATR(14 days)
- Position Size = Risk Amount / Stop Distance (2% risk rule)

### Daily Scan (Scheduled)
- Time: 4 PM ET daily
- Process: Russell 2000 → Calculate signals → Store in DB → Display
- Duration: <5 minutes target
- Manual trigger: Available via API

---

## Most Important Files

| File | Purpose |
|------|---------|
| `backend/src/index.ts` | Express app entry |
| `backend/src/db/schema.sql` | Database definition |
| `backend/src/engine/signals.ts` | Signal logic |
| `backend/src/routes/` | API endpoints |
| `backend/src/jobs/scheduler.ts` | Daily scan scheduling |

---

## FAQ

**Q: How do I run it?**
A: `npm install` → `npm run dev` → Visit `http://localhost:3001/api/health`

**Q: Where's the frontend?**
A: In `frontend/` folder, scaffolded for Vue 3. Implement in Phase 3.

**Q: What data source is used?**
A: Yahoo Finance (free) by default. Polygon IO (premium) if API key provided.

**Q: How often does it scan?**
A: Daily at 4 PM ET. You can manually trigger via `/api/admin/scan`.

**Q: Can I run the backtester?**
A: Yes, it's in the separate `turtle-trading-backtester/` folder.

**Q: What if I want real-time alerts?**
A: Dashboard refreshes every 5 minutes. Telegram integration in Phase 5.

---

## Next Steps

1. **Immediate:** Read QUICK_START.md (2 minutes)
2. **Then:** Run `npm install && npm run dev`
3. **Then:** Read PHASE3_ROADMAP.md
4. **Then:** Start Phase 3 implementation

---

## Questions?

- **Architecture:** See `ARCHITECTURE.md`
- **Turtle Rules:** See `TURTLE_RULES.md`
- **Setup:** See `SETUP_INSTRUCTIONS.md`
- **Phase 3:** See `PHASE3_ROADMAP.md`

---

**Ready to build the complete app?**

Start with QUICK_START.md →
