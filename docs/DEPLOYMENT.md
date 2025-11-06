# Server Monitoring System - Deployment Guide

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Server A      │───┐
│   (GPU Node)    │   │
└─────────────────┘   │
                      │  POST /api/report
┌─────────────────┐   │  (every 1 min via cron)
│   Server B      │───┤
│   (Web Node)    │   │
└─────────────────┘   │
                      ▼
┌─────────────────┐  ┌─────────────────┐
│   Server C      │─▶│   Backend API   │
│   (DB Node)     │  │   (FastAPI)     │
└─────────────────┘  │   Port 8000     │
                     └────────┬────────┘
                              │
                              │ GET /api/status
                              │ (polling every 5s)
                              ▼
                     ┌─────────────────┐
                     │   Dashboard     │
                     │   (React SPA)   │
                     │   Port 8080     │
                     └─────────────────┘
```

---

## 📦 Part 1: Backend Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11+
sudo apt install python3 python3-pip python3-venv -y

# Navigate to backend directory
cd backend
```

### Step 2: Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Step 3: Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Generate secure API key
openssl rand -hex 32

# Edit .env file and update API_KEY
nano .env
```

**Edit `.env`:**
```bash
API_KEY=<paste-your-generated-key-here>
HOST=0.0.0.0
PORT=8000
STALE_THRESHOLD_SECONDS=300
```

### Step 4: Test Backend

```bash
# Run backend manually
python main.py

# Or use uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000

# In another terminal, test health endpoint
curl http://localhost:8000/
```

Expected output:
```json
{
  "service": "Server Monitoring API",
  "status": "online",
  "servers_monitored": 0,
  "timestamp": "2025-11-06T14:30:00.123456"
}
```

### Step 5: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/monitoring-backend.service
```

**Paste this configuration:**
```ini
[Unit]
Description=Server Monitoring Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/server-dashboard/backend
Environment="PATH=/path/to/server-dashboard/backend/venv/bin"
ExecStart=/path/to/server-dashboard/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Update paths** in the service file, then:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable monitoring-backend

# Start service
sudo systemctl start monitoring-backend

# Check status
sudo systemctl status monitoring-backend

# View logs
sudo journalctl -u monitoring-backend -f
```

### Step 6: Configure Firewall

```bash
# Allow port 8000
sudo ufw allow 8000/tcp

# Or restrict to specific subnet
sudo ufw allow from 10.0.0.0/24 to any port 8000
```

---

## 🤖 Part 2: Agent Deployment (On Each Monitored Server)

### Step 1: Install Dependencies

```bash
# On each monitored server
sudo apt update
sudo apt install curl jq -y

# For GPU monitoring, ensure nvidia-smi is available
nvidia-smi --version
```

### Step 2: Deploy Agent Script

```bash
# Create directory
sudo mkdir -p /opt/monitoring
cd /opt/monitoring

# Copy agent script from repository
sudo cp /path/to/server-dashboard/agent/monitoring-agent.sh /opt/monitoring/agent.sh

# Make executable
sudo chmod +x agent.sh
```

### Step 3: Configure Agent

```bash
# Copy example config
sudo cp /path/to/server-dashboard/agent/config.env.example /opt/monitoring/config.env

# Edit configuration
sudo nano /opt/monitoring/config.env
```

**Update `config.env`:**
```bash
# Backend API
API_ENDPOINT="http://192.168.1.100:8000/api/report"
API_KEY="<paste-api-key-from-backend>"

# Server identification (CHANGE FOR EACH SERVER!)
SERVER_ALIAS="gpu-01"
MACHINE_TYPE="host"
GROUP="production"
LABELS="gpu,nvidia,cuda-12.1,rtx3090"

# Debug (optional)
DEBUG=0
```

### Step 4: Test Agent Manually

```bash
# Load config and run agent
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh
```

You should see:
1. JSON payload printed (if DEBUG=1)
2. Message: `✅ Report sent successfully`

### Step 5: Add to Crontab

```bash
# Edit root crontab
sudo crontab -e

# Add this line (runs every minute):
* * * * * cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh >> /var/log/monitoring-agent.log 2>&1
```

### Step 6: Verify Cron Job

```bash
# Wait 1-2 minutes, then check logs
sudo tail -f /var/log/monitoring-agent.log

# Should see entries like:
# [2025-11-06 14:30:01] Starting monitoring agent for gpu-01
# [2025-11-06 14:30:02] ✅ Report sent successfully
```

### Step 7: Verify Backend Received Data

```bash
# Check backend
curl http://your-backend-ip:8000/api/status

# Should return server data
```

---

## 🎨 Part 3: Dashboard Deployment

### Step 1: Update API Endpoint

Edit `src/lib/api.ts`:

```typescript
// Line 3: Change from
const API_BASE = "/api";

// To your backend URL
const API_BASE = "http://your-backend-ip:8000/api";

// Or use environment variable
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
```

If using environment variable, create `.env` in dashboard root:
```bash
VITE_API_BASE=http://your-backend-ip:8000/api
```

### Step 2: Build Dashboard

```bash
# In dashboard root directory
npm install

# Build for production
npm run build

# Build output in dist/ folder
ls -la dist/
```

### Step 3: Deploy Options

#### Option A: Nginx (Recommended)

```bash
# Install nginx
sudo apt install nginx -y

# Copy build files
sudo mkdir -p /var/www/monitoring
sudo cp -r dist/* /var/www/monitoring/

# Create nginx config
sudo nano /etc/nginx/sites-available/monitoring
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name monitoring.yourdomain.com;
    root /var/www/monitoring;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend (optional if using direct URL)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/monitoring /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

#### Option B: Simple Python Server (Development)

```bash
cd dist
python3 -m http.server 8080
```

#### Option C: Vercel/Netlify (Cloud Hosting)

```bash
# Install Vercel CLI
npm install -g vercel
vercel --prod

# Or Netlify
npm install -g netlify-cli
netlify deploy --prod
```

---

## 🔧 Configuration Examples

### Example 1: GPU Server

**Agent config (`/opt/monitoring/config.env`):**
```bash
API_ENDPOINT="http://192.168.1.100:8000/api/report"
API_KEY="abc123xyz789..."
SERVER_ALIAS="gpu-01"
MACHINE_TYPE="host"
GROUP="production"
LABELS="gpu,nvidia,cuda-12.1,rtx3090,ml"
```

### Example 2: Web Server with Docker

```bash
API_ENDPOINT="http://192.168.1.100:8000/api/report"
API_KEY="abc123xyz789..."
SERVER_ALIAS="web-01"
MACHINE_TYPE="host"
GROUP="production"
LABELS="web,nginx,docker"
```

### Example 3: Database Server

```bash
API_ENDPOINT="http://192.168.1.100:8000/api/report"
API_KEY="abc123xyz789..."
SERVER_ALIAS="db-01"
MACHINE_TYPE="host"
GROUP="production"
LABELS="database,postgresql"
```

---

## 🧪 Testing & Verification

### 1. Test Backend Health

```bash
curl http://your-backend-ip:8000/

# Expected: {"service":"Server Monitoring API","status":"online",...}
```

### 2. Test Agent Script

```bash
# On monitored server
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh

# Check if backend received it
curl http://your-backend-ip:8000/api/status | jq .
```

### 3. Test Dashboard

Open browser: `http://your-dashboard-url`

You should see:
- ✅ Server cards with real-time metrics
- ✅ GPU information (if servers have GPUs)
- ✅ Container information (if running Docker)
- ✅ Auto-refresh every 5 seconds

---

## 📊 Monitoring & Logs

### Backend Logs

```bash
# View live logs
sudo journalctl -u monitoring-backend -f

# View last 100 lines
sudo journalctl -u monitoring-backend -n 100

# View errors only
sudo journalctl -u monitoring-backend -p err
```

### Agent Logs

```bash
# View live logs
sudo tail -f /var/log/monitoring-agent.log

# View errors only
grep "❌" /var/log/monitoring-agent.log

# Count successful reports
grep "✅" /var/log/monitoring-agent.log | wc -l
```

### Check Cron Execution

```bash
# View cron logs
sudo grep CRON /var/log/syslog | tail -20
```

---

## 🐛 Troubleshooting

### Problem: Agent not sending data

**Check backend reachability:**
```bash
curl -v http://your-backend-ip:8000/
```

**Test with manual API call:**
```bash
curl -X POST http://your-backend-ip:8000/api/report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{"server_alias":"test","hostname":"test","ip":"1.2.3.4","uptime_seconds":100,"cpu":{"percent":10,"loadavg":{"1m":1,"5m":1,"15m":1}},"memory":{"total_gb":16,"used_gb":8,"percent":50},"disks":[],"users":[],"gpus":[],"containers":[],"timestamp":"2025-11-06T00:00:00Z"}'
```

### Problem: Backend not starting

```bash
# Check logs
sudo journalctl -u monitoring-backend -xe

# Test manually
cd /path/to/backend
source venv/bin/activate
python main.py
```

### Problem: Dashboard shows "Using mock data"

1. Check browser console (F12) for errors
2. Verify `API_BASE` in `src/lib/api.ts`
3. Check CORS errors - ensure backend allows your dashboard domain
4. Verify backend is accessible: `curl http://backend-ip:8000/api/status`

### Problem: Cron job not running

```bash
# Check if cron service is running
sudo systemctl status cron

# Check crontab
sudo crontab -l

# Test script manually
cd /opt/monitoring && source config.env && ./agent.sh
```

---

## 🔒 Security Recommendations

### 1. Use Strong API Keys

```bash
# Generate secure key
openssl rand -hex 32
```

### 2. Enable HTTPS

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d monitoring.yourdomain.com
```

### 3. Restrict Backend Access

```bash
# Firewall: Only allow from known IPs
sudo ufw allow from 10.0.0.0/24 to any port 8000
```

### 4. Add Authentication to Dashboard

Consider adding login system (OAuth, Basic Auth via Nginx, etc.)

---

## 📈 Scaling Tips

1. **Use PostgreSQL** instead of in-memory storage for persistence
2. **Add Redis** for caching frequently accessed data
3. **Use Nginx** as reverse proxy with load balancing
4. **Enable compression** (Gzip/Brotli)
5. **Add CDN** for static assets (Cloudflare)
6. **Use Docker** for easier deployment and scaling

---

## ✅ Quick Start Checklist

### Backend Server:
- [ ] Install Python 3.11+
- [ ] Create virtual environment
- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Create `.env` with secure API key
- [ ] Test backend (`python main.py`)
- [ ] Create systemd service
- [ ] Start service and enable on boot
- [ ] Configure firewall (port 8000)
- [ ] Verify health endpoint works

### Each Monitored Server:
- [ ] Install dependencies (`curl`, `jq`)
- [ ] Copy agent script to `/opt/monitoring/agent.sh`
- [ ] Make script executable (`chmod +x`)
- [ ] Create `config.env` with API key and server info
- [ ] Test agent manually (`DEBUG=1 ./agent.sh`)
- [ ] Add to crontab (`sudo crontab -e`)
- [ ] Wait 1 minute and check logs
- [ ] Verify backend received data

### Dashboard:
- [ ] Update `src/lib/api.ts` with backend URL
- [ ] Build production bundle (`npm run build`)
- [ ] Deploy to web server (Nginx/Vercel/Netlify)
- [ ] Open in browser
- [ ] Verify real-time updates working
- [ ] Check all metrics display correctly

---

## 🎉 Done!

Your server monitoring system is now deployed and running!

**Access your dashboard** at: `http://your-dashboard-url`

**Monitor backend status**: `http://your-backend-ip:8000/api/status`
