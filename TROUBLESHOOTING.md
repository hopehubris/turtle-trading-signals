# Troubleshooting Guide

**Status:** ✅ PRODUCTION DEPLOYMENT  
**System:** Turtle Trading Signals on Mac mini  

---

## Quick Diagnostics

### Is the server running?
```bash
pm2 list
```

Should show:
```
│ 0  │ turtle-trading-signals    │ online    │
```

### Are ports bound correctly?
```bash
lsof -i :3001
```

Should show Node listening on all interfaces.

### What's in the logs?
```bash
pm2 logs turtle-trading-signals --lines 50
```

---

## Common Issues & Solutions

### Issue 1: Server Won't Start

#### Error: "Port 3001 is already in use"

**Diagnosis:**
```bash
# Check what's using port 3001
lsof -i :3001

# You should see Node process
# If something else is using it:
kill -9 <PID>
```

**Solution:**
```bash
# Option A: Kill process and restart
pm2 restart turtle-trading-signals

# Option B: Change port in .env.production
# Edit: .env.production
# Change: PORT=3002
# Then rebuild and restart
npm run build
pm2 restart turtle-trading-signals
```

#### Error: "Cannot find module"

**Diagnosis:**
```bash
npm list
ls -la dist/backend/src/
```

**Solution:**
```bash
# Reinstall dependencies
npm install

# Rebuild TypeScript
npm run build

# Restart
pm2 restart turtle-trading-signals
```

#### Error: "Database locked" or "SQLITE_CANTOPEN"

**Diagnosis:**
```bash
ls -la data/signals.db
pm2 logs turtle-trading-signals --err
```

**Solution:**
```bash
# Check if file exists
ls -la data/signals.db

# If missing, reinitialize
npm run db:migrate

# Verify the database
sqlite3 data/signals.db "SELECT COUNT(*) FROM signals;"

# Restart server
pm2 restart turtle-trading-signals
```

#### Error: "Permission denied"

**Diagnosis:**
```bash
# Check file permissions
ls -la data/
ls -la dist/
```

**Solution:**
```bash
# Fix permissions
chmod -R 755 data/
chmod -R 755 dist/

# Or as last resort
sudo chown -R $USER:$GROUP /Users/ashisheth/.openclaw/workspace/turtle-trading-signals-AdmiralMondy
```

---

### Issue 2: Can't Access from Network

#### Local access works, but network access fails

**Diagnosis:**
```bash
# Test local
curl http://localhost:3001/api/health

# Test network IP
curl http://192.168.1.51:3001/api/health  # Hangs or times out
```

**Solution 1: Check server binding**
```bash
# Verify server is bound to 0.0.0.0
lsof -i :3001

# Should show: *:3001 or 0.0.0.0:3001
# If shows 127.0.0.1:3001, it's only listening locally

# Check backend/src/index.ts - line should be:
# app.listen(PORT, '0.0.0.0', () => {
```

**Solution 2: Check firewall**
```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If "Firewall is on", add Node to whitelist
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node --unblock

# Or disable firewall if on trusted network
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

**Solution 3: Check network connectivity**
```bash
# From the remote machine, ping Mac mini
ping 192.168.1.51

# If times out, Mac mini is not reachable

# Check Mac mini IP
ifconfig | grep "inet "

# Make sure you're using the correct IP
```

**Solution 4: Verify IP is correct**
```bash
# From Mac mini
hostname -I

# Use the IP shown (e.g., 192.168.1.51)
# From another machine: curl http://192.168.1.51:3001/api/health
```

---

### Issue 3: Dashboard Won't Load

#### Browser shows blank page or 404

**Diagnosis:**
```bash
# Check if frontend files exist
ls -la frontend/dist/

# Check server log
pm2 logs turtle-trading-signals | tail -20
```

**Solution:**
```bash
# Rebuild frontend
cd frontend
npm run build
cd ..

# Rebuild backend
npm run build

# Restart
pm2 restart turtle-trading-signals

# Test
curl http://localhost:3001/
```

#### Page loads but showing errors in console

**Diagnosis:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Go to Network tab and check failed requests

**Common errors:**

**Error: "GET /api/signals failed (404)"**
```bash
# API endpoint not working
pm2 logs turtle-trading-signals

# Check if backend compiled correctly
ls -la dist/backend/src/routes/
```

Solution:
```bash
npm run build
pm2 restart turtle-trading-signals
```

**Error: "Cannot GET /assets/..."**
```bash
# Frontend files not found
ls -la frontend/dist/assets/
```

Solution:
```bash
cd frontend && npm run build && cd ..
npm run build
pm2 restart turtle-trading-signals
```

**Error: "CORS blocked origin"**
```bash
# CORS is too restrictive (shouldn't happen with current config)
pm2 logs turtle-trading-signals
```

Solution: Check backend/src/index.ts has `app.use(cors())` near the top.

---

### Issue 4: Database Errors

#### Error: "SQLITE_CORRUPT" or "database disk image is malformed"

**Diagnosis:**
```bash
sqlite3 data/signals.db "PRAGMA integrity_check;"
```

**Solution:**
```bash
# Backup current database
cp data/signals.db data/signals.db.corrupted

# Reset database
npm run db:reset

# Verify
sqlite3 data/signals.db "SELECT COUNT(*) FROM signals;"
```

#### Error: "SQLITE_READONLY"

**Diagnosis:**
```bash
ls -la data/signals.db
```

**Solution:**
```bash
# Fix permissions
chmod 644 data/signals.db

# Or
chmod -R 755 data/

# Restart
pm2 restart turtle-trading-signals
```

#### Database grew too large

**Diagnosis:**
```bash
du -h data/signals.db

# Check what's taking space
sqlite3 data/signals.db "
SELECT COUNT(*) as signals FROM signals;
SELECT COUNT(*) as trades FROM trades;
SELECT COUNT(*) as scans FROM scan_history;
"
```

**Solution:**
```bash
# Backup first
cp data/signals.db data/signals.db.backup

# Clean old data (e.g., scans older than 6 months)
sqlite3 data/signals.db "DELETE FROM scan_history WHERE created_at < datetime('now', '-6 months');"

# Vacuum to reclaim space
sqlite3 data/signals.db "VACUUM;"

# Check size reduction
du -h data/signals.db
```

---

### Issue 5: High Memory Usage

#### PM2 shows 200MB+ memory

**Diagnosis:**
```bash
pm2 info turtle-trading-signals

# Check memory trends
pm2 monit
```

**Solution:**

**Option 1: Restart server**
```bash
pm2 restart turtle-trading-signals

# This clears memory and starts fresh
```

**Option 2: Clean old data**
```bash
npm run db:reset
pm2 restart turtle-trading-signals
```

**Option 3: Increase memory limit**
```bash
# Edit ecosystem.config.cjs
# Change: max_memory_restart: '500M' to '1G'
pm2 restart turtle-trading-signals
```

**Option 4: Check for memory leaks**
```bash
# Watch memory over time
pm2 logs turtle-trading-signals | grep -E "(Memory|heap)"

# If memory keeps growing, there's a leak
# Contact development team
```

---

### Issue 6: Auto-Restart Not Working

#### Server crashes but doesn't auto-restart

**Diagnosis:**
```bash
pm2 list

# If status shows "stopped" instead of "online", auto-restart failed
```

**Solution:**
```bash
# Check logs for crash cause
pm2 logs turtle-trading-signals --err

# Ensure pm2 is configured correctly
cat ecosystem.config.cjs | grep autorestart

# Should show: autorestart: true

# Manually restart
pm2 start ecosystem.config.cjs

# Check status
pm2 list
```

#### Server crashes on startup

**Diagnosis:**
```bash
pm2 logs turtle-trading-signals
```

Look for errors like:
- "Cannot find module"
- "Database locked"
- "Permission denied"

**Solution:** Based on error shown, see relevant section above.

---

### Issue 7: Slow Performance

#### Dashboard is slow to load or respond

**Diagnosis:**
```bash
# Check server performance
pm2 info turtle-trading-signals

# Check response times
time curl http://localhost:3001/api/signals

# Should be <200ms
```

**Solution 1: Restart server**
```bash
pm2 restart turtle-trading-signals
```

**Solution 2: Check system resources**
```bash
# Check CPU and memory
top -l 1 | head -20

# If Mac mini is busy with other tasks, performance will suffer
```

**Solution 3: Reduce data volume**
```bash
# Clean old scan history
sqlite3 data/signals.db "DELETE FROM scan_history WHERE created_at < datetime('now', '-3 months');"

# Restart
pm2 restart turtle-trading-signals
```

**Solution 4: Check network**
```bash
# If accessing over network, test bandwidth
# From other machine
curl -o /dev/null -w "time: %{time_total}s\n" http://192.168.1.51:3001/api/health

# If >1s, network is slow
```

---

### Issue 8: Logging Issues

#### Logs not being written

**Diagnosis:**
```bash
# Check log directory
ls -la logs/

# Check if files exist
ls -la logs/pm2-*.log
```

**Solution:**
```bash
# Create logs directory if missing
mkdir -p logs

# Restart pm2
pm2 restart turtle-trading-signals

# Verify logs are written
tail -f logs/pm2-out.log
```

#### Logs file is too large

**Diagnosis:**
```bash
# Check log file size
du -h logs/pm2-*.log

# If >1GB, it's too large
```

**Solution:**
```bash
# Rotate logs manually
mv logs/pm2-out.log logs/pm2-out.$(date +%Y%m%d).log
mv logs/pm2-error.log logs/pm2-error.$(date +%Y%m%d).log

# pm2 will create new log files automatically

# Or use logrotate (Linux/Mac)
# Compress old logs
gzip logs/pm2-out.*.log

# Delete very old logs
find logs/ -name "*.log.gz" -mtime +30 -delete
```

---

## System Information

### Collect diagnostics

When contacting support, provide:

```bash
# Collect system info
echo "=== System Info ===" && \
uname -a && \
node --version && \
npm --version && \
pm2 --version && \
echo "" && \
echo "=== PM2 Status ===" && \
pm2 list && \
echo "" && \
echo "=== Server Logs ===" && \
pm2 logs turtle-trading-signals --lines 50 && \
echo "" && \
echo "=== Database ===" && \
sqlite3 data/signals.db "SELECT COUNT(*) FROM signals;" && \
echo "" && \
echo "=== Disk Space ===" && \
du -h data/ && \
echo "" && \
echo "=== Process Info ===" && \
pm2 info turtle-trading-signals
```

---

## Emergency Procedures

### Server won't stop crashing

```bash
# 1. Stop pm2 completely
pm2 stop turtle-trading-signals
pm2 delete turtle-trading-signals

# 2. Check what's wrong
cat logs/pm2-error.log | tail -50

# 3. If it's database issue
npm run db:reset

# 4. Rebuild everything
npm run build

# 5. Restart
pm2 start ecosystem.config.cjs --env production
```

### Corrupted database beyond repair

```bash
# 1. Backup the corrupted database
cp data/signals.db data/signals.db.corrupted.$(date +%Y%m%d)

# 2. Delete corrupted database
rm data/signals.db

# 3. Reinitialize database
npm run db:migrate

# 4. Restart server
pm2 restart turtle-trading-signals

# 5. Database will be empty but functional
```

### Complete reset

```bash
# Warning: This deletes all data and logs

# 1. Stop server
pm2 stop turtle-trading-signals
pm2 delete turtle-trading-signals

# 2. Remove all data
rm -rf data/
rm -rf logs/
rm -rf dist/

# 3. Rebuild from scratch
npm install
npm run build
npm run db:migrate

# 4. Restart
mkdir logs
pm2 start ecosystem.config.cjs --env production
```

---

## Getting Help

### Check Server Logs
```bash
pm2 logs turtle-trading-signals --err
```

### Test API
```bash
curl -v http://localhost:3001/api/health
```

### Check Database
```bash
sqlite3 data/signals.db ".schema"
sqlite3 data/signals.db "SELECT * FROM signals LIMIT 1;"
```

### Review Configuration
```bash
cat .env.production
cat ecosystem.config.cjs
```

### Check Build
```bash
ls -la dist/backend/src/index.js
npm list
```

---

## Performance Monitoring

### Watch process in real-time
```bash
pm2 monit
```

### View long-running processes
```bash
pm2 list --long
```

### Check resource usage over time
```bash
pm2 save
pm2 web  # Opens web dashboard on :9615

# Then visit: http://localhost:9615
```

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| EADDRINUSE | Port in use | `kill -9 <PID>` or change port |
| ENOENT | File not found | Run `npm run build` |
| EACCES | Permission denied | `chmod 755 <file>` |
| SQLITE_CANTOPEN | DB file missing | `npm run db:migrate` |
| SQLITE_READONLY | DB not writable | `chmod 644 data/signals.db` |
| ENOMEM | Out of memory | `pm2 restart` or increase RAM |
| ECONNREFUSED | Can't connect | Server not running |
| ETIMEDOUT | Connection timeout | Network unreachable |

---

**Last Updated:** 2026-02-06  
**Status:** ✅ PRODUCTION READY
