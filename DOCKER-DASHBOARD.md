# Dashboard Docker Deployment Guide

Complete guide for deploying the React dashboard with Docker.

## Quick Start (One Command)

```bash
./deploy-dashboard.sh setup
```

This will:
1. ✅ Check Docker installation
2. ✅ Create `.env` file
3. ✅ Build Docker image
4. ✅ Start nginx container
5. ✅ Expose on port 8080

---

## Manual Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Configure backend URL
cp .env.example .env
nano .env  # Update VITE_API_BASE

# 2. Build and start
docker-compose up -d

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f

# 5. Stop
docker-compose down
```

### Option 2: Plain Docker

```bash
# 1. Build image
docker build -t monitoring-dashboard:latest .

# 2. Run container
docker run -d \
  --name monitoring-dashboard \
  -p 8080:80 \
  --restart unless-stopped \
  monitoring-dashboard:latest

# 3. Check logs
docker logs -f monitoring-dashboard

# 4. Stop
docker stop monitoring-dashboard
docker rm monitoring-dashboard
```

---

## Configuration

### Environment Variables

Edit `.env` file:

```bash
# Backend API URL (IMPORTANT!)
VITE_API_BASE=http://your-backend-ip:3200/api
```

**Examples:**

```bash
# Local backend
VITE_API_BASE=http://localhost:3200/api

# Remote backend
VITE_API_BASE=http://192.168.1.100:3200/api

# Production with domain
VITE_API_BASE=https://api.monitoring.example.com/api
```

### Port Configuration

Default port: `8080`

Change in `docker-compose.yml`:

```yaml
ports:
  - "80:80"  # Access on port 80
```

Or with docker run:

```bash
docker run -p 80:80 monitoring-dashboard:latest
```

---

## Deployment Script Commands

```bash
# Setup (first time only)
./deploy-dashboard.sh setup

# Start services
./deploy-dashboard.sh start

# Stop services
./deploy-dashboard.sh stop

# Restart services
./deploy-dashboard.sh restart

# View logs (live)
./deploy-dashboard.sh logs

# Check status
./deploy-dashboard.sh status

# Cleanup (removes everything)
./deploy-dashboard.sh cleanup

# Show help
./deploy-dashboard.sh help
```

---

## Docker Image Details

### Multi-Stage Build

- **Stage 1 (Builder)**: Node.js 20 Alpine - builds React app
- **Stage 2 (Production)**: Nginx Alpine - serves static files

### Image Specifications

- **Base**: nginx:alpine
- **Size**: ~25MB (optimized)
- **Port**: 80 (nginx)
- **Health Check**: Built-in at `/health`

### What's Inside

```
/usr/share/nginx/html/     # React build output
/etc/nginx/conf.d/         # Nginx configuration
```

---

## Nginx Configuration

The dashboard uses custom nginx config (`nginx.conf`):

**Features:**
- ✅ Gzip compression
- ✅ Security headers
- ✅ SPA routing (try_files)
- ✅ Static asset caching (1 year)
- ✅ Health check endpoint
- ✅ Optional API proxy

### Enable API Proxy

Uncomment in `nginx.conf`:

```nginx
location /api/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Then update `.env`:

```bash
VITE_API_BASE=/api  # Use relative URL
```

---

## Production Deployment

### 1. Build Production Image

```bash
# Build with specific backend URL
docker build \
  --build-arg VITE_API_BASE=https://api.example.com/api \
  -t monitoring-dashboard:prod \
  .
```

### 2. Deploy with SSL (Nginx Proxy)

Use nginx as reverse proxy with Let's Encrypt:

```nginx
# /etc/nginx/sites-available/dashboard
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name dashboard.example.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Deploy with Docker Swarm

```yaml
# docker-stack.yml
version: '3.8'

services:
  dashboard:
    image: monitoring-dashboard:latest
    ports:
      - "8080:80"
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

Deploy:

```bash
docker stack deploy -c docker-stack.yml monitoring
```

---

## Monitoring & Logs

### View Logs

```bash
# Live logs
docker-compose logs -f dashboard

# Last 100 lines
docker-compose logs --tail=100 dashboard

# Since specific time
docker-compose logs --since 10m dashboard
```

### Health Check

```bash
# Manual check
curl http://localhost:8080/health

# Docker health status
docker inspect monitoring-dashboard | grep -A 5 Health
```

### Resource Usage

```bash
# Stats
docker stats monitoring-dashboard

# Inspect
docker inspect monitoring-dashboard
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
./deploy-dashboard.sh restart
```

### Zero-Downtime Update

```bash
# Build new image with tag
docker build -t monitoring-dashboard:v2 .

# Run new container on different port
docker run -d -p 8081:80 monitoring-dashboard:v2

# Test on 8081, then switch
docker stop monitoring-dashboard
docker rm monitoring-dashboard
docker run -d -p 8080:80 --name monitoring-dashboard monitoring-dashboard:v2
```

### Backup Configuration

```bash
# Backup .env
cp .env .env.backup

# Backup custom nginx config
cp nginx.conf nginx.conf.backup
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs monitoring-dashboard

# Check if port is in use
sudo lsof -i :8080

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Build Fails

```bash
# Clear cache and rebuild
docker build --no-cache -t monitoring-dashboard:latest .

# Check disk space
df -h

# Clean up old images
docker system prune -a
```

### Can't Connect to Backend

**Check browser console:**
```
CORS error / Network error
```

**Solutions:**

1. **Wrong API URL** - Check `.env`:
   ```bash
   cat .env | grep VITE_API_BASE
   ```

2. **CORS not configured** - Update backend:
   ```python
   # backend/main.py
   allow_origins=["http://localhost:8080"]
   ```

3. **Backend not running**:
   ```bash
   curl http://backend-ip:3200/api/status
   ```

### Dashboard Shows Blank Page

```bash
# Check nginx logs
docker exec monitoring-dashboard cat /var/log/nginx/error.log

# Check build output
docker run -it --rm monitoring-dashboard:latest ls -la /usr/share/nginx/html/
```

---

## Advanced Configuration

### Custom Nginx Config

Edit `nginx.conf` and rebuild:

```bash
# After editing nginx.conf
docker-compose up -d --build
```

### Environment-Specific Builds

```bash
# Development
docker build -f Dockerfile.dev -t dashboard:dev .

# Staging
docker build --build-arg VITE_API_BASE=https://staging-api.example.com/api \
  -t dashboard:staging .

# Production
docker build --build-arg VITE_API_BASE=https://api.example.com/api \
  -t dashboard:prod .
```

### Add Basic Auth

Add to `nginx.conf`:

```nginx
location / {
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;
    try_files $uri $uri/ /index.html;
}
```

Create password file:

```bash
# Install htpasswd
apt-get install apache2-utils

# Create password
htpasswd -c .htpasswd admin

# Add to Dockerfile
COPY .htpasswd /etc/nginx/.htpasswd
```

---

## Performance Optimization

### Enable HTTP/2

In `nginx.conf`:

```nginx
listen 80 http2;
```

### Add Brotli Compression

Install module and add to `nginx.conf`:

```nginx
brotli on;
brotli_types text/plain text/css application/json application/javascript;
```

### Cache API Responses

Add to `nginx.conf`:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 1m;
    proxy_pass http://backend:8000;
}
```

---

## Docker Hub (Optional)

### Push to Docker Hub

```bash
# Login
docker login

# Tag image
docker tag monitoring-dashboard:latest yourusername/monitoring-dashboard:latest

# Push
docker push yourusername/monitoring-dashboard:latest
```

### Pull and Run

```bash
docker pull yourusername/monitoring-dashboard:latest
docker run -d -p 8080:80 yourusername/monitoring-dashboard:latest
```

---

## Complete Docker Stack (Dashboard + Backend)

Uncomment backend section in `docker-compose.yml` to run both:

```bash
# Start both dashboard and backend
docker-compose up -d

# Check status
docker-compose ps

# Should show:
# monitoring-dashboard    running    0.0.0.0:8080->80/tcp
# monitoring-backend      running    0.0.0.0:3200->8000/tcp
```

---

## Quick Reference

```bash
# Build
docker build -t monitoring-dashboard .

# Run
docker run -d -p 8080:80 monitoring-dashboard

# Logs
docker logs -f monitoring-dashboard

# Shell access
docker exec -it monitoring-dashboard sh

# Stop
docker stop monitoring-dashboard

# Remove
docker rm monitoring-dashboard

# Cleanup
docker system prune -a
```

---

## Checklist

- [x] Docker and Docker Compose installed
- [x] `.env` file created with correct API_BASE
- [x] Backend running and accessible
- [x] Dashboard built: `docker build -t monitoring-dashboard .`
- [x] Dashboard running: `docker run -d -p 8080:80 monitoring-dashboard`
- [x] Health check passes: `curl http://localhost:8080/health`
- [x] Dashboard accessible: `http://localhost:8080`
- [x] Console shows no CORS errors
- [x] Data loads from backend

---

## Next Steps

1. Deploy backend (see `backend/DOCKER.md`)
2. Deploy agents to servers (see `agent/README.md`)
3. Access dashboard: `http://your-server:8080`
4. Set up HTTPS with Let's Encrypt
5. Configure monitoring alerts
