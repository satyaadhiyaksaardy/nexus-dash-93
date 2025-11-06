# Dashboard Integration Guide

Complete guide to connect the React dashboard with the backend API.

## ✅ What Was Changed

### 1. API Endpoint Configuration
- ✅ Updated `src/lib/api.ts` to use environment variable
- ✅ Created `.env` file with backend URL
- ✅ Removed VM-related functions
- ✅ Added `fetchHosts()` function

### 2. Components Updated
- ✅ **ContainersTab**: Now fetches host list dynamically from `/api/hosts`
- ✅ **Index**: Already monitoring-only (no control buttons)

### 3. VM Support Removed
- ✅ Removed VM mock data
- ✅ Removed VM API functions
- ✅ Dashboard now only shows: **Servers + Containers**

---

## 🚀 Quick Setup

### Step 1: Configure Backend URL

Edit `.env` file in dashboard root:

```bash
# Update this to your backend server IP/hostname
VITE_API_BASE=http://localhost:3200/api
```

Or set environment variable:

```bash
export VITE_API_BASE=http://your-backend-ip:3200/api
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Development Server

```bash
npm run dev
```

Dashboard will open at: `http://localhost:8080`

### Step 4: Build for Production

```bash
npm run build
```

Output in `dist/` folder - deploy to your web server.

---

## 🔧 Configuration Options

### Development (Local Backend)

```bash
# .env
VITE_API_BASE=http://localhost:3200/api
```

### Production (Remote Backend)

```bash
# .env
VITE_API_BASE=http://monitoring-backend.example.com:3200/api
```

### Using Reverse Proxy

If backend is behind nginx at `/api`:

```bash
# .env
VITE_API_BASE=/api
```

---

## 📡 API Endpoints Used

The dashboard now calls these backend endpoints:

| Endpoint | Method | Purpose | Polling |
|----------|--------|---------|---------|
| `/api/status` | GET | Get all server statuses | Every 5s |
| `/api/machines` | GET | Get machine inventory | On load |
| `/api/hosts` | GET | Get host list for dropdown | On load |
| `/api/docker/{host}/containers` | GET | Get containers for host | On demand |

---

## ✅ Verification

### 1. Check Backend is Running

```bash
# Health check
curl http://localhost:3200/

# Should return:
{
  "service": "Server Monitoring API",
  "status": "online",
  ...
}
```

### 2. Check API Endpoints

```bash
# Get server status
curl http://localhost:3200/api/status

# Get machines
curl http://localhost:3200/api/machines

# Get hosts
curl http://localhost:3200/api/hosts
```

### 3. Open Dashboard

```bash
npm run dev
```

Open: `http://localhost:8080`

**Expected behavior:**
- ✅ Shows real server data (not "Using mock data" in console)
- ✅ Auto-refreshes every 5 seconds
- ✅ Host dropdown in Containers tab shows real hosts
- ✅ No VM tab (removed)

---

## 🐛 Troubleshooting

### Dashboard shows "Using mock data"

**Check browser console (F12):**

```
Using mock data for server status: Failed to fetch
```

**Solutions:**

1. **CORS Error** - Backend not allowing dashboard domain

   Edit `backend/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:8080"],  # Add your dashboard URL
       ...
   )
   ```

2. **Wrong API URL** - Check `.env` file

   ```bash
   # Verify
   cat .env

   # Update if needed
   echo "VITE_API_BASE=http://localhost:3200/api" > .env
   ```

3. **Backend not running**

   ```bash
   cd backend
   sudo docker-compose ps

   # If not running:
   sudo docker-compose up -d
   ```

### CORS Errors

Add dashboard URL to backend CORS settings:

```python
# backend/main.py line 11
allow_origins=["http://localhost:8080", "http://your-domain.com"]
```

Restart backend:

```bash
cd backend
sudo docker-compose restart
```

### Containers tab shows "No hosts"

Check if backend has received data from agents:

```bash
curl http://localhost:3200/api/hosts
```

If empty `[]`, agents haven't sent data yet. Wait 1 minute for cronjob to run.

### Network Error / Connection Refused

Check if backend port 3200 is accessible:

```bash
# From dashboard machine
curl -v http://backend-ip:3200/

# Check firewall
sudo ufw status
sudo ufw allow 3200/tcp
```

---

## 🔒 Production Configuration

### 1. Use HTTPS

Backend behind nginx with SSL:

```nginx
server {
    listen 443 ssl;
    server_name monitoring-api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Dashboard `.env`:
```bash
VITE_API_BASE=https://monitoring-api.example.com/api
```

### 2. Update CORS

```python
# backend/main.py
allow_origins=["https://dashboard.example.com"]
```

### 3. Environment-specific Configs

```bash
# .env.development
VITE_API_BASE=http://localhost:3200/api

# .env.production
VITE_API_BASE=https://monitoring-api.example.com/api
```

Build for production:
```bash
npm run build  # Uses .env.production
```

---

## 📊 Data Flow

```
┌─────────────┐   cronjob      ┌──────────────┐   Docker
│   Servers   │   (1 min)      │   Backend    │   Port 3200
│   (Agents)  │───────────────>│   FastAPI    │<─────────────┐
└─────────────┘   POST /report │              │              │
                                └──────────────┘              │
                                        ▲                     │
                                        │ GET /status         │
                                        │ (5 sec poll)        │
                                        │                     │
                                ┌───────┴────────┐   npm dev  │
                                │   Dashboard    │   Port 8080│
                                │   React/Vite   │────────────┘
                                └────────────────┘
```

---

## ✅ Checklist

- [x] Backend running on port 3200
- [x] At least one agent sending data
- [x] `.env` file created with correct API_BASE
- [x] CORS configured in backend
- [x] Dashboard started (`npm run dev`)
- [x] Browser console shows no errors
- [x] Data auto-refreshes every 5 seconds
- [x] Host dropdown populated dynamically

---

## 🎉 Success!

Your dashboard is now fully integrated with the backend!

**Test it:**
1. Open dashboard: `http://localhost:8080`
2. Should see real server data
3. Check browser console - no "Using mock data" warnings
4. Data updates every 5 seconds
5. Containers tab shows real hosts in dropdown

**Next steps:**
- Deploy agents to more servers
- Build for production: `npm run build`
- Deploy dashboard to web server
- Set up HTTPS for production
