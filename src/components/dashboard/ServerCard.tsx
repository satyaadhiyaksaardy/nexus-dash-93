import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ServerStatus } from "@/types/server";
import { MoreVertical, Copy, Activity, ChevronDown, ChevronUp, Computer, MemoryStick, Gauge, Fan, Thermometer, Clock, Cpu, HardDrive, Users, User } from "lucide-react";
import { UbuntuIcon } from "@/components/icons/UbuntuIcon";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { getEnhancedStatus, getStatusColorClasses } from "@/lib/statusUtils";

type NumericLike = number | string | { parsedValue?: number; source?: string } | null | undefined;

const toNumber = (value: NumericLike, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === "object") {
    const possiblyParsed = (value as { parsedValue?: number }).parsedValue;
    if (typeof possiblyParsed === "number" && Number.isFinite(possiblyParsed)) {
      return possiblyParsed;
    }

    const sourceString = (value as { source?: string }).source;
    if (typeof sourceString === "string") {
      const parsed = parseFloat(sourceString);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const loadAvgKeyMap: Record<"1m" | "5m" | "15m", string[]> = {
  "1m": ["1m", "one_min", "one", "load1"],
  "5m": ["5m", "five_min", "five", "load5"],
  "15m": ["15m", "fifteen_min", "fifteen", "load15"],
};

const getLoadAverage = (loadavg: Record<string, unknown> | undefined, key: "1m" | "5m" | "15m") => {
  if (!loadavg) {
    return 0;
  }

  for (const candidate of loadAvgKeyMap[key]) {
    if (candidate in loadavg) {
      return toNumber(loadavg[candidate] as NumericLike, 0);
    }
  }

  return 0;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const getJitteredHistory = (history: number[], tick: number, variance = 1.2): number[] => {
  if (history.length === 0) {
    return history;
  }

  return history.map((value, index) => {
    const phase = tick + index;
    const jitter = Math.sin(phase * 0.45) * variance + Math.cos(phase * 0.18) * (variance / 1.6);
    return clamp(value + jitter, 0, 100);
  });
};

interface GpuVisualConfig {
  cardClass: string;
  gradientStart: string;
  gradientEnd: string;
  strokeColor: string;
  progressClass: string;
  badgeClass: string;
}

const getGpuVisualConfig = (memoryPercent: number): GpuVisualConfig => {
  if (memoryPercent >= 50) {
    return {
      cardClass: "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent rounded-lg border border-amber-500/40",
      gradientStart: "hsl(38 92% 55% / 0.35)",
      gradientEnd: "hsl(38 92% 55% / 0.06)",
      strokeColor: "hsl(38 92% 55%)",
      progressClass: "progress-amber",
      badgeClass: "bg-amber-500/20 text-amber-100 border border-amber-500/40",
    };
  }

  return {
    cardClass: "bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent rounded-lg border border-emerald-500/40",
    gradientStart: "hsl(142 76% 45% / 0.35)",
    gradientEnd: "hsl(142 76% 45% / 0.06)",
    strokeColor: "hsl(142 76% 45%)",
    progressClass: "progress-emerald",
    badgeClass: "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40",
  };
};

interface ServerCardProps {
  server: ServerStatus;
}

interface HistoricalData {
  cpuHistory: number[];
  memoryHistory: number[];
  gpuHistory: Record<number, number[]>;
}

const MAX_HISTORY_POINTS = 20;

export function ServerCard({ server }: ServerCardProps) {
  const isOnline = server.status === "ok";
  const uptimeDays = Math.floor(server.uptime_seconds / 86400);
  const [disksExpanded, setDisksExpanded] = useState(false);
  const [gpuProcessesExpanded, setGpuProcessesExpanded] = useState<Record<number, boolean>>({});
  const [animationTick, setAnimationTick] = useState(0);

  // Get enhanced status based on CPU/GPU usage and processes
  const statusInfo = getEnhancedStatus(server);
  const statusColors = getStatusColorClasses(statusInfo.status);
  const cpuPercent = toNumber(server.cpu?.percent, 0);
  const memoryPercent = toNumber(server.memory?.percent, 0);
  const memoryUsedGb = toNumber(server.memory?.used_gb, 0);
  const memoryTotalGb = toNumber(server.memory?.total_gb, 0);
  const loadAvg1m = getLoadAverage(server.cpu?.loadavg as Record<string, unknown>, "1m");
  const loadAvg5m = getLoadAverage(server.cpu?.loadavg as Record<string, unknown>, "5m");
  const loadAvg15m = getLoadAverage(server.cpu?.loadavg as Record<string, unknown>, "15m");

  // Store historical data using ref to persist across renders without causing re-renders
  const historyRef = useRef<HistoricalData>({
    cpuHistory: [],
    memoryHistory: [],
    gpuHistory: {}
  });

  const cpuHistoryBase = historyRef.current.cpuHistory.length > 0 ? historyRef.current.cpuHistory : [cpuPercent];
  const animatedCpuHistory = getJitteredHistory(cpuHistoryBase, animationTick, 1.1);

  // Update historical data when server data changes
  useEffect(() => {
    if (isOnline) {
      const history = historyRef.current;

      // Update CPU history
      history.cpuHistory.push(cpuPercent);
      if (history.cpuHistory.length > MAX_HISTORY_POINTS) {
        history.cpuHistory.shift();
      }

      // Update Memory history
      history.memoryHistory.push(memoryPercent);
      if (history.memoryHistory.length > MAX_HISTORY_POINTS) {
        history.memoryHistory.shift();
      }

      // Update GPU history
      server.gpus.forEach(gpu => {
        if (!history.gpuHistory[gpu.index]) {
          history.gpuHistory[gpu.index] = [];
        }
        history.gpuHistory[gpu.index].push(toNumber(gpu.utilization_pct, 0));
        if (history.gpuHistory[gpu.index].length > MAX_HISTORY_POINTS) {
          history.gpuHistory[gpu.index].shift();
        }
      });
    }
  }, [server, isOnline, cpuPercent, memoryPercent]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTick(tick => (tick + 1) % 3600);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Generate SVG path from historical data
  const generateChartPath = (history: number[], filled: boolean = false, tick: number = 0): string => {
    if (history.length < 2) {
      // Not enough data, return flat line
      const y = 100 - (history[0] || 0) * 0.8;
      return filled
        ? `M 0,${y} L 100,${y} L 100,100 L 0,100 Z`
        : `M 0,${y} L 100,${y}`;
    }

    const points = history.map((value, index) => {
      const x = (index / (history.length - 1)) * 100;
      // Add time-based fluctuation to make static values appear dynamic
      const fluctuation = Math.sin(tick * 0.02 + index * 0.5) * 3 + Math.cos(tick * 0.015 + index * 0.3) * 2;
      const y = 100 - (value + fluctuation) * 0.8; // Scale to fit nicely
      return { x, y: Math.max(0, Math.min(100, y)) }; // Clamp to prevent going out of bounds
    });

    // Create smooth curve using points
    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const controlX = (prev.x + curr.x) / 2;
      path += ` Q ${controlX},${prev.y} ${curr.x},${curr.y}`;
    }

    if (filled) {
      path += ` L 100,100 L 0,100 Z`;
    }

    return path;
  };

  const copySSH = async () => {
    const sshCommand = `ssh ${server.ip}`;

    try {
      // Try modern clipboard API first (requires secure context)
      await navigator.clipboard.writeText(sshCommand);
      toast.success("SSH command copied to clipboard");
    } catch (error) {
      // Fallback for browsers that don't support clipboard API or non-secure contexts
      try {
        const textArea = document.createElement('textarea');
        textArea.value = sshCommand;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          toast.success("SSH command copied to clipboard");
        } else {
          toast.error("Failed to copy SSH command");
        }
      } catch (fallbackError) {
        toast.error("Failed to copy SSH command");
        console.error("Clipboard fallback failed:", fallbackError);
      }
    }
  };

  const RenderOS = (os: string) => {
    // set lucide icon and text component based on os string
    if (os.toLowerCase().includes("ubuntu")) {
      return (
        <div className="flex items-center gap-2">
          <UbuntuIcon className="h-3.5 w-3.5" />
          <span>{os}</span>
        </div>
      );
    }

    return os;
  }

  return (
    <Card className={`glass-effect transition-all hover:border-primary/30 ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-5 bg-slate-900">
              <Activity className={`h-5 w-5 ${statusColors.text} ${statusColors.pulse}`} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Mitlab {server.server_alias}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{server.hostname}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{server.ip}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Badge
                variant={statusInfo.badgeVariant}
                className={`font-mono text-xs px-2 py-0.5 ${statusColors.badge}`}
              >
                {statusInfo.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={copySSH}>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy SSH
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isOnline && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {/* display latest time update from server.timestamp ex : Nov 7, 2025, 12:00 PM PST */}
                {server.timestamp
                  ? `${new Date(server.timestamp).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}`
                  : 'Unknown Time Update'
                }

              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isOnline && (
          <>
            {/* Quick Stats Grid with Background Pattern */}
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-4">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              <div className="relative grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <Computer className="h-3 w-3" />
                    <span>OS</span>
                  </div>
                  <div className="text-xs font-semibold">
                    {RenderOS(server.os)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <Clock className="h-3 w-3" />
                    <span>Uptime</span>
                  </div>
                  <p className="font-mono text-xs font-semibold">{uptimeDays}d {Math.floor((server.uptime_seconds % 86400) / 3600)}h</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <Cpu className="h-3 w-3" />
                    <span>CPU</span>
                  </div>
                  <p className="font-mono text-xs font-semibold">{cpuPercent.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* CPU Metrics with Mini Chart */}
            <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="cpu-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cpu-grid)" />
                </svg>
              </div>

              {/* Line chart visualization */}
              <div className="absolute inset-0 opacity-20">
                <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cpu-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={generateChartPath(animatedCpuHistory, true, animationTick)}
                    fill="url(#cpu-gradient)"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={generateChartPath(animatedCpuHistory, false, animationTick)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    className="chart-path"
                  />
                </svg>
              </div>

              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">CPU </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-muted-foreground">1m</span>
                    <span className="font-semibold">{loadAvg1m.toFixed(2)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">5m</span>
                    <span className="font-semibold">{loadAvg5m.toFixed(2)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">15m</span>
                    <span className="font-semibold">{loadAvg15m.toFixed(2)}</span>
                  </div>
                </div>
                <Progress value={cpuPercent} className="h-1.5 progress-primary" />
              </div>
            </div>

            {/* Memory with gradient background */}
            <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-transparent opacity-50"
                style={{
                  clipPath: `polygon(0 100%, 0 ${100 - memoryPercent}%, ${memoryPercent}% ${100 - memoryPercent * 0.7}%, 100% ${100 - memoryPercent * 0.4}%, 100% 100%)`
                }}
              />

              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <MemoryStick className="h-3 w-3" />
                    <span>Memory</span>
                  </div>
                  <span className="font-mono text-xs font-semibold">
                    {memoryUsedGb.toFixed(1)}GB / {memoryTotalGb.toFixed(1)}GB
                    <span className="text-muted-foreground ml-1.5 text-[11px]">({memoryPercent.toFixed(1)}%)</span>
                  </span>
                </div>
                <Progress value={memoryPercent} className="h-1.5 progress-emerald" />
              </div>
            </div>


            {server.gpus.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                  <Gauge className="h-4 w-4" />
                  <span>GPUs</span>
                </div>
                {server.gpus.map((gpu, i) => {
                  const gpuUtilPct = toNumber(gpu.utilization_pct, 0);
                  const gpuMemUsed = toNumber(gpu.memory_used_mb, 0);
                  const gpuMemTotal = toNumber(gpu.memory_total_mb, 0);
                  const gpuTemp = toNumber(gpu.temperature_celsius, 0);
                  const gpuFan = toNumber(gpu.fan_speed_pct, 0);
                  const gpuMemoryPercent = gpuMemTotal > 0 ? (gpuMemUsed / gpuMemTotal) * 100 : 0;
                  const gpuVisual = getGpuVisualConfig(gpuMemoryPercent);
                  const gpuHistoryRaw = historyRef.current.gpuHistory[gpu.index];
                  const gpuHistoryBase = gpuHistoryRaw && gpuHistoryRaw.length > 0 ? gpuHistoryRaw : [gpuUtilPct];
                  const animatedGpuHistory = getJitteredHistory(gpuHistoryBase, animationTick, 2.5);

                  return (
                    <div key={i} className={`relative overflow-hidden space-y-3 p-3 ${gpuVisual.cardClass}`}>
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id={`gpu-grid-${i}`} width="20" height="20" patternUnits="userSpaceOnUse">
                              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#gpu-grid-${i})`} />
                        </svg>
                      </div>

                      {/* Line chart visualization */}
                      <div className="absolute inset-0 opacity-15">
                        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`gpu-gradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={gpuVisual.gradientStart} />
                              <stop offset="100%" stopColor={gpuVisual.gradientEnd} />
                            </linearGradient>
                          </defs>
                          <path
                            d={generateChartPath(animatedGpuHistory, true, animationTick)}
                            fill={`url(#gpu-gradient-${i})`}
                            vectorEffect="non-scaling-stroke"
                          />
                          <path
                            d={generateChartPath(animatedGpuHistory, false, animationTick)}
                            fill="none"
                            stroke={gpuVisual.strokeColor}
                            strokeWidth="3"
                            vectorEffect="non-scaling-stroke"
                            className="chart-path"
                          />
                        </svg>
                      </div>

                      <div className="relative flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{gpu.name}</span>
                          <Badge variant="outline" className="text-xs">GPU {gpu.index}</Badge>
                        </div>
                        <Badge variant="secondary" className={`font-mono font-semibold ${gpuVisual.badgeClass}`}>
                          {gpuUtilPct.toFixed(1)}%
                        </Badge>
                      </div>

                      <div className="relative space-y-2">
                        <div className="relative flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MemoryStick className="h-3 w-3" />
                            <span>Memory</span>
                          </div>
                          <span className="font-mono font-semibold">
                            {gpuMemUsed.toFixed(0)}MB / {gpuMemTotal.toFixed(0)}MB
                          </span>
                        </div>
                        <Progress
                          value={gpuMemoryPercent}
                          className={`h-1.5 ${gpuVisual.progressClass}`}
                        />
                      </div>

                      <div className="relative grid grid-cols-3 gap-3 text-xs">
                        <div className="relative flex items-center gap-1.5 text-muted-foreground">
                          <Gauge className="h-3 w-3" />
                          <span>Memory Util: <span className="font-mono font-semibold text-foreground">{gpuMemoryPercent.toFixed(1)}%</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Thermometer className="h-3 w-3" />
                          <span>Temp: <span className="font-mono font-semibold text-foreground">{gpuTemp.toFixed(0)}°C</span></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Fan className="h-3 w-3" />
                          <span>Fan: <span className="font-mono font-semibold text-foreground">{gpuFan.toFixed(0)}%</span></span>
                        </div>
                      </div>

                      {gpu.processes.length > 0 && (
                        <div className="relative space-y-2 pt-2 border-t border-primary/10">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {gpu.processes.length} Process{gpu.processes.length !== 1 ? 'es' : ''}
                            </span>
                            {gpu.processes.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-2 text-xs relative z-10"
                                onClick={() => setGpuProcessesExpanded(prev => ({
                                  ...prev,
                                  [gpu.index]: !prev[gpu.index]
                                }))}
                              >
                                {gpuProcessesExpanded[gpu.index] ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <div className="space-y-1">
                            {gpu.processes.slice(0, gpuProcessesExpanded[gpu.index] ? gpu.processes.length : 1).map((proc, j) => (
                              <div key={j} className="text-xs bg-background/50 p-2 rounded">
                                <div className="flex justify-between items-center gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="font-mono text-primary font-semibold">{proc.pid}</span>
                                    {proc.type && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">
                                        {proc.type}
                                      </Badge>
                                    )}
                                    <span className="truncate text-muted-foreground font-mono max-w-[calc(100%-10rem)]">
                                      {proc.username}: {proc.cmd}
                                    </span>
                                  </div>
                                  <span className="font-mono font-semibold flex-shrink-0">{toNumber(proc.used_memory_mb, 0).toFixed(0)}MB</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {server.disks.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-[10px] text-sm text-muted-foreground font-semibold">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage Disks</span>
                </div>
                <div className="space-y-2">
                  {server.disks.slice(0, 3).map((disk, i) => {
                    const diskPercent = toNumber(disk.percent, 0);
                    const diskFreeGb = toNumber(disk.free_gb, 0);
                    const diskTotalGb = toNumber(disk.total_gb, 0);

                    return (
                      <div key={i} className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
                        {/* Background gradient chart */}
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent opacity-50"
                          style={{
                            clipPath: `polygon(0 100%, 0 ${100 - diskPercent}%, ${diskPercent}% ${100 - diskPercent * 0.75}%, 100% ${100 - diskPercent * 0.35}%, 100% 100%)`
                          }}
                        />

                        <div className="relative space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted-foreground max-w-[calc(100%-10rem)] truncate" title={disk.mountpoint}>
                              {disk.mountpoint}
                            </span>
                            <span className="font-mono text-xs font-semibold">
                              {diskFreeGb.toFixed(0)}GB / {diskTotalGb.toFixed(0)}GB
                              <span className="text-muted-foreground ml-1.5 text-[11px]">({diskPercent.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <Progress value={diskPercent} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}

                  {server.disks.length > 3 && (
                    <Collapsible open={disksExpanded} onOpenChange={setDisksExpanded}>
                      <CollapsibleContent className="space-y-2">
                        {server.disks.slice(3).map((disk, i) => {
                          const diskPercent = toNumber(disk.percent, 0);
                          const diskFreeGb = toNumber(disk.free_gb, 0);
                          const diskTotalGb = toNumber(disk.total_gb, 0);

                          return (
                            <div key={i + 3} className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
                              {/* Background gradient chart */}
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent opacity-50"
                                style={{
                                  clipPath: `polygon(0 100%, 0 ${100 - diskPercent}%, ${diskPercent}% ${100 - diskPercent * 0.75}%, 100% ${100 - diskPercent * 0.35}%, 100% 100%)`
                                }}
                              />

                              <div className="relative space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs text-muted-foreground max-w-[calc(100%-10rem)] truncate" title={disk.mountpoint}>
                                    {disk.mountpoint}
                                  </span>
                                  <span className="font-mono text-xs font-semibold">
                                    {diskFreeGb.toFixed(0)}GB / {diskTotalGb.toFixed(0)}GB
                                    <span className="text-muted-foreground ml-1.5 text-[11px]">({diskPercent.toFixed(1)}%)</span>
                                  </span>
                                </div>
                                <Progress value={diskPercent} className="h-1.5" />
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground mt-1">
                          {disksExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              Show less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              Show {server.disks.length - 3} more
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </div>
              </div>
            )}


            {server.users.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Logged Users</span>
                </div>
                <div className="space-y-1">
                  {server.users.map((user, i) => (
                    <div key={i} className="text-xs font-mono bg-secondary/50 p-2 rounded flex items-start gap-2">
                      <User className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                      <span>
                        <span className="text-primary font-semibold">{user.name}</span> @ {user.tty} from {user.host}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {
              server.users.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Logged Users</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    No users currently logged in.
                  </div>
                </div>
              )
            }

          </>
        )}

        {!isOnline && (
          <div className="text-center py-8">
            <p className="text-destructive font-semibold">Server is down</p>
            <p className="text-sm text-muted-foreground mt-2">Unable to retrieve metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
