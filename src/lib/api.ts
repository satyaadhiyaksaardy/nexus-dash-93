import { ServerStatus, Machine, Container, PortainerEndpoint, PortainerTemplate, PortainerStack, DeployStackRequest } from "@/types/server";

// Backend API endpoint - change this to your backend URL
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3200/api";

// Mock data for fallback
const mockServerStatus: ServerStatus[] = [
  {
    server_alias: "gpu-01",
    status: "ok",
    hostname: "gpu01",
    ip: "10.0.0.11",
    uptime_seconds: 2592000,
    cpu: { percent: 23.4, loadavg: { "1m": 1.2, "5m": 1.1, "15m": 0.9 } },
    memory: { total_gb: 64, used_gb: 20, percent: 31.2 },
    disks: [
      { mountpoint: "/", fstype: "ext4", free_gb: 100, total_gb: 200, percent: 50 },
      { mountpoint: "/data", fstype: "ext4", free_gb: 500, total_gb: 1000, percent: 50 }
    ],
    users: [
      { name: "satya", tty: "pts/0", host: "192.168.0.5", started: "2025-11-06T09:30:00" }
    ],
    gpus: [
      {
        index: 0,
        name: "RTX 3090",
        utilization_pct: 72,
        memory_used_mb: 9000,
        memory_total_mb: 24576,
        temperature_celsius: 68,
        fan_speed_pct: 65,
        processes: [
          { pid: 3452, username: "satya", cmd: "python train.py", type: "ML Training", used_memory_mb: 3000 }
        ]
      }
    ],
    timestamp: new Date().toISOString(),
    os: "Ubuntu 20.04"
  },
  {
    server_alias: "web-01",
    status: "ok",
    hostname: "web01",
    ip: "10.0.0.12",
    uptime_seconds: 1296000,
    cpu: { percent: 12.8, loadavg: { "1m": 0.5, "5m": 0.6, "15m": 0.4 } },
    memory: { total_gb: 32, used_gb: 12, percent: 37.5 },
    disks: [
      { mountpoint: "/", fstype: "ext4", free_gb: 80, total_gb: 100, percent: 20 }
    ],
    users: [],
    gpus: [],
    timestamp: new Date().toISOString(),
    os: "Ubuntu 22.04"
  },
  {
    server_alias: "db-01",
    status: "down",
    hostname: "db01",
    ip: "10.0.0.13",
    uptime_seconds: 0,
    cpu: { percent: 0, loadavg: { "1m": 0, "5m": 0, "15m": 0 } },
    memory: { total_gb: 128, used_gb: 0, percent: 0 },
    disks: [],
    users: [],
    gpus: [],
    timestamp: new Date().toISOString(),
    os: "Ubuntu 22.04"
  }
];

const mockMachines: Machine[] = [
  {
    id: "gpu-01",
    alias: "gpu-01",
    type: "host",
    group: "production",
    parent: null,
    ip: "10.0.0.11",
    os: "Ubuntu 22.04",
    labels: ["gpu", "nvidia", "mlx"],
    status: "online"
  },
  {
    id: "web-01",
    alias: "web-01",
    type: "host",
    group: "production",
    parent: null,
    ip: "10.0.0.12",
    os: "Ubuntu 22.04",
    labels: ["web", "nginx"],
    status: "online"
  },
];

const mockContainers: Container[] = [
  {
    id: "2f1c3d4e",
    name: "trainer",
    image: "pytorch:2.4-cuda",
    state: "running",
    created: "2025-11-05T08:00:00Z",
    ports: "0.0.0.0:8888->8888/tcp",
    cpu_pct: 14.2,
    mem_mb: 2048
  },
  {
    id: "9a8b7c6d",
    name: "api",
    image: "node:20-alpine",
    state: "running",
    created: "2025-11-04T10:00:00Z",
    ports: "0.0.0.0:3000->3000/tcp",
    cpu_pct: 5.1,
    mem_mb: 512
  }
];


export async function fetchServerStatus(): Promise<ServerStatus[]> {
  try {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.warn("Using mock data for server status:", error);
    return mockServerStatus;
  }
}

export async function fetchMachines(): Promise<Machine[]> {
  try {
    const response = await fetch(`${API_BASE}/machines`);
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return data.machines;
  } catch (error) {
    console.warn("Using mock data for machines:", error);
    return mockMachines;
  }
}

export async function fetchContainers(host: string): Promise<Container[]> {
  try {
    const response = await fetch(`${API_BASE}/docker/${host}/containers`);
    if (!response.ok) throw new Error("Failed to fetch");
    return await response.json();
  } catch (error) {
    console.warn("Using mock data for containers:", error);
    return mockContainers;
  }
}

// Fetch list of hosts for dropdown
export async function fetchHosts(): Promise<{ alias: string; hostname: string; ip: string; status: string }[]> {
  try {
    const response = await fetch(`${API_BASE}/hosts`);
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    return data.hosts;
  } catch (error) {
    console.warn("Failed to fetch hosts:", error);
    return [
      { alias: "gpu-01", hostname: "gpu01", ip: "10.0.0.11", status: "online" },
      { alias: "web-01", hostname: "web01", ip: "10.0.0.12", status: "online" }
    ];
  }
}

// ==================== PORTAINER API ====================

export async function fetchPortainerStatus(): Promise<{ status: string; url: string }> {
  const response = await fetch(`${API_BASE}/portainer/status`);
  if (!response.ok) throw new Error("Portainer not configured");
  return await response.json();
}

export async function fetchPortainerEndpoints(): Promise<PortainerEndpoint[]> {
  const response = await fetch(`${API_BASE}/portainer/endpoints`);
  if (!response.ok) throw new Error("Failed to fetch endpoints");
  const data = await response.json();
  return data.endpoints;
}

export async function fetchPortainerTemplates(): Promise<PortainerTemplate[]> {
  const response = await fetch(`${API_BASE}/portainer/templates`);
  if (!response.ok) throw new Error("Failed to fetch templates");
  const data = await response.json();
  return data.templates;
}

export async function fetchPortainerTemplate(templateId: number): Promise<PortainerTemplate> {
  const response = await fetch(`${API_BASE}/portainer/templates/${templateId}`);
  if (!response.ok) throw new Error("Failed to fetch template");
  return await response.json();
}

export async function fetchPortainerStacks(): Promise<PortainerStack[]> {
  const response = await fetch(`${API_BASE}/portainer/stacks`);
  if (!response.ok) throw new Error("Failed to fetch stacks");
  const data = await response.json();
  return data.stacks;
}

export async function deployStack(request: DeployStackRequest, apiKey: string): Promise<any> {
  const response = await fetch(`${API_BASE}/portainer/deploy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Deployment failed");
  }

  return await response.json();
}

export async function deleteStack(stackId: number, endpointId: number, apiKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/portainer/stacks/${stackId}?endpoint_id=${endpointId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete stack");
  }
}
