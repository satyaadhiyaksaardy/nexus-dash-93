# Server Monitoring Backend API

FastAPI-based backend for collecting and serving server monitoring data.

## Features

- 🔒 **Secure API**: Key-based authentication for agents
- 📊 **Real-time Monitoring**: Collect CPU, memory, disk, GPU, and container metrics
- 🚀 **Fast & Lightweight**: Built with FastAPI and Pydantic
- 📡 **Auto-detection**: Marks servers as "down" if no data received for 5 minutes
- 🐳 **Container Support**: Monitors Docker containers on each host
- 🎮 **GPU Tracking**: NVIDIA GPU utilization and process monitoring

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Configure

```bash
# Copy example env file
cp .env.example .env

# Generate secure API key
openssl rand -hex 32

# Edit .env and update API_KEY
nano .env
```

### 3. Run

```bash
# Development
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Test

```bash
# Health check
curl http://localhost:8000/

# Expected response:
{
  "service": "Server Monitoring API",
  "status": "online",
  "servers_monitored": 0,
  "timestamp": "2025-11-06T14:30:00.123456"
}
```

## API Endpoints

### Public Endpoints

- `GET /` - Health check

### Agent Endpoints (Requires API Key)

- `POST /api/report` - Receive monitoring data from agents
  - Headers: `Authorization: Bearer <API_KEY>`
  - Body: JSON with server metrics

### Dashboard Endpoints (Public)

- `GET /api/status` - Get all server statuses
- `GET /api/machines` - Get machine inventory
- `GET /api/docker/{host}/containers` - Get containers for specific host
- `GET /api/hosts` - Get list of monitored hosts

### Admin Endpoints (Requires API Key)

- `DELETE /api/server/{alias}` - Remove server from monitoring
  - Headers: `Authorization: Bearer <API_KEY>`

## Configuration

Edit `.env` file:

```bash
# API Authentication
API_KEY=your-super-secret-key-change-this

# Server settings
HOST=0.0.0.0
PORT=8000

# Monitoring settings (seconds)
STALE_THRESHOLD_SECONDS=300
```

## Data Model

### Server Report (from agents)

```json
{
  "server_alias": "gpu-01",
  "hostname": "gpu01",
  "ip": "10.0.0.11",
  "uptime_seconds": 2592000,
  "cpu": {
    "percent": 23.4,
    "loadavg": {
      "1m": 1.2,
      "5m": 1.1,
      "15m": 0.9
    }
  },
  "memory": {
    "total_gb": 64,
    "used_gb": 20,
    "percent": 31.2
  },
  "disks": [
    {
      "mountpoint": "/",
      "fstype": "ext4",
      "free_gb": 100,
      "total_gb": 200,
      "percent": 50
    }
  ],
  "users": [
    {
      "name": "satya",
      "tty": "pts/0",
      "host": "192.168.0.5",
      "started": "2025-11-06T09:30:00"
    }
  ],
  "gpus": [
    {
      "index": 0,
      "name": "RTX 3090",
      "utilization_pct": 72,
      "memory_used_mb": 9000,
      "memory_total_mb": 24576,
      "processes": []
    }
  ],
  "containers": [
    {
      "id": "2f1c3d4e",
      "name": "trainer",
      "image": "pytorch:2.4-cuda",
      "state": "running",
      "created": "2025-11-05T08:00:00Z",
      "ports": "0.0.0.0:8888->8888/tcp",
      "cpu_pct": 14.2,
      "mem_mb": 2048
    }
  ],
  "timestamp": "2025-11-06T14:30:00Z",
  "machine_type": "host",
  "group": "production",
  "os": "Ubuntu 22.04",
  "labels": ["gpu", "nvidia", "ml"]
}
```

## Deployment

### Development

```bash
python main.py
```

### Production with Systemd

Create `/etc/systemd/system/monitoring-backend.service`:

```ini
[Unit]
Description=Server Monitoring Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/backend
Environment="PATH=/path/to/backend/venv/bin"
ExecStart=/path/to/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable monitoring-backend
sudo systemctl start monitoring-backend
sudo systemctl status monitoring-backend
```

### Production with Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY .env .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t monitoring-backend .
docker run -d -p 8000:8000 --name monitoring-backend monitoring-backend
```

## Security

### API Key

Always use a strong, randomly generated API key:

```bash
openssl rand -hex 32
```

### CORS

In production, update CORS settings in `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-dashboard-domain.com"],  # Update this!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Firewall

Restrict access to backend:

```bash
# Only allow from specific subnet
sudo ufw allow from 10.0.0.0/24 to any port 8000
```

## Monitoring & Logs

### View Logs (Systemd)

```bash
# Live logs
sudo journalctl -u monitoring-backend -f

# Last 100 lines
sudo journalctl -u monitoring-backend -n 100

# Errors only
sudo journalctl -u monitoring-backend -p err
```

### Check Status

```bash
curl http://localhost:8000/api/status
```

## Troubleshooting

### Backend won't start

```bash
# Check if port is in use
sudo lsof -i :8000

# Check dependencies
pip list

# Run with debug
python main.py
```

### Agents can't connect

```bash
# Test from agent server
curl -v http://backend-ip:8000/

# Test authentication
curl -X POST http://backend-ip:8000/api/report \
  -H "Authorization: Bearer your-key" \
  -d '{}'
```

### CORS errors in dashboard

Update `allow_origins` in `main.py` to include dashboard URL.

## Storage

Currently uses **in-memory storage** (data lost on restart).

For production, consider:
- **PostgreSQL** for persistent storage
- **Redis** for caching
- **InfluxDB** for time-series data

## Performance

- Handles 100+ servers easily with in-memory storage
- For larger deployments, use PostgreSQL + Redis
- Consider load balancing with Nginx for high availability

## License

MIT

## Support

See full deployment guide: `../docs/DEPLOYMENT.md`
