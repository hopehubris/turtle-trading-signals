# Startup Guide - How to Start/Stop the Application

**Status:** ✅ PRODUCTION DEPLOYMENT  
**System:** Turtle Trading Signals on Mac mini  
**Port:** 3001  

---

## Quick Start (Recommended)

### Using the Startup Script
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
./start.sh
```

The script will:
1. ✅ Check if pm2 is installed
2. ✅ Build the project if needed
3. ✅ Run database migrations
4. ✅ Start the server with pm2
5. ✅ Enable auto-start on boot
6. ✅ Show live logs

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║  🎉 Turtle Trading Signals is now running!                 ║
║                                                            ║
║  🌐 Web Interface: http://localhost:3001                   ║
║  🌐 Network Access: http://192.168.1.51:3001              ║
╚════════════════════════════════════════════════════════════╝
```

---

## Alternative Startup Methods

### Method 1: Direct npm start
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
npm start
```

**Requirements:**
- Project already built (`npm run build` was run)
- Database initialized (`npm run db:migrate` was run)
- pm2 NOT running (start.sh is not running)

**Output:**
- Starts Node directly without process manager
- **NOT RECOMMENDED FOR PRODUCTION** (no auto-restart)
- Press `Ctrl+C` to stop

### Method 2: Using pm2 Directly
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# First time only: build and initialize
npm install
npm run build
npm run db:migrate

# Start with pm2
pm2 start ecosystem.config.cjs --env production

# Save process list
pm2 save

# View status
pm2 list
```

### Method 3: Using npm run dev (Development)
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
npm run dev
```

**FOR DEVELOPMENT ONLY**
- Hot-reloads on file changes
- Use in terminal while editing code
- Press `Ctrl+C` to stop

---

## Stopping the Application

### Using pm2
```bash
# Stop the process
pm2 stop turtle-trading-signals

# Output:
# [PM2] Stopping app turtle-trading-signals...
# [PM2] App stopped
```

### Remove from pm2 (Uninstall)
```bash
# Stop and remove from process manager
pm2 delete turtle-trading-signals

# Disable auto-start on boot
pm2 unstartup
pm2 save
```

### Kill the process directly
```bash
# Find the process ID
ps aux | grep "node.*index.js"

# Kill it
kill -9 <PID>

# Or kill all Node processes (dangerous!)
killall node
```

---

## Restarting the Application

### Restart via pm2 (Best)
```bash
# Graceful restart (recommended)
pm2 reload turtle-trading-signals

# Force restart (if reload hangs)
pm2 restart turtle-trading-signals

# View status after restart
pm2 list
```

### After Configuration Changes
```bash
# Edit .env.production with new settings
nano .env.production

# Rebuild required
npm run build

# Restart
pm2 restart turtle-trading-signals
```

### After Code Changes
```bash
# Update from git
git pull

# Rebuild
npm run build

# Restart
pm2 restart turtle-trading-signals

# View logs to verify
pm2 logs turtle-trading-signals
```

---

## Checking Status

### View Process List
```bash
pm2 list
```

Should show:
```
│ 0  │ turtle-trading-signals    │ default     │ online    │
```

### View Detailed Information
```bash
pm2 info turtle-trading-signals
```

Shows:
- PID
- Memory usage
- CPU usage
- Uptime
- Restart count

### Monitor in Real-time
```bash
pm2 monit
```

Shows live CPU, memory, and log monitoring.

---

## Accessing the Application

### Local Access (On Mac mini)
```bash
# Open in browser
open http://localhost:3001

# Or test API
curl http://localhost:3001/api/health
```

### Network Access (From another machine)
```bash
# Open in browser
# http://192.168.1.51:3001

# Or test API
curl http://192.168.1.51:3001/api/health
```

### Mobile Access (iPhone/iPad)
1. Open Safari
2. Go to: `http://192.168.1.51:3001`
3. Optionally: "Add to Home Screen" to make it an app

---

## Viewing Logs

### Live Log Stream
```bash
pm2 logs turtle-trading-signals

# Press Ctrl+C to exit
```

### Last 100 Lines
```bash
pm2 logs turtle-trading-signals --lines 100
```

### Error Log Only
```bash
pm2 logs turtle-trading-signals --err
```

### View Log Files Directly
```bash
# App output
cat logs/pm2-out.log | tail -50

# App errors
cat logs/pm2-error.log | tail -50

# Launchd logs (if using plist)
cat logs/launchd.log
```

### Search Logs
```bash
# Find errors
pm2 logs turtle-trading-signals | grep "error"

# Find specific events
pm2 logs turtle-trading-signals | grep "signal"

# See recent startup
pm2 logs turtle-trading-signals | tail -30
```

---

## Auto-Start on System Boot

### Option 1: Using launchd (Recommended)

**First time setup:**
```bash
# Copy plist to LaunchAgents
cp /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy/com.turtle-trading.plist \
   ~/Library/LaunchAgents/com.turtle-trading.signals.plist

# Load the service
launchctl load ~/Library/LaunchAgents/com.turtle-trading.signals.plist

# Verify it's loaded
launchctl list | grep turtle

# Output: com.turtle-trading.signals
```

**Check if service is running:**
```bash
# Verify service loaded
launchctl list com.turtle-trading.signals

# Check logs
cat ~/Library/LaunchAgents/../../../com.turtle-trading.signals.log
```

**Disable auto-start:**
```bash
launchctl unload ~/Library/LaunchAgents/com.turtle-trading.signals.plist
rm ~/Library/LaunchAgents/com.turtle-trading.signals.plist
```

### Option 2: Using pm2 Startup
```bash
# Enable startup (requires password)
pm2 startup

# This creates launchd daemon automatically

# Disable later
pm2 unstartup
```

### Option 3: Manual (not recommended)
- Restart Mac mini
- SSH in and run `./start.sh`
- But this requires manual action

---

## Building from Source

### Initial Build
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# Install dependencies
npm install

# Build TypeScript
npm run build

# Initialize database
npm run db:migrate

# Start with pm2
pm2 start ecosystem.config.cjs --env production
```

### Rebuild After Changes
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# Install new dependencies if needed
npm install

# Rebuild TypeScript
npm run build

# Restart process
pm2 restart turtle-trading-signals
```

### Update from Git
```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# Get latest code
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Run migrations if schema changed
npm run db:migrate

# Restart
pm2 restart turtle-trading-signals
```

---

## Database Initialization

### Initialize Empty Database
```bash
npm run db:migrate
```

Creates new `data/signals.db` with all tables.

### Seed Sample Data
```bash
npm run db:seed
```

Adds test signals, trades, and portfolio data.

### Reset Database (Delete all data)
```bash
npm run db:reset
```

Deletes current database and creates fresh one.

### Backup Database
```bash
# Create backup
cp data/signals.db data/signals.db.backup.$(date +%Y%m%d_%H%M%S)

# Later, restore from backup
cp data/signals.db.backup.20260206_101010 data/signals.db

# Restart server
pm2 restart turtle-trading-signals
```

---

## Troubleshooting Startup

### Server Won't Start

**Check what's wrong:**
```bash
# View error logs
pm2 logs turtle-trading-signals --err

# Check if port 3001 is in use
lsof -i :3001

# Check database
ls -la data/signals.db
```

**Common fixes:**
```bash
# Port already in use - kill other process
kill -9 <PID>

# Database missing - reinitialize
npm run db:migrate

# Permissions wrong - fix
chmod 755 data/
chmod 755 dist/

# Rebuild if corrupted
npm run build
```

### Server Keeps Crashing

**View crash logs:**
```bash
pm2 logs turtle-trading-signals
pm2 logs turtle-trading-signals --err
```

**Common issues:**
```bash
# Out of memory - check
pm2 info turtle-trading-signals

# Not enough disk space
df -h | grep /

# Database corrupted
npm run db:reset
pm2 restart turtle-trading-signals
```

### Can't Access Web Interface

**Test local access first:**
```bash
curl http://localhost:3001/api/health
```

**If that works but network doesn't:**
```bash
# Check firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Allow Node in firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node --unblock

# Check server binding
pm2 logs turtle-trading-signals | grep "Server:"
```

---

## Performance Tips

### First Startup May Be Slow
- Database migration may take a few seconds
- First page load may compile frontend
- This is normal, subsequent starts are faster

### Optimize for Speed
```bash
# Use pm2 monit to watch performance
pm2 monit

# Restart if memory gets high
pm2 restart turtle-trading-signals

# Clear old logs periodically
truncate -s 0 logs/pm2-out.log
truncate -s 0 logs/pm2-error.log
```

### Background Processing
- Scheduler runs daily scan at 4 PM ET
- Signal processing happens in background
- No manual intervention needed

---

## Useful Commands Summary

```bash
# Start
./start.sh                                    # Recommended
pm2 start ecosystem.config.cjs --env production

# Stop
pm2 stop turtle-trading-signals

# Restart
pm2 restart turtle-trading-signals
pm2 reload turtle-trading-signals             # Graceful

# Check status
pm2 list
pm2 info turtle-trading-signals

# View logs
pm2 logs turtle-trading-signals
pm2 logs turtle-trading-signals --err
pm2 logs turtle-trading-signals --lines 100

# Monitor
pm2 monit

# Auto-start on boot
pm2 startup
pm2 save

# Database
npm run db:migrate
npm run db:seed
npm run db:reset

# Build
npm run build
npm install
```

---

## Daily Operations

### Morning Check
```bash
# Verify it's running
pm2 list

# Check logs for errors
pm2 logs turtle-trading-signals --lines 20

# Test API
curl http://localhost:3001/api/health
```

### Weekly Maintenance
```bash
# View resource usage
pm2 info turtle-trading-signals

# Check database size
du -h data/signals.db

# Restart to clear memory
pm2 restart turtle-trading-signals
```

### Monthly Tasks
```bash
# Backup database
cp data/signals.db data/signals.db.backup.$(date +%Y%m%d)

# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Update if new version available
git pull
npm install
npm run build
pm2 restart turtle-trading-signals
```

---

## Emergency Shutdown

```bash
# Graceful stop (waits for requests to complete)
pm2 stop turtle-trading-signals

# Force immediate stop
pm2 kill

# Or directly
killall node
```

---

## Support

For startup issues:
1. Check: `pm2 logs turtle-trading-signals`
2. Review: `TROUBLESHOOTING.md`
3. Verify: `./start.sh` works
4. If all else fails: `npm run db:reset && pm2 restart`

---

**Last Updated:** 2026-02-06  
**Status:** ✅ READY FOR PRODUCTION
