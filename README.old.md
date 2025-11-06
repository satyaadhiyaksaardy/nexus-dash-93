# Server Monitoring System

A complete monitoring solution for tracking server metrics, GPU usage, and Docker containers across multiple machines.

![Architecture](https://img.shields.io/badge/Architecture-Distributed-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)
![Frontend](https://img.shields.io/badge/Frontend-React-61dafb)
![Agent](https://img.shields.io/badge/Agent-Bash-red)

## Features

### 🖥️ Server Monitoring
- **CPU Usage** - Real-time utilization and load averages
- **Memory** - Total, used, and percentage
- **Disk Space** - Multiple mountpoints with usage stats
- **Uptime** - Server uptime tracking
- **Logged Users** - Who's currently logged in

### 🎮 GPU Monitoring
- **NVIDIA GPU Support** - Utilization and memory usage
- **Process Tracking** - See who's using GPU resources
- **CUDA Version** - Track installed CUDA versions
- **Multiple GPUs** - Monitor all GPUs per server

### 🐳 Container Monitoring
- **Docker Containers** - Status, image, and resource usage
- **CPU/Memory Stats** - Per-container metrics
- **Port Mappings** - See exposed ports

### 📊 Dashboard Features
- **Real-time Updates** - Auto-refresh every 5 seconds
- **Cluster Summary** - Overview of all servers
- **Server Cards** - Detailed view per server
- **Filtering** - Search and filter by status, type, group
- **Responsive Design** - Works on desktop and mobile

## Architecture

```
┌─────────────────┐
│   Servers       │  ← Monitoring agents (cronjob)
│   (A, B, C...)  │
└────────┬────────┘
         │ POST /api/report (every 1 min)
         ▼
┌─────────────────┐
│  Backend API    │  ← FastAPI + in-memory storage
│  (Port 8000)    │
└────────┬────────┘
         │ GET /api/status (every 5s)
         ▼
┌─────────────────┐
│   Dashboard     │  ← React SPA
│   (Port 8080)   │
└─────────────────┘
```

## Quick Start

### 1. Deploy Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env
nano .env  # Update API_KEY

# Run
python main.py
```

Backend runs at: `http://localhost:8000`

### 2. Deploy Agent (on each server)

```bash
sudo mkdir -p /opt/monitoring
sudo cp agent/monitoring-agent.sh /opt/monitoring/agent.sh
sudo chmod +x /opt/monitoring/agent.sh

# Configure
sudo cp agent/config.env.example /opt/monitoring/config.env
sudo nano /opt/monitoring/config.env  # Update settings

# Test
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh

# Add to cron (runs every minute)
sudo crontab -e
# Add: * * * * * cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh >> /var/log/monitoring-agent.log 2>&1
```

### 3. Deploy Dashboard

```bash
# Update API endpoint
nano src/lib/api.ts  # Change API_BASE to backend URL

# Build
npm install
npm run build

# Deploy dist/ folder to web server
```

## Project Structure

```
server-dashboard/
├── backend/              # FastAPI backend
│   ├── main.py          # Main API application
│   ├── requirements.txt # Python dependencies
│   ├── .env.example     # Configuration template
│   └── README.md        # Backend documentation
│
├── agent/               # Monitoring agent
│   ├── monitoring-agent.sh   # Bash script for data collection
│   ├── config.env.example    # Agent configuration template
│   └── README.md             # Agent documentation
│
├── src/                 # React dashboard
│   ├── components/      # UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # API client
│   ├── pages/          # Route pages
│   └── types/          # TypeScript types
│
├── docs/               # Documentation
│   └── DEPLOYMENT.md   # Complete deployment guide
│
└── README.md          # This file
```

## Documentation

- **[Backend README](backend/README.md)** - Backend API documentation
- **[Agent README](agent/README.md)** - Agent script documentation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Complete deployment instructions

## Technologies

This project is built with:

- **Backend**: Python, FastAPI, Uvicorn, Pydantic
- **Frontend**: React 18, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **Agent**: Bash scripting

## Deployment

See [Deployment Guide](docs/DEPLOYMENT.md) for complete instructions.

## Support

For issues and questions, check the documentation:

1. [Deployment Guide](docs/DEPLOYMENT.md)
2. [Backend README](backend/README.md)
3. [Agent README](agent/README.md)

## License

MIT
