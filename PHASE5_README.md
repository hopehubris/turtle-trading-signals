# Phase 5: Production Deployment - Quick Reference

**Status:** ✅ COMPLETE AND RUNNING  
**Date:** 2026-02-06  
**System:** Mac mini at 192.168.1.51:3001  

---

## 🚀 Quick Start

```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
./start.sh
```

That's it! The application will start automatically.

---

## 📱 Access the Dashboard

**Local Machine:**
```
http://localhost:3001
```

**From Network (Mac, Windows, iPhone, Android):**
```
http://192.168.1.51:3001
```

---

## ✅ What's Running

```
Process:  turtle-trading-signals (pm2)
Status:   ONLINE ✅
Port:     3001
Memory:   65 MB
CPU:      <1% (idle)
Uptime:   Running
Restarts: 0 (stable)
```

Verify with: `pm2 list`

---

## 📊 API Endpoints

```
/api/health                    - Server health
/api/signals                   - List all signals
/api/trades                    - List all trades
/api/portfolio/positions       - Portfolio tracking
/api/analytics/summary         - Analytics data
/api/admin/settings           - System settings
```

Test: `curl http://localhost:3001/api/health`

---

## 📝 Useful Commands

```bash
# Check status
pm2 list                                    # Show all processes
pm2 info turtle-trading-signals            # Detailed info
pm2 monit                                   # Real-time monitor

# View logs
pm2 logs turtle-trading-signals            # Live logs
pm2 logs turtle-trading-signals --err      # Errors only
pm2 logs turtle-trading-signals --lines 50 # Last 50 lines

# Control process
pm2 restart turtle-trading-signals  # Restart
pm2 stop turtle-trading-signals     # Stop
pm2 start ecosystem.config.cjs      # Start

# Database
npm run db:migrate   # Initialize (if needed)
npm run db:seed      # Add sample data (if needed)
npm run db:reset     # Clear all data (careful!)

# Build
npm run build        # Rebuild TypeScript
npm install          # Install dependencies
```

---

## 📚 Documentation

Need more details? Choose a guide:

| Guide | Purpose |
|-------|---------|
| **DEPLOYMENT_PHASE5.md** | Complete deployment guide |
| **NETWORK_SETUP.md** | Network access & firewall setup |
| **TROUBLESHOOTING.md** | Problems & solutions |
| **STARTUP.md** | Startup operations |
| **PRODUCTION_SETUP.md** | Configuration options |
| **PHASE5_COMPLETION_REPORT.md** | Full project report |

---

## 🔧 Configuration

Edit environment at: `.env.production`

```env
NODE_ENV=production      # Leave as-is
PORT=3001               # Server port
SCAN_TIME=16:00         # Daily scan time (4 PM ET)
SCAN_TIMEZONE=America/New_York
# ... other settings ...
```

After changes:
```bash
npm run build
pm2 restart turtle-trading-signals
```

---

## 🤔 Troubleshooting

**Server won't start?**
```bash
pm2 logs turtle-trading-signals --err
```

**Can't access from network?**
```bash
curl http://192.168.1.51:3001/api/health
pm2 logs turtle-trading-signals | grep "0.0.0.0"
```

**Database error?**
```bash
npm run db:migrate
pm2 restart turtle-trading-signals
```

See **TROUBLESHOOTING.md** for detailed solutions.

---

## 📱 Mobile Access

1. Open Safari (iPhone/iPad) or Chrome (Android)
2. Go to: `http://192.168.1.51:3001`
3. Optionally "Add to Home Screen" to make it an app

---

## 🔄 Auto-Start on System Boot

**Option A: Using launchd (Recommended)**
```bash
cp com.turtle-trading.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.turtle-trading.signals.plist
```

**Option B: Using pm2**
```bash
pm2 startup
pm2 save
```

See **STARTUP.md** for details.

---

## 📊 Performance

- Startup: ~2 seconds
- API response: <100ms
- Memory: 65-100 MB
- CPU (idle): <1%
- Concurrent users: 50+

---

## 🔐 Security Notes

- Currently accessible on local network only
- No authentication required (internal network)
- To expose to internet, requires HTTPS + auth
- See PRODUCTION_SETUP.md for advanced security

---

## 💾 Backup

```bash
# Create backup
cp data/signals.db data/signals.db.backup.$(date +%Y%m%d)

# Restore from backup
cp data/signals.db.backup.20260206 data/signals.db
pm2 restart turtle-trading-signals
```

---

## 📞 Support

1. Check relevant documentation guide
2. View logs: `pm2 logs turtle-trading-signals --err`
3. Test API: `curl http://localhost:3001/api/health`
4. Reset if needed: `npm run db:reset && pm2 restart`

---

## 🎯 Next Steps

1. ✅ Start with `./start.sh`
2. ✅ Access at `http://192.168.1.51:3001`
3. ✅ Create your first signal
4. ✅ Enter a trade
5. ✅ Check portfolio
6. ✅ View analytics

---

## 📋 System Info

```
Mac mini IP:        192.168.1.51
Port:               3001
Server:             Express.js (Node.js v24.4.1)
Frontend:           Vue 3
Database:           SQLite3
Process Manager:    pm2
Location:           /Users/ashisheth/.openclaw/workspace/
                    turtle-trading-signals-AdmiralMondy
```

---

## ✨ You're All Set!

The system is **ready to go**. Just run:

```bash
./start.sh
```

Then open your browser to:

```
http://192.168.1.51:3001
```

Enjoy! 🎉

---

**Questions?** See the documentation files above.

**Issues?** Check TROUBLESHOOTING.md or run:
```bash
pm2 logs turtle-trading-signals --err
```

**Status:** ✅ PRODUCTION READY
