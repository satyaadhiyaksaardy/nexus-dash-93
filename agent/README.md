# Server Monitoring Agent

Bash script to collect server metrics and send to monitoring backend.

## Features

- 📊 **System Metrics**: CPU, memory, disk usage
- 👥 **Logged Users**: Track who's logged in
- 🎮 **GPU Monitoring**: NVIDIA GPU utilization (if available)
- 🐳 **Container Stats**: Docker container monitoring
- 🔐 **Secure**: API key authentication
- 📝 **Logging**: Detailed logs for debugging

## Requirements

- `bash`
- `curl`
- `awk`, `sed`, `grep` (standard on most systems)
- `jq` (optional, for prettier debug output)
- `nvidia-smi` (optional, for GPU monitoring)
- `docker` (optional, for container monitoring)

## Installation

### 1. Install Dependencies

```bash
sudo apt update
sudo apt install curl jq -y
```

### 2. Copy Script

```bash
sudo mkdir -p /opt/monitoring
sudo cp monitoring-agent.sh /opt/monitoring/agent.sh
sudo chmod +x /opt/monitoring/agent.sh
```

### 3. Configure

```bash
# Copy example config
sudo cp config.env.example /opt/monitoring/config.env

# Edit configuration
sudo nano /opt/monitoring/config.env
```

Update `config.env`:

```bash
# Backend API
API_ENDPOINT="http://your-backend-ip:8000/api/report"
API_KEY="your-api-key-from-backend"

# Server identification (UNIQUE FOR EACH SERVER!)
SERVER_ALIAS="gpu-01"
MACHINE_TYPE="host"
GROUP="production"
LABELS="gpu,cuda,ml"

# Debug mode
DEBUG=0
```

### 4. Test

```bash
cd /opt/monitoring
source config.env
DEBUG=1 ./agent.sh
```

Expected output:
- JSON payload (if DEBUG=1)
- `✅ Report sent successfully`

### 5. Add to Cron

```bash
# Edit root crontab
sudo crontab -e

# Add this line (runs every minute):
* * * * * cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh >> /var/log/monitoring-agent.log 2>&1
```

### 6. Verify

```bash
# Wait 1-2 minutes, check logs
sudo tail -f /var/log/monitoring-agent.log

# Should see:
# [2025-11-06 14:30:01] Starting monitoring agent for gpu-01
# [2025-11-06 14:30:02] ✅ Report sent successfully
```

## Configuration Options

### API_ENDPOINT
Backend API URL where reports are sent.

Example: `http://192.168.1.100:8000/api/report`

### API_KEY
Secret key for authentication (get from backend `.env`).

Example: `abc123def456...`

### SERVER_ALIAS
Unique identifier for this server.

Examples: `gpu-01`, `web-01`, `db-master`

### MACHINE_TYPE
Type of machine (always use `host` for physical/VM servers).

Default: `host`

### GROUP
Logical grouping for servers.

Examples: `production`, `staging`, `development`

### LABELS
Comma-separated tags for categorization.

Examples:
- `gpu,nvidia,cuda-12.1`
- `web,nginx,docker`
- `database,postgresql`

### DEBUG
Print JSON payload before sending.

- `0` = Silent (default)
- `1` = Print JSON

## Data Collected

### System Info
- Hostname
- IP address
- Uptime (seconds)
- OS version

### CPU
- Utilization percentage
- Load average (1m, 5m, 15m)

### Memory
- Total GB
- Used GB
- Utilization percentage

### Disks
- Mount point
- Filesystem type
- Free/total space (GB)
- Utilization percentage

### Users
- Currently logged in users
- Terminal (tty)
- Remote host
- Login time

### GPUs (if nvidia-smi available)
- GPU index
- Model name
- Utilization percentage
- Memory usage (MB)
- Running processes

### Containers (if Docker available)
- Container ID
- Name
- Image
- State (running/exited/paused)
- CPU percentage
- Memory usage (MB)
- Port mappings

## Example Output

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
      "started": "2025-11-06 09:30"
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
      "created": "2025-11-05 08:00:00",
      "ports": "0.0.0.0:8888->8888/tcp",
      "cpu_pct": 14.2,
      "mem_mb": 2048
    }
  ],
  "timestamp": "2025-11-06T14:30:00Z",
  "machine_type": "host",
  "group": "production",
  "os": "Ubuntu 22.04.3 LTS",
  "labels": ["gpu", "nvidia", "cuda", "ml"]
}
```

## Troubleshooting

### Script fails with "command not found"

Install missing dependencies:

```bash
sudo apt install curl jq -y
```

### "Failed to send report (HTTP 401)"

Check API key in `config.env` matches backend `.env`.

### "Failed to send report (HTTP 000)"

Backend is unreachable. Check:
1. Backend is running: `curl http://backend-ip:8000/`
2. Network connectivity: `ping backend-ip`
3. Firewall allows port 8000

### Cron job not running

```bash
# Check cron service
sudo systemctl status cron

# Verify crontab
sudo crontab -l

# Test manually
cd /opt/monitoring && source config.env && ./agent.sh
```

### GPU data not collected

Check if nvidia-smi works:

```bash
nvidia-smi

# If not installed:
# sudo apt install nvidia-utils-XXX
```

### Docker containers not detected

Check Docker permissions:

```bash
docker ps

# If permission denied:
sudo usermod -aG docker $USER
# Log out and back in
```

## Performance

- **Script execution**: ~1-2 seconds
- **Network overhead**: ~1-5 KB per report
- **CPU usage**: Negligible
- **Runs every**: 1 minute (configurable via cron)

## Security

- API key transmitted via HTTPS header (use HTTPS in production!)
- Script runs as root (required for system metrics)
- No sensitive data logged

## Advanced Usage

### Run every 30 seconds

```bash
# Crontab
* * * * * cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh
* * * * * sleep 30 && cd /opt/monitoring && source config.env && /opt/monitoring/agent.sh
```

### Multiple backends

Run script multiple times with different configs:

```bash
* * * * * cd /opt/monitoring && source config1.env && ./agent.sh
* * * * * cd /opt/monitoring && source config2.env && ./agent.sh
```

### Custom labels per script run

```bash
LABELS="gpu,urgent" ./agent.sh
```

## License

MIT

## Support

See full deployment guide: `../docs/DEPLOYMENT.md`
