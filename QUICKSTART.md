# Quick Start Guide

Get your monitoring system running in 15 minutes!

## 📋 Prerequisites

- 1 server for backend (Python 3.11+)
- N servers to monitor (with bash, curl)
- Basic terminal/SSH access

---

## ⚡ 3-Step Setup

### Step 1: Start Backend (5 min)

On your backend server:

```bash
# Navigate to backend directory
cd backend

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Generate API key
openssl rand -hex 32

# Create .env file
cat > .env <<EOF
API_KEY=<paste-generated-key-here>
HOST=0.0.0.0
PORT=8000
STALE_THRESHOLD_SECONDS=300
EOF

# Start backend
python main.py
```

**✅ Test:** Open `http://your-backend-ip:8000/` - should see JSON response

---

### Step 2: Deploy Agents (5 min per server)

On each monitored server:

```bash
# Install dependencies
sudo apt install curl jq -y

# Create agent directory
sudo mkdir -p /opt/monitoring
cd /opt/monitoring

# Download agent script (copy from your repo)
# Or manually create it:
sudo nano agent.sh
# Paste content from agent/monitoring-agent.sh
sudo chmod +x agent.sh

# Create config
sudo nano config.env
```

**Paste this config:**

```bash
API_ENDPOINT="http://your-backend-ip:8000/api/report"
API_KEY="<paste-same-key-from-backend>"
SERVER_ALIAS="gpu-01"    # CHANGE THIS FOR EACH SERVER!
MACHINE_TYPE="host"
GROUP="production"
LABELS="gpu,cuda,ml"     # Optional tags
DEBUG=0
```

**Test agent:**

```bash
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh
```

Should see: `✅ Report sent successfully`

**Add to cron:**

```bash
sudo crontab -e
# Add this line:
* * * * * cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh >> /var/log/monitoring-agent.log 2>&1
```

---

### Step 3: Build Dashboard (5 min)

On your development machine:

```bash
# Update API endpoint
nano src/lib/api.ts
# Change line 3 to:
const API_BASE = "http://your-backend-ip:8000/api";

# Build dashboard
npm install
npm run build

# Deploy dist/ folder to your web server
# Example with nginx:
sudo cp -r dist/* /var/www/html/
```

**✅ Test:** Open dashboard URL - should see real-time server data!

---

## 🎯 Verify Everything Works

### 1. Check Backend

```bash
curl http://your-backend-ip:8000/api/status
```

Should return JSON with your servers.

### 2. Check Agent Logs

```bash
sudo tail -f /var/log/monitoring-agent.log
```

Should see `✅ Report sent successfully` every minute.

### 3. Check Dashboard

Open dashboard in browser - should auto-refresh every 5 seconds with live data.

---

## 🐛 Troubleshooting

### Agent not sending data?

```bash
# Test backend connectivity
curl http://your-backend-ip:8000/

# Run agent in debug mode
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh
```

### Dashboard showing "Using mock data"?

1. Check browser console (F12) for errors
2. Verify `API_BASE` in `src/lib/api.ts`
3. Ensure backend is accessible from browser

### Backend not responding?

```bash
# Check if running
ps aux | grep uvicorn

# Check logs (if using systemd)
sudo journalctl -u monitoring-backend -f

# Restart
cd backend
source venv/bin/activate
python main.py
```

---

## 📚 Next Steps

- **Production Deployment**: See [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Backend Details**: See [backend/README.md](backend/README.md)
- **Agent Details**: See [agent/README.md](agent/README.md)

---

## ✅ Checklist

Backend:
- [ ] Python installed
- [ ] Dependencies installed
- [ ] .env created with API_KEY
- [ ] Backend running on port 8000
- [ ] Health check returns JSON

Each Server:
- [ ] curl and jq installed
- [ ] Agent script deployed
- [ ] config.env created and configured
- [ ] Agent tested successfully
- [ ] Added to crontab
- [ ] Logs showing success

Dashboard:
- [ ] API_BASE updated
- [ ] Build completed
- [ ] Deployed to web server
- [ ] Opens in browser
- [ ] Shows real-time data

---

**🎉 Done! Your monitoring system is live!**
