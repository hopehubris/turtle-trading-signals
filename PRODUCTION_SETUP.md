# Production Setup Guide

**Status:** ✅ COMPLETE  
**System:** Turtle Trading Signals System  
**Deployment:** Mac mini (192.168.1.51)  
**Date:** 2026-02-06  

---

## System Requirements

### Hardware
- **RAM:** Minimum 4GB (8GB+ recommended)
- **Storage:** 2GB free space (database grows ~50MB/month)
- **CPU:** Any modern processor (very lightweight)
- **Network:** Ethernet or WiFi (stable connection recommended)

### Software
- **OS:** macOS 11+ (or Linux/Windows with minor adjustments)
- **Node.js:** v18+ (currently running v24.4.1)
- **npm:** v9+ (currently running v11+)
- **SQLite:** Built-in (v3.44+)

### Verified Configuration
```bash
Node.js:     v24.4.1 ✅
npm:         v11.x ✅
macOS:       Sonoma 14.6 ✅
Architecture: arm64 (Apple Silicon) ✅
```

---

## Pre-Deployment Checklist

### 1. Verify Node Installation
```bash
node --version        # Should be v18+
npm --version         # Should be v9+
npm list -g pm2       # Should be installed
```

### 2. Create Project Directory
```bash
# Project is already at:
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# Verify structure
ls -la
# Should show: backend/, frontend/, data/, logs/, .env.production, ecosystem.config.cjs
```

### 3. Check Disk Space
```bash
# Verify 2GB free
df -h | grep /

# Should show >2GB available
```

### 4. Verify Port Availability
```bash
# Check port 3001 is free
lsof -i :3001

# Should show nothing (port is free)
# If port in use: kill -9 <PID> or change port in .env.production
```

---

## Deployment Steps

### Step 1: Environment Configuration

**File:** `.env.production`

```env
# Server Configuration
NODE_ENV=production          # Never use "development" in production
PORT=3001                    # Server port (change if 3001 is unavailable)

# Database
DB_PATH=./data/signals.db    # SQLite database location

# Logging
LOG_LEVEL=info               # info, warn, error (use info for normal ops)

# Scheduler Configuration
SCAN_TIME=16:00              # Daily scan time (24-hour format, Eastern Time)
SCAN_TIMEZONE=America/New_York

# Trading Parameters
RUSSELL_THRESHOLD=2000       # Only Russell 2000 stocks
MIN_VOLUME_FILTER=100000     # Minimum daily volume
LIQUIDITY_FILTER=true        # Filter low-liquidity stocks
TIMEOUT_MINUTES=5            # Data fetch timeout

# API Configuration (optional)
POLYGON_API_KEY=             # Leave empty for Yahoo Finance (free)
                             # Set to your key for premium data
```

**Custom Configuration Example:**

Change scan time to 9:00 AM:
```bash
# Edit .env.production
SCAN_TIME=09:00
SCAN_TIMEZONE=America/New_York

# Rebuild and restart
npm run build
pm2 restart turtle-trading-signals
```

### Step 2: Build the Application

```bash
cd /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy

# Install dependencies (production only)
npm ci --production    # Better for production than npm install

# Build TypeScript
npm run build

# Expected output:
# Successfully compiles, no errors

# Verify build
ls -la dist/backend/src/index.js
# Should show compiled JavaScript file
```

### Step 3: Initialize Database

```bash
# Run migrations
npm run db:migrate

# Expected output:
# ✨ Database migration completed successfully!
# 5 tables verified.

# Verify database created
ls -la data/signals.db

# Check database health
sqlite3 data/signals.db "SELECT COUNT(*) FROM signals;"
# Should return: 0 (empty, ready for data)
```

### Step 4: Setup Process Manager (pm2)

**Install pm2 globally:**
```bash
npm install -g pm2

# Verify
pm2 --version
# Should be 5.0+
```

**Create ecosystem configuration:**

File: `ecosystem.config.cjs` (already created)

```javascript
module.exports = {
  apps: [{
    name: 'turtle-trading-signals',
    script: 'dist/backend/src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      // ... other env vars
    },
    autorestart: true,           // Auto-restart on crash
    max_memory_restart: '500M',  // Restart if >500MB memory
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
```

**Start with pm2:**
```bash
# Start the application
pm2 start ecosystem.config.cjs --env production

# Save process list
pm2 save

# Enable startup on boot
pm2 startup
pm2 save

# Verify running
pm2 list
# Should show: turtle-trading-signals | online
```

### Step 5: Network Configuration

**Verify Server Binding:**
```bash
# Check that server listens on all interfaces
lsof -i :3001

# Should show:
# COMMAND  PID  USER  FD  TYPE  DEVICE SIZE/OFF NODE NAME
# node    1234 user  24u IPv6    ...   0t0  TCP  *:3001 (LISTEN)

# The * indicates all interfaces (0.0.0.0)
```

**Configure Firewall (if needed):**
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If enabled, add Node to whitelist
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node --unblock

# Or disable firewall if on trusted LAN
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

**Test Network Access:**
```bash
# From Mac mini
curl http://localhost:3001/api/health

# From another machine on LAN
curl http://192.168.1.51:3001/api/health

# Both should return: {"success":true,"data":{"status":"ok",...}}
```

### Step 6: Verify Installation

```bash
# 1. Check process status
pm2 list

# 2. Test local API
curl http://localhost:3001/api/health

# 3. Test network API
curl http://192.168.1.51:3001/api/health

# 4. Check logs
pm2 logs turtle-trading-signals --lines 30

# 5. Test database
sqlite3 data/signals.db ".tables"
# Should show: portfolio_positions price_cache scan_history signals trades

# 6. Test web interface
open http://localhost:3001
# Dashboard should load
```

---

## Configuration Options

### Server Settings

| Setting | Default | Options | Notes |
|---------|---------|---------|-------|
| NODE_ENV | production | production/development | Always "production" in deployment |
| PORT | 3001 | 1024-65535 | Change if port conflicts |
| LOG_LEVEL | info | debug/info/warn/error | Use info for normal ops |

### Trading Settings

| Setting | Default | Options | Notes |
|---------|---------|---------|-------|
| RUSSELL_THRESHOLD | 2000 | 1-3000 | Russell 2000 = 2000 |
| MIN_VOLUME_FILTER | 100000 | 0-10M | Filters low-liquidity stocks |
| LIQUIDITY_FILTER | true | true/false | Enable liquidity checks |
| TIMEOUT_MINUTES | 5 | 1-30 | Fetch timeout in minutes |

### Scheduler Settings

| Setting | Default | Format | Example |
|---------|---------|--------|---------|
| SCAN_TIME | 16:00 | HH:MM (24h) | 16:00 (4 PM ET) |
| SCAN_TIMEZONE | America/New_York | TZ database | America/Chicago, UTC, etc. |

### Advanced Settings

```env
# Enable data caching (improves performance)
CACHE_DURATION=3600              # Cache for 1 hour

# Max concurrent API requests
MAX_CONCURRENT_REQUESTS=5

# Enable detailed logging
DEBUG=turtle-trading:*           # Detailed logging

# Custom database path (if not ./data)
DB_PATH=/var/lib/turtle-trading/signals.db
```

---

## Auto-Start Configuration

### Option 1: macOS launchd (Recommended)

**Setup:**
```bash
# Copy plist to LaunchAgents
cp /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy/com.turtle-trading.plist \
   ~/Library/LaunchAgents/com.turtle-trading.signals.plist

# Load service
launchctl load ~/Library/LaunchAgents/com.turtle-trading.signals.plist

# Verify
launchctl list | grep turtle
# Should show: com.turtle-trading.signals
```

**The plist file:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.turtle-trading.signals</string>
  <key>Program</key>
  <string>/usr/local/bin/pm2</string>
  <key>ProgramArguments</key>
  <array>
    <string>start</string>
    <string>/Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy/ecosystem.config.cjs</string>
    <string>--env</string>
    <string>production</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy</string>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
```

**Disable later:**
```bash
launchctl unload ~/Library/LaunchAgents/com.turtle-trading.signals.plist
rm ~/Library/LaunchAgents/com.turtle-trading.signals.plist
```

### Option 2: pm2 Startup

```bash
# Enable auto-start (creates launchd daemon)
pm2 startup
pm2 save

# Disable
pm2 unstartup
```

---

## Database Backup Strategy

### Daily Backup Script

Create `backup-database.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy/backups"
DB_FILE="/Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy/data/signals.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
cp "$DB_FILE" "$BACKUP_DIR/signals.db.backup.$TIMESTAMP"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.backup.*" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/signals.db.backup.$TIMESTAMP"
```

**Setup daily backup via launchd:**

Create `~/Library/LaunchAgents/com.turtle-trading.backup.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.turtle-trading.backup</string>
  <key>Program</key>
  <string>/path/to/backup-database.sh</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>2</integer>      <!-- 2 AM daily -->
    <key>Minute</key>
    <integer>0</integer>
  </dict>
</dict>
</plist>
```

### Manual Backup
```bash
# Create backup
cp data/signals.db data/signals.db.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh data/signals.db*

# Restore from backup
cp data/signals.db.backup.20260206_020000 data/signals.db
pm2 restart turtle-trading-signals
```

---

## Monitoring & Alerting

### Real-time Monitoring

```bash
# Watch process continuously
pm2 monit

# Check status periodically
while true; do
  echo "$(date): $(pm2 list | grep turtle-trading-signals)"
  sleep 300
done
```

### Setup Monitoring Dashboard

```bash
# Enable pm2 web dashboard (optional)
pm2 web

# Access at: http://localhost:9615
```

### Log Monitoring

```bash
# Watch logs in real-time
pm2 logs turtle-trading-signals

# Email log errors (requires mail utility)
pm2 logs turtle-trading-signals --err | grep -i error | mail -s "Server Error" admin@example.com
```

---

## Performance Tuning

### Memory Optimization
```env
# If running on low-memory system
max_memory_restart=300M    # Restart at 300MB instead of 500MB

# If running on high-memory system
max_memory_restart=1G      # Allow up to 1GB before restart
```

### Database Optimization
```bash
# Run periodic database maintenance
sqlite3 data/signals.db "VACUUM;"         # Optimize storage
sqlite3 data/signals.db "ANALYZE;"        # Update statistics
sqlite3 data/signals.db "PRAGMA optimize;" # Full optimization
```

### Network Optimization
```bash
# Increase open file limit (for many connections)
ulimit -n 4096

# Verify
ulimit -a
```

---

## Security Considerations

### For Local Network Only (Current Setup)
```
✅ No external exposure
✅ No HTTPS required (local only)
✅ No authentication required (internal network)
```

### If Exposing to Internet (Future)
```
⚠️ MUST setup HTTPS (Let's Encrypt + Caddy/nginx)
⚠️ MUST add authentication/authorization
⚠️ MUST use firewall rules
⚠️ MUST setup rate limiting
⚠️ MUST sanitize all inputs
```

### Current Best Practices
```bash
# 1. Keep node/npm updated
npm update -g npm

# 2. Update dependencies
npm update

# 3. Check for vulnerabilities
npm audit
npm audit fix

# 4. Restrict file permissions
chmod 700 data/
chmod 700 logs/
chmod 600 .env.production

# 5. Keep logs on separate partition if possible
# Already configured at ./logs/
```

---

## Troubleshooting Deployment

### Issue: npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install

# If still fails:
rm -rf node_modules package-lock.json
npm install
```

### Issue: Build fails

```bash
# Check TypeScript errors
npm run build

# Update TypeScript
npm install -D typescript@latest

# Clear and rebuild
rm -rf dist/
npm run build
```

### Issue: Database migration fails

```bash
# Check database permissions
ls -la data/
chmod 755 data/

# Reinitialize
rm data/signals.db
npm run db:migrate

# Verify
sqlite3 data/signals.db ".tables"
```

### Issue: Port already in use

```bash
# Find process using port 3001
lsof -i :3001

# Kill if needed
kill -9 <PID>

# Or change port in .env.production
# Edit: PORT=3002
npm run build
pm2 restart turtle-trading-signals
```

---

## Deployment Checklist

- [ ] Node.js v18+ installed
- [ ] npm v9+ installed
- [ ] pm2 installed globally
- [ ] Project code available at `/Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy`
- [ ] `.env.production` configured with correct settings
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed successfully
- [ ] `npm run db:migrate` completed successfully
- [ ] `pm2 start ecosystem.config.cjs --env production` running
- [ ] Local API test passes: `curl http://localhost:3001/api/health`
- [ ] Network API test passes: `curl http://192.168.1.51:3001/api/health`
- [ ] Web dashboard loads: `http://192.168.1.51:3001`
- [ ] Logs being written: `pm2 logs turtle-trading-signals`
- [ ] Auto-start configured: `pm2 startup && pm2 save`
- [ ] Backups configured
- [ ] Monitoring setup

---

## Post-Deployment

### First Week
- Monitor logs daily: `pm2 logs turtle-trading-signals`
- Check process status: `pm2 list`
- Verify daily scan runs at scheduled time
- Check memory usage: `pm2 info turtle-trading-signals`

### Weekly
- Backup database
- Review error logs
- Check disk space: `df -h`
- Verify network access from multiple devices

### Monthly
- Clean old logs
- Database optimization: `sqlite3 data/signals.db "VACUUM;"`
- Update npm dependencies: `npm update`
- Review performance metrics

### Quarterly
- Full security audit
- Backup verification (restore test)
- Documentation update
- Major version updates if available

---

## Support & Documentation

- **Startup Guide:** See `STARTUP.md`
- **Network Setup:** See `NETWORK_SETUP.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`
- **API Documentation:** See `API.md`
- **Architecture:** See `ARCHITECTURE.md`

---

## Version Information

- **Deployment Date:** 2026-02-06
- **Node.js:** v24.4.1
- **npm:** v11+
- **pm2:** v5.0+
- **Express:** v4.18+
- **Vue:** v3.3+
- **SQLite:** v3.44+

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** 2026-02-06
