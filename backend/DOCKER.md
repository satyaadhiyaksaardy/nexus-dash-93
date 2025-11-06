# Docker Deployment Guide

Complete guide for deploying the monitoring backend with Docker.

## Quick Start (3 Steps)

### 1. Setup & Deploy

```bash
# One-command setup (recommended)
./deploy.sh setup

# This will:
# - Check Docker installation
# - Generate .env with secure API key
# - Build Docker image
# - Start services
# - Show status
```

### 2. Get Your API Key

```bash
# View your generated API key
cat .env | grep API_KEY

# Copy this key - you'll need it for agent configuration!
```

### 3. Verify

```bash
# Check if running
curl http://localhost:8000/

# Should return:
{
  "service": "Server Monitoring API",
  "status": "online",
  "servers_monitored": 0,
  "timestamp": "..."
}
```

---

## Manual Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Setup environment
cp .env.example .env

# 2. Generate API key
echo "API_KEY=$(openssl rand -hex 32)" >> .env

# 3. Start services
docker-compose up -d

# 4. View logs
docker-compose logs -f backend

# 5. Stop services
docker-compose down
```

### Option 2: Plain Docker

```bash
# 1. Build image
docker build -t monitoring-backend:latest .

# 2. Run container
docker run -d \
  --name monitoring-backend \
  -p 8000:8000 \
  -e API_KEY=$(openssl rand -hex 32) \
  -e STALE_THRESHOLD_SECONDS=300 \
  --restart unless-stopped \
  monitoring-backend:latest

# 3. Check logs
docker logs -f monitoring-backend

# 4. Stop container
docker stop monitoring-backend
docker rm monitoring-backend
```

---

## Deployment Script Commands

```bash
# Setup (first time only)
./deploy.sh setup

# Start services
./deploy.sh start

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# View logs (live)
./deploy.sh logs

# Check status
./deploy.sh status

# Cleanup (removes everything)
./deploy.sh cleanup

# Show help
./deploy.sh help
```

---

## Configuration

### Environment Variables

Edit `.env` file:

```bash
# Required
API_KEY=your-generated-key-here

# Optional
HOST=0.0.0.0
PORT=8000
STALE_THRESHOLD_SECONDS=300
```

### Docker Compose Override

Create `docker-compose.override.yml` for custom settings:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - CUSTOM_VAR=value
    ports:
      - "8080:8000"  # Custom port
```

---

## Advanced Features

### Enable PostgreSQL (Persistent Storage)

Edit `docker-compose.yml`, uncomment the postgres section:

```yaml
postgres:
  image: postgres:15-alpine
  container_name: monitoring-db
  restart: unless-stopped
  environment:
    POSTGRES_DB: monitoring
    POSTGRES_USER: monitoring
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Add to `.env`:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 32)
```

### Enable Redis (Caching)

Uncomment the redis section in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: monitoring-cache
  restart: unless-stopped
```

### Custom Network

By default, containers use bridge network. To use host network:

```yaml
services:
  backend:
    network_mode: "host"
```

---

## Monitoring & Logs

### View Logs

```bash
# Live logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Follow logs from specific time
docker-compose logs --since 5m backend
```

### Health Check

```bash
# Manual health check
docker inspect monitoring-backend | grep -A 5 Health

# Or via API
curl http://localhost:8000/
```

### Resource Usage

```bash
# View resource stats
docker stats monitoring-backend

# Container details
docker inspect monitoring-backend
```

---

## Updating & Maintenance

### Update Image

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Or use deploy script
./deploy.sh restart
```

### Backup Data

If using volumes:

```bash
# Backup volumes
docker run --rm \
  -v monitoring_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

### Restore Data

```bash
# Restore from backup
docker run --rm \
  -v monitoring_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/backup-20250106.tar.gz --strip 1"
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs monitoring-backend

# Check if port is in use
sudo lsof -i :8000

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Can't Connect from Agents

```bash
# Check if container is running
docker ps | grep monitoring-backend

# Check firewall
sudo ufw status
sudo ufw allow 8000/tcp

# Test from agent server
curl http://backend-ip:8000/
```

### Image Build Fails

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t monitoring-backend:latest .
```

### Out of Disk Space

```bash
# Clean up unused images
docker image prune -a

# Clean up everything
docker system prune -a --volumes

# Check disk usage
docker system df
```

---

## Production Recommendations

### 1. Use HTTPS

Put backend behind nginx with SSL:

```nginx
server {
    listen 443 ssl;
    server_name monitoring.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Limit Resources

Add to docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. Auto-restart

Already configured in docker-compose.yml:

```yaml
restart: unless-stopped
```

### 4. Log Rotation

Configured in docker-compose.yml:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 5. Use Secrets

For sensitive data, use Docker secrets:

```yaml
services:
  backend:
    secrets:
      - api_key
    environment:
      - API_KEY_FILE=/run/secrets/api_key

secrets:
  api_key:
    file: ./secrets/api_key.txt
```

---

## Docker Image Details

### Image Specifications

- **Base**: Python 3.11-slim
- **Size**: ~200MB (multi-stage build)
- **User**: Non-root (appuser)
- **Health Check**: Built-in
- **Exposed Port**: 8000

### Security Features

✅ Multi-stage build (smaller attack surface)
✅ Non-root user
✅ Minimal base image
✅ No unnecessary packages
✅ .dockerignore excludes secrets

### Build Arguments

```bash
# Build with custom Python version
docker build --build-arg PYTHON_VERSION=3.12 -t monitoring-backend .

# Build for specific platform
docker build --platform linux/amd64 -t monitoring-backend .
```

---

## Docker Hub (Optional)

### Push to Docker Hub

```bash
# Login
docker login

# Tag image
docker tag monitoring-backend:latest yourusername/monitoring-backend:latest

# Push
docker push yourusername/monitoring-backend:latest
```

### Pull and Run

```bash
# Pull from Docker Hub
docker pull yourusername/monitoring-backend:latest

# Run
docker run -d -p 8000:8000 \
  -e API_KEY=your-key \
  yourusername/monitoring-backend:latest
```

---

## Quick Reference

### Common Commands

```bash
# Check running containers
docker ps

# Stop all containers
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Shell into container
docker exec -it monitoring-backend /bin/sh

# Check resource usage
docker stats

# Remove everything
docker-compose down -v && docker system prune -a
```

---

## Next Steps

1. ✅ Deploy backend with Docker
2. ✅ Note your API key from `.env`
3. ✅ Configure agents with API key
4. ✅ Update dashboard `API_BASE` URL
5. ✅ Monitor logs: `./deploy.sh logs`

---

## Support

- **Issues**: Check logs with `./deploy.sh logs`
- **Status**: Run `./deploy.sh status`
- **Documentation**: See main [README.md](README.md)
