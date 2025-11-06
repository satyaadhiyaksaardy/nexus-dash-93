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

  // Store historical data using ref to persist across renders without causing re-renders
  const historyRef = useRef<HistoricalData>({
    cpuHistory: [],
    memoryHistory: [],
    gpuHistory: {}
  });

  // Update historical data when server data changes
  useEffect(() => {
    if (isOnline) {
      const history = historyRef.current;

      // Update CPU history
      history.cpuHistory.push(server.cpu.percent);
      if (history.cpuHistory.length > MAX_HISTORY_POINTS) {
        history.cpuHistory.shift();
      }

      // Update Memory history
      history.memoryHistory.push(server.memory.percent);
      if (history.memoryHistory.length > MAX_HISTORY_POINTS) {
        history.memoryHistory.shift();
      }

      // Update GPU history
      server.gpus.forEach(gpu => {
        if (!history.gpuHistory[gpu.index]) {
          history.gpuHistory[gpu.index] = [];
        }
        history.gpuHistory[gpu.index].push(gpu.utilization_pct);
        if (history.gpuHistory[gpu.index].length > MAX_HISTORY_POINTS) {
          history.gpuHistory[gpu.index].shift();
        }
      });
    }
  }, [server, isOnline]);

  // Generate SVG path from historical data
  const generateChartPath = (history: number[], filled: boolean = false): string => {
    if (history.length < 2) {
      // Not enough data, return flat line
      const y = 100 - (history[0] || 0) * 0.8;
      return filled
        ? `M 0,${y} L 100,${y} L 100,100 L 0,100 Z`
        : `M 0,${y} L 100,${y}`;
    }

    const points = history.map((value, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 100 - value * 0.8; // Scale to fit nicely
      return { x, y };
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

  const copySSH = () => {
    navigator.clipboard.writeText(`ssh ${server.ip}`);
    toast.success("SSH command copied to clipboard");
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
    <Card className={`glass-effect transition-all hover:border-primary/30 ${!isOnline && "border-destructive/50"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className={`h-5 w-5 ${isOnline ? "text-success animate-pulse" : "text-destructive"}`} />
            <div>
              <CardTitle className="text-base font-semibold">{server.server_alias}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{server.hostname} • {server.ip}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "default" : "destructive"} className="font-mono text-xs px-2 py-0.5">
                {isOnline ? "ONLINE" : "DOWN"}
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
                {new Date(server.timestamp).toLocaleTimeString()}
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
                  <p className="font-mono text-xs font-semibold">{server.cpu.percent.toFixed(1)}%</p>
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
                    d={generateChartPath(historyRef.current.cpuHistory, true)}
                    fill="url(#cpu-gradient)"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={generateChartPath(historyRef.current.cpuHistory, false)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
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
                    <span className="font-semibold">{server.cpu.loadavg["1m"].toFixed(2)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">5m</span>
                    <span className="font-semibold">{server.cpu.loadavg["5m"].toFixed(2)}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground">15m</span>
                    <span className="font-semibold">{server.cpu.loadavg["15m"].toFixed(2)}</span>
                  </div>
                </div>
                <Progress value={server.cpu.percent} className="h-1.5" />
              </div>
            </div>

            {/* Memory with gradient background */}
            <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-transparent opacity-50"
                style={{
                  clipPath: `polygon(0 100%, 0 ${100 - server.memory.percent}%, ${server.memory.percent}% ${100 - server.memory.percent * 0.7}%, 100% ${100 - server.memory.percent * 0.4}%, 100% 100%)`
                }}
              />

              <div className="relative space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <MemoryStick className="h-3 w-3" />
                    <span>Memory</span>
                  </div>
                  <span className="font-mono text-xs font-semibold">
                    {server.memory.used_gb.toFixed(1)}GB / {server.memory.total_gb}GB
                    <span className="text-muted-foreground ml-1.5 text-[11px]">({server.memory.percent.toFixed(1)}%)</span>
                  </span>
                </div>
                <Progress value={server.memory.percent} className="h-1.5" />
              </div>
            </div>


            {server.gpus.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-semibold">
                  <Gauge className="h-4 w-4" />
                  <span>GPUs</span>
                </div>
                {server.gpus.map((gpu, i) => (
                  <div key={i} className="relative overflow-hidden space-y-3 p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg border border-primary/20">
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
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path
                          d={generateChartPath(historyRef.current.gpuHistory[gpu.index] || [gpu.utilization_pct], true)}
                          fill={`url(#gpu-gradient-${i})`}
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={generateChartPath(historyRef.current.gpuHistory[gpu.index] || [gpu.utilization_pct], false)}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>

                    <div className="relative flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{gpu.name}</span>
                        <Badge variant="outline" className="text-xs">GPU {gpu.index}</Badge>
                      </div>
                      <Badge variant="secondary" className="font-mono font-semibold">
                        {gpu.utilization_pct}%
                      </Badge>
                    </div>

                    <div className="relative space-y-2">
                      <div className="relative flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MemoryStick className="h-3 w-3" />
                          <span>Memory</span>
                        </div>
                        <span className="font-mono font-semibold">
                          {gpu.memory_used_mb}MB / {gpu.memory_total_mb}MB
                        </span>
                      </div>
                      <Progress
                        value={(gpu.memory_used_mb / gpu.memory_total_mb) * 100}
                        className="h-1.5"
                      />
                    </div>

                    <div className="relative grid grid-cols-3 gap-3 text-xs">
                      <div className="relative flex items-center gap-1.5 text-muted-foreground">
                        <Gauge className="h-3 w-3" />
                        <span>Util: <span className="font-mono font-semibold text-foreground">{((gpu.memory_used_mb / gpu.memory_total_mb) * 100).toFixed(1)}%</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Thermometer className="h-3 w-3" />
                        <span>Temp: <span className="font-mono font-semibold text-foreground">{gpu.temperature_celsius ?? 0}°C</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Fan className="h-3 w-3" />
                        <span>Fan: <span className="font-mono font-semibold text-foreground">{gpu.fan_speed_pct ?? 0}%</span></span>
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
                                <span className="font-mono font-semibold flex-shrink-0">{proc.used_memory_mb}MB</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {server.disks.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-[10px] text-sm text-muted-foreground font-semibold">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage Disks</span>
                </div>
                <div className="space-y-2">
                  {server.disks.slice(0, 3).map((disk, i) => (
                    <div key={i} className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
                      {/* Background gradient chart */}
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent opacity-50"
                        style={{
                          clipPath: `polygon(0 100%, 0 ${100 - disk.percent}%, ${disk.percent}% ${100 - disk.percent * 0.75}%, 100% ${100 - disk.percent * 0.35}%, 100% 100%)`
                        }}
                      />

                      <div className="relative space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground max-w-[calc(100%-10rem)] truncate" title={disk.mountpoint}>
                            {disk.mountpoint}
                          </span>
                          <span className="font-mono text-xs font-semibold">
                            {disk.free_gb}GB / {disk.total_gb}GB
                            <span className="text-muted-foreground ml-1.5 text-[11px]">({disk.percent.toFixed(1)}%)</span>
                          </span>
                        </div>
                        <Progress value={disk.percent} className="h-1.5" />
                      </div>
                    </div>
                  ))}

                  {server.disks.length > 3 && (
                    <Collapsible open={disksExpanded} onOpenChange={setDisksExpanded}>
                      <CollapsibleContent className="space-y-2">
                        {server.disks.slice(3).map((disk, i) => (
                          <div key={i + 3} className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-3">
                            {/* Background gradient chart */}
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-transparent opacity-50"
                              style={{
                                clipPath: `polygon(0 100%, 0 ${100 - disk.percent}%, ${disk.percent}% ${100 - disk.percent * 0.75}%, 100% ${100 - disk.percent * 0.35}%, 100% 100%)`
                              }}
                            />

                            <div className="relative space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs text-muted-foreground max-w-[calc(100%-10rem)] truncate" title={disk.mountpoint}>
                                  {disk.mountpoint}
                                </span>
                                <span className="font-mono text-xs font-semibold">
                                  {disk.free_gb}GB / {disk.total_gb}GB
                                  <span className="text-muted-foreground ml-1.5 text-[11px]">({disk.percent.toFixed(1)}%)</span>
                                </span>
                              </div>
                              <Progress value={disk.percent} className="h-1.5" />
                            </div>
                          </div>
                        ))}
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
