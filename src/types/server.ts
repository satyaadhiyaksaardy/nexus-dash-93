export interface ServerStatus {
  server_alias: string;
  status: "ok" | "down";
  hostname: string;
  ip: string;
  uptime_seconds: number;
  cpu: {
    percent: number;
    loadavg: {
      "1m": number;
      "5m": number;
      "15m": number;
    };
  };
  memory: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  disks: Disk[];
  users: LoggedUser[];
  gpus: GPU[];
  timestamp: string;
  os: string;
}

export interface Disk {
  mountpoint: string;
  fstype: string;
  free_gb: number;
  total_gb: number;
  percent: number;
}

export interface LoggedUser {
  name: string;
  tty: string;
  host: string;
  started: string;
}

export interface GPU {
  index: number;
  name: string;
  utilization_pct: number;
  memory_used_mb: number;
  memory_total_mb: number;
  temperature_celsius?: number;
  fan_speed_pct?: number;
  processes: GPUProcess[];
}

export interface GPUProcess {
  pid: number;
  username: string;
  cmd: string;
  type?: string;
  used_memory_mb: number;
}

export interface Machine {
  id: string;
  alias: string;
  type: "host" | "vm" | "container";
  group: string;
  parent: string | null;
  ip: string;
  os: string;
  labels: string[];
  status: "online" | "offline" | "degraded";
}

export interface Container {
  id: string;
  name: string;
  image: string;
  state: "running" | "exited" | "paused";
  created: string;
  ports: string;
  cpu_pct: number;
  mem_mb: number;
}

export interface VM {
  id: string;
  name: string;
  state: "running" | "stopped" | "paused";
  cpu_pct: number;
  mem_mb: number;
  ip: string;
}
