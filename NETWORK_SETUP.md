# Network Setup Guide

**Status:** ✅ COMPLETE  
**Mac mini IP:** 192.168.1.51  
**Port:** 3001  

---

## Quick Start - Network Access

From any machine on your LAN:

```bash
# Test the API
curl http://192.168.1.51:3001/api/health

# Open in browser
open http://192.168.1.51:3001
# or navigate to: http://192.168.1.51:3001
```

---

## How It Works

### Server Binding
The Express.js server is configured to bind to `0.0.0.0:3001`:

```typescript
// backend/src/index.ts
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
```

This means the server listens on **all available network interfaces**:
- `localhost:3001` (loopback, local machine only)
- `127.0.0.1:3001` (loopback, local machine only)
- `192.168.1.51:3001` (local network, from any machine)
- Any other IP address the Mac mini has

### Frontend Configuration
The Vue frontend is served as static files from the Express server:

```typescript
// Serve frontend files
const frontendPath = path.join(path.dirname(__dirname), '...', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback for Vue Router
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
```

---

## Network Architecture

```
┌─────────────────────────────────────────┐
│        Your Local Network               │
│        192.168.1.0/24                   │
│                                         │
│    ┌──────────────────────────────┐    │
│    │   Mac mini (192.168.1.51)    │    │
│    │                              │    │
│    │  ┌──────────────────────┐   │    │
│    │  │  Express Server      │   │    │
│    │  │  Port 3001           │   │    │
│    │  │  Binding: 0.0.0.0    │   │    │
│    │  │                      │   │    │
│    │  │  Frontend (Vue)      │   │    │
│    │  │  Backend (API)       │   │    │
│    │  │  Database (SQLite)   │   │    │
│    │  └──────────────────────┘   │    │
│    │                              │    │
│    └──────────────────────────────┘    │
│              ▲         ▲                │
│              │         │                │
│    ┌─────────┘         └──────────┐   │
│    │                              │    │
│  Other machines on LAN          │    │
│  (phones, laptops, tablets)     │    │
│                                  │    │
└─────────────────────────────────────────┘
```

---

## Testing Network Connectivity

### 1. From Mac mini (local testing)
```bash
# Test API locally
curl http://localhost:3001/api/health

# Test network IP locally
curl http://192.168.1.51:3001/api/health

# Open dashboard
open http://localhost:3001
```

### 2. From Another Machine on LAN

**From macOS/Linux:**
```bash
# Replace 192.168.1.51 with Mac mini's actual IP
curl http://192.168.1.51:3001/api/health

# Open in browser
open http://192.168.1.51:3001
```

**From Windows:**
```cmd
# In PowerShell or Command Prompt
curl http://192.168.1.51:3001/api/health

# Or open in browser: http://192.168.1.51:3001
```

**From iPhone/iPad (Safari):**
```
1. Open Safari
2. Navigate to: http://192.168.1.51:3001
3. Dashboard should load
```

### 3. Check Your Mac mini's IP Address

If you don't know your Mac mini's IP:

```bash
# Method 1: Using ifconfig
ifconfig | grep "inet " | grep -v 127.0.0.1

# Method 2: Using hostname
hostname -I

# Method 3: System Preferences
# System Settings → Network → Current Network → IP Address

# Method 4: Router configuration page
# Log into your router and look for connected devices
```

---

## Firewall Configuration

### macOS Firewall

Most macOS setups allow local network traffic by default. If you have issues:

#### Check Firewall Status
```bash
# Check if firewall is enabled
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Output: Firewall is on.  -or-  Firewall is off.
```

#### Allow Node.js in Firewall
```bash
# Check if Node is in allow list
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps | grep node

# Add Node.js to firewall whitelist
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node --unblock

# Or for pm2's Node wrapper
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/pm2 --unblock
```

#### Disable Firewall (if on trusted network)
```bash
# Turn off firewall completely (requires password)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off

# Re-enable later
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on
```

### Port Forwarding (Router)

If you want access from outside your local network:

1. **Log into your router** (typically 192.168.1.1 or 192.168.0.1)
2. **Find Port Forwarding settings**
3. **Create a rule:**
   - External Port: 3001 (or different if you prefer)
   - Internal IP: 192.168.1.51
   - Internal Port: 3001
   - Protocol: TCP

4. **Note your external IP:** Find your public IP at `whatsmyip.com`

5. **Access externally:** `http://YOUR_PUBLIC_IP:3001`

⚠️ **Security Warning:** Opening to the internet requires HTTPS/authentication. For now, keep it on local network only.

---

## Verifying Network Binding

### Check Port Listening
```bash
# See what process is listening on port 3001
lsof -i :3001

# Output should show:
# COMMAND   PID       USER   FD  TYPE             DEVICE SIZE/OFF NODE NAME
# node     1234  ashisheth   24u  IPv6 0x1234567...      0t0  TCP  *:3001 (LISTEN)
```

### Check Express Server Logs
```bash
# View server startup logs
pm2 logs turtle-trading-signals | grep "Server:"

# Output should show:
# ║  Server: http://0.0.0.0:3001                            ║
# ║  Access: http://192.168.1.51:3001                       ║
```

---

## Troubleshooting Network Access

### Problem: Can't access from network machine

**Solution 1: Verify Mac mini is on network**
```bash
# From the other machine, ping the Mac mini
ping 192.168.1.51

# Should respond (not timeout)
```

**Solution 2: Check firewall on Mac mini**
```bash
# View firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If enabled, add Node to whitelist
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node --unblock
```

**Solution 3: Restart server**
```bash
pm2 restart turtle-trading-signals
pm2 logs turtle-trading-signals
```

**Solution 4: Check if port is actually in use**
```bash
# See what's listening
lsof -i :3001

# If something else is using port 3001, change the port in .env.production
# Edit .env.production, change PORT=3002
# Then: npm run build && pm2 restart turtle-trading-signals
```

### Problem: Slow network connection

**Check server performance:**
```bash
# View CPU and memory usage
pm2 info turtle-trading-signals

# Check response time
time curl http://192.168.1.51:3001/api/health
```

**Improve performance:**
1. Restart server: `pm2 restart turtle-trading-signals`
2. Clear browser cache
3. Check network WiFi signal strength
4. Try wired Ethernet on Mac mini if possible

### Problem: Dashboard won't load

**Check API endpoints:**
```bash
# Test API from network machine
curl http://192.168.1.51:3001/api/health
curl http://192.168.1.51:3001/api/signals

# Should return JSON responses
```

**Check browser console:**
1. Open http://192.168.1.51:3001 in browser
2. Press F12 to open Developer Tools
3. Look for errors in Console tab
4. Check Network tab for failed requests

---

## DNS and Naming

### Access via Hostname

If you want to use a hostname instead of IP:

**Option 1: mDNS (Bonjour) - Works automatically on macOS**
```bash
# From any Mac on the network
open http://macmini.local:3001

# Find the exact mDNS name
dns-sd -B _http._tcp local.
```

**Option 2: Edit hosts file**

On each machine that needs to access:
- **macOS/Linux:** Edit `/etc/hosts`
- **Windows:** Edit `C:\Windows\System32\drivers\etc\hosts`

Add line:
```
192.168.1.51    turtle-trading.local
```

Then access:
```
http://turtle-trading.local:3001
```

---

## Network Bandwidth Usage

The application is lightweight and uses minimal bandwidth:

- **Initial load:** ~500KB (Vue app bundle)
- **API calls:** ~1-5KB per request
- **Data polling:** ~10KB/minute (if auto-refresh enabled)
- **WebSocket (if added):** ~100 bytes/second

No streaming or large file transfers, so works well even on slower WiFi.

---

## Remote Access (Over Internet)

For access outside your local network:

### Option 1: Simple Port Forward (Not Recommended)
```bash
# In router, forward external port to 192.168.1.51:3001
# Then access: http://YOUR_PUBLIC_IP:3001
# ⚠️ Not secure without HTTPS/authentication
```

### Option 2: SSH Tunnel
```bash
# From remote machine
ssh -L 3001:192.168.1.51:3001 user@mac-mini

# Then access locally on remote machine
open http://localhost:3001
```

### Option 3: VPN
```bash
# Set up VPN on Mac mini (e.g., WireGuard, OpenVPN)
# Connect from remote machine to VPN
# Then access: http://192.168.1.51:3001
# ✅ Most secure option
```

### Option 4: HTTPS Reverse Proxy
```bash
# Use nginx or Caddy on Mac mini with SSL certificates
# More complex but production-ready
```

---

## Performance Optimization

### For Network Speed

**1. Enable compression:**
Already enabled in Express (via gzip middleware)

**2. Cache frontend assets:**
```bash
# Browser will cache /assets/* files
# Reduces bandwidth for subsequent visits
```

**3. Use CDN (optional):**
For very slow networks, serve frontend from CDN instead.

**4. Database optimization:**
```bash
# Indexes are created automatically
# No additional configuration needed
```

---

## Mobile Access

### From iPhone/iPad

1. **Find Mac mini IP:**
   - On Mac mini: `ifconfig | grep "inet "`
   - Or check router admin panel

2. **Open Safari on iPhone/iPad**

3. **Navigate to:** `http://192.168.1.51:3001`

4. **Pin to Home Screen:**
   - Tap Share button
   - Tap "Add to Home Screen"
   - Now appears as app icon

### From Android

1. **Open Chrome or Firefox**

2. **Navigate to:** `http://192.168.1.51:3001`

3. **Add to Home Screen:**
   - Tap menu (⋮)
   - Tap "Install app" or "Add to Home screen"

---

## Testing Checklist

- [ ] Server starts with: `./start.sh`
- [ ] Local access works: `curl http://localhost:3001/api/health`
- [ ] Network access works: `curl http://192.168.1.51:3001/api/health`
- [ ] Dashboard loads in browser: `http://192.168.1.51:3001`
- [ ] API endpoints respond: `curl http://192.168.1.51:3001/api/signals`
- [ ] Can access from another machine on LAN
- [ ] Can access from phone/tablet
- [ ] Server restarts on crash (wait 30s)
- [ ] Logs are being written: `pm2 logs turtle-trading-signals`
- [ ] Database is persisting data

---

## Support

For network issues:
1. Check server is running: `pm2 list`
2. Check logs: `pm2 logs turtle-trading-signals`
3. Check firewall: `sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`
4. Test local first: `curl http://localhost:3001/api/health`
5. Check IP address: `ifconfig | grep "inet "`

---

**Network Status:** ✅ OPERATIONAL  
**Last Updated:** 2026-02-06
