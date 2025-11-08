from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os

from portainer_client import init_portainer_client, get_portainer_client

app = FastAPI(title="Server Monitoring API", version="1.0.0")

# CORS - Allow dashboard to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set to your dashboard domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
API_KEY = os.getenv("API_KEY", "your-secret-api-key-change-in-production")
STALE_THRESHOLD_SECONDS = int(os.getenv("STALE_THRESHOLD_SECONDS", "300"))

# Portainer Configuration
PORTAINER_URL = os.getenv("PORTAINER_URL", "")
PORTAINER_API_KEY = os.getenv("PORTAINER_API_KEY", "")

# In-memory storage (use Redis/PostgreSQL for production)
server_data: Dict[str, dict] = {}
machine_registry: Dict[str, dict] = {}

# ==================== DATA MODELS ====================

class LoadAvg(BaseModel):
    one_min: float = Field(alias="1m")
    five_min: float = Field(alias="5m")
    fifteen_min: float = Field(alias="15m")

    class Config:
        populate_by_name = True

class CPU(BaseModel):
    percent: float
    loadavg: LoadAvg

class Memory(BaseModel):
    total_gb: float
    used_gb: float
    percent: float

class Disk(BaseModel):
    mountpoint: str
    fstype: str
    free_gb: float
    total_gb: float
    percent: float

class LoggedUser(BaseModel):
    name: str
    tty: str
    host: str
    started: str

class GPUProcess(BaseModel):
    pid: int
    username: str
    cmd: str
    used_memory_mb: int
    type: Optional[str] = None  # Process type (C for compute, G for graphics)

class GPU(BaseModel):
    index: int
    name: str
    utilization_pct: float
    memory_used_mb: int
    memory_total_mb: int
    temperature_celsius: Optional[float] = None
    fan_speed_pct: Optional[int] = None
    power_draw_watts: Optional[float] = None
    processes: List[GPUProcess] = []

class Container(BaseModel):
    id: str
    name: str
    image: str
    state: str  # running, exited, paused
    created: str
    ports: Optional[str] = ""
    cpu_pct: float = 0.0
    mem_mb: int = 0

class ServerReport(BaseModel):
    server_alias: str
    hostname: str
    ip: str
    uptime_seconds: int
    cpu: CPU
    memory: Memory
    disks: List[Disk]
    users: List[LoggedUser]
    gpus: List[GPU] = []
    containers: List[Container] = []
    timestamp: str

    # Machine metadata (optional)
    machine_type: str = "host"
    group: str = "default"
    os: str = "Unknown"
    labels: List[str] = []

class ServerStatus(BaseModel):
    server_alias: str
    status: str  # "ok" or "down"
    hostname: str
    ip: str
    uptime_seconds: int
    cpu: CPU
    memory: Memory
    disks: List[Disk]
    users: List[LoggedUser]
    gpus: List[GPU]
    timestamp: str

class Machine(BaseModel):
    id: str
    alias: str
    type: str  # host, container
    group: str
    parent: Optional[str] = None
    ip: str
    os: str
    labels: List[str]
    status: str  # online, offline, degraded

# ==================== HELPER FUNCTIONS ====================

def is_server_stale(last_update: str) -> bool:
    """Check if server data is stale (older than threshold)"""
    try:
        # Parse ISO timestamp with timezone
        last_update_time = datetime.fromisoformat(last_update.replace("Z", "+00:00"))
        # Get current time in UTC
        now = datetime.now(timezone.utc)
        # Calculate age in seconds (both are timezone-aware)
        age = (now - last_update_time).total_seconds()
        return age > STALE_THRESHOLD_SECONDS
    except Exception as e:
        print(f"Error parsing timestamp {last_update}: {e}")
        return True

def verify_api_key(authorization: Optional[str] = None) -> bool:
    """Verify API key from Authorization header"""
    if not authorization:
        return False

    # Support both "Bearer TOKEN" and just "TOKEN"
    token = authorization.replace("Bearer ", "").strip()
    return token == API_KEY

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Server Monitoring API",
        "status": "online",
        "servers_monitored": len(server_data),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/report")
async def receive_report(
    report: ServerReport,
    authorization: str = Header(None)
):
    """
    Receive monitoring data from agent scripts.
    Requires API key in Authorization header.
    """
    # Verify API key
    if not verify_api_key(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    server_alias = report.server_alias

    # Store server data
    server_data[server_alias] = {
        **report.model_dump(),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "status": "ok"
    }

    # Update machine registry
    machine_registry[server_alias] = {
        "id": server_alias,
        "alias": server_alias,
        "type": report.machine_type,
        "group": report.group,
        "parent": None,
        "ip": report.ip,
        "os": report.os,
        "labels": report.labels,
        "status": "online"
    }

    # Register containers as machines if present
    for container in report.containers:
        container_id = f"{server_alias}-{container.name}"
        machine_registry[container_id] = {
            "id": container_id,
            "alias": container.name,
            "type": "container",
            "group": report.group,
            "parent": server_alias,
            "ip": report.ip,
            "os": container.image,
            "labels": ["container", container.state],
            "status": "online" if container.state == "running" else "offline"
        }

    return {
        "status": "ok",
        "server_alias": server_alias,
        "received_at": server_data[server_alias]["received_at"]
    }

@app.get("/api/status")
async def get_status():
    """
    Get status of all monitored servers.
    Used by dashboard for real-time monitoring.
    """
    results = []

    for _, data in server_data.items():
        # Check if data is stale
        if is_server_stale(data["received_at"]):
            data["status"] = "down"
        else:
            data["status"] = "ok"

        # Build response matching frontend expectations
        results.append({
            "server_alias": data["server_alias"],
            "status": data["status"],
            "hostname": data["hostname"],
            "ip": data["ip"],
            "uptime_seconds": data["uptime_seconds"],
            "cpu": data["cpu"],
            "memory": data["memory"],
            "disks": data["disks"],
            "users": data["users"],
            "gpus": data["gpus"],
            "timestamp": data["timestamp"],
            "os": data.get("os", "Unknown")
        })

    return {"results": results}

@app.get("/api/machines")
async def get_machines():
    """
    Get inventory of all machines (hosts + containers).
    """
    machines = []

    for machine_id, data in machine_registry.items():
        # Update status based on latest server data
        if data["type"] == "host" and machine_id in server_data:
            if is_server_stale(server_data[machine_id]["received_at"]):
                data["status"] = "offline"
            else:
                data["status"] = "online"

        machines.append(data)

    return {"machines": machines}

@app.get("/api/docker/{host}/containers")
async def get_containers(host: str):
    """
    Get containers running on a specific host.
    """
    if host not in server_data:
        raise HTTPException(status_code=404, detail=f"Host '{host}' not found")

    containers = server_data[host].get("containers", [])
    return containers

@app.get("/api/hosts")
async def get_hosts():
    """
    Get list of all monitored hosts (for dropdown selectors).
    """
    hosts = [
        {
            "alias": alias,
            "hostname": data["hostname"],
            "ip": data["ip"],
            "status": "online" if not is_server_stale(data["received_at"]) else "offline"
        }
        for alias, data in server_data.items()
        if data.get("machine_type", "host") == "host"
    ]
    return {"hosts": hosts}

@app.delete("/api/server/{alias}")
async def delete_server(alias: str, authorization: str = Header(None)):
    """
    Remove a server from monitoring (admin only).
    """
    if not verify_api_key(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    if alias not in server_data:
        raise HTTPException(status_code=404, detail=f"Server '{alias}' not found")

    # Remove server and its containers
    del server_data[alias]

    # Remove from machine registry
    to_remove = [mid for mid, data in machine_registry.items()
                 if mid == alias or data.get("parent") == alias]
    for mid in to_remove:
        del machine_registry[mid]

    return {"status": "ok", "message": f"Server '{alias}' removed"}

# ==================== PORTAINER ENDPOINTS ====================

@app.get("/api/portainer/status")
async def portainer_status():
    """Check Portainer connection status"""
    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        is_healthy = await client.health_check()
        return {"status": "connected" if is_healthy else "disconnected", "url": PORTAINER_URL}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Portainer connection failed: {str(e)}")

@app.get("/api/portainer/endpoints")
async def get_portainer_endpoints():
    """Get all Portainer endpoints (environments)"""
    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        endpoints = await client.get_endpoints()
        return {"endpoints": endpoints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch endpoints: {str(e)}")

@app.get("/api/portainer/templates")
async def get_portainer_templates():
    """Get all custom templates from Portainer"""
    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        templates = await client.get_custom_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")

@app.get("/api/portainer/templates/{template_id}")
async def get_portainer_template(template_id: int):
    """Get specific template details including variables"""
    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        template = await client.get_custom_template(template_id)
        return template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template: {str(e)}")

@app.get("/api/portainer/stacks")
async def get_portainer_stacks():
    """Get all deployed stacks"""
    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        stacks = await client.get_stacks()
        return {"stacks": stacks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stacks: {str(e)}")

class DeployStackRequest(BaseModel):
    name: str
    template_id: int
    endpoint_id: int
    env_vars: Optional[List[Dict[str, str]]] = None

@app.post("/api/portainer/deploy")
async def deploy_stack(request: DeployStackRequest, authorization: str = Header(None)):
    """Deploy a stack from template to endpoint"""
    if not verify_api_key(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        result = await client.deploy_stack_from_template(
            name=request.name,
            template_id=request.template_id,
            endpoint_id=request.endpoint_id,
            env_vars=request.env_vars
        )
        return {"status": "success", "stack": result}
    except Exception as e:
        import traceback
        print(f"Deployment error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")

@app.delete("/api/portainer/stacks/{stack_id}")
async def delete_portainer_stack(
    stack_id: int,
    endpoint_id: int,
    authorization: str = Header(None)
):
    """Delete a deployed stack"""
    if not verify_api_key(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    client = get_portainer_client()
    if not client:
        raise HTTPException(status_code=503, detail="Portainer not configured")

    try:
        await client.delete_stack(stack_id, endpoint_id)
        return {"status": "success", "message": f"Stack {stack_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete stack: {str(e)}")

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("🚀 Server Monitoring API Started")
    print("=" * 60)
    print(f"📡 API Key: {API_KEY[:8]}...{API_KEY[-8:]}")
    print(f"⏱️  Stale threshold: {STALE_THRESHOLD_SECONDS}s")
    print(f"🌐 CORS: Enabled for all origins (change in production!)")

    # Initialize Portainer client if configured
    if PORTAINER_URL and PORTAINER_API_KEY:
        init_portainer_client(PORTAINER_URL, PORTAINER_API_KEY)
        client = get_portainer_client()
        if client:
            is_healthy = await client.health_check()
            if is_healthy:
                print(f"🐳 Portainer: Connected to {PORTAINER_URL}")
            else:
                print(f"⚠️  Portainer: Configured but unreachable at {PORTAINER_URL}")
        else:
            print("⚠️  Portainer: Failed to initialize client")
    else:
        print("ℹ️  Portainer: Not configured (optional)")

    print("=" * 60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
