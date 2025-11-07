import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ServerStatus, Machine } from "@/types/server";
import { Server, CheckCircle2, XCircle, Cpu, MemoryStick, Activity, AlertTriangle, Gauge } from "lucide-react";
import { getEnhancedStatus } from "@/lib/statusUtils";

interface ClusterSummaryProps {
  servers: ServerStatus[];
  machines: Machine[];
}

export function ClusterSummary({ servers, machines: _machines }: ClusterSummaryProps) {
  // Calculate enhanced status counts
  const availableCount = servers.filter(s => getEnhancedStatus(s).status === "available").length;
  const inUseCount = servers.filter(s => getEnhancedStatus(s).status === "in-use").length;
  const degradedCount = servers.filter(s => getEnhancedStatus(s).status === "degraded").length;
  const offlineCount = servers.filter(s => getEnhancedStatus(s).status === "offline").length;

  const avgCpu = servers.length > 0
    ? servers.reduce((acc, s) => acc + s.cpu.percent, 0) / servers.length
    : 0;
  const avgMem = servers.length > 0
    ? servers.reduce((acc, s) => acc + s.memory.percent, 0) / servers.length
    : 0;

  // Calculate average GPU memory usage across all GPUs
  const gpuUsage = servers.reduce(
    (acc, server) => {
      if (server.gpus.length > 0) {
        const peakMemoryUsage = Math.max(
          ...server.gpus.map(gpu => {
            if (!gpu.memory_total_mb) {
              return 0;
            }
            return (gpu.memory_used_mb / gpu.memory_total_mb) * 100;
          })
        );

        return {
          sum: acc.sum + peakMemoryUsage,
          count: acc.count + 1,
        };
      }

      return acc;
    },
    { sum: 0, count: 0 }
  );

  const avgGpuMem = gpuUsage.count > 0 ? gpuUsage.sum / gpuUsage.count : 0;

  const metricsCards = [
    {
      icon: Server,
      label: "Total Servers",
      value: servers.length,
      color: "text-primary"
    },
    {
      icon: MemoryStick,
      label: "Avg Memory",
      value: `${avgMem.toFixed(1)}%`,
      progress: avgMem,
      color: "text-primary"
    },
    {
      icon: Cpu,
      label: "Avg CPU",
      value: `${avgCpu.toFixed(1)}%`,
      progress: avgCpu,
      color: "text-primary"
    },
    {
      icon: Gauge,
      label: "Avg GPU",
      value: `${avgGpuMem.toFixed(1)}%`,
      progress: avgGpuMem,
      color: "text-primary"
    }
  ];

  const statusCards = [
    {
      icon: CheckCircle2,
      label: "Available",
      value: availableCount,
      color: "text-emerald-600 dark:text-emerald-500"
    },
    {
      icon: Activity,
      label: "In Use",
      value: inUseCount,
      color: "text-amber-600 dark:text-amber-500"
    },
    {
      icon: AlertTriangle,
      label: "Degraded",
      value: degradedCount,
      color: "text-yellow-600 dark:text-yellow-500"
    },
    {
      icon: XCircle,
      label: "Offline",
      value: offlineCount,
      color: "text-destructive"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Left Side - Metrics */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cluster Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          {metricsCards.map((card, i) => (
            <Card key={i} className="glass-effect border-border/50 hover:border-primary/30 transition-all h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Side - Status */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Server Status</h3>
        <div className="grid grid-cols-2 gap-4">
          {statusCards.map((card, i) => (
            <Card key={i} className="glass-effect border-border/50 hover:border-primary/30 transition-all h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between mb-2">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold font-mono">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
