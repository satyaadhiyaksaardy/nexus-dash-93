import { ServerStatus } from "@/types/server";

export type EnhancedStatus = "available" | "in-use" | "degraded" | "offline";

export interface StatusInfo {
  status: EnhancedStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Calculate enhanced status based on comprehensive system metrics.
 */
export function getEnhancedStatus(server: ServerStatus): StatusInfo {
  // Server is offline
  if (server.status === "down") {
    return {
      status: "offline",
      label: "OFFLINE",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/50",
      badgeVariant: "destructive",
    };
  }

  // Server is online, analyze multiple metrics for comprehensive status
  const cpuPercent = server.cpu?.percent || 0;
  const memoryPercent = server.memory?.percent || 0;

  // Calculate GPU metrics
  const gpuUtilization = server.gpus && server.gpus.length > 0
    ? Math.max(...server.gpus.map(gpu => gpu.utilization_pct || 0))
    : 0;

  const gpuMemoryUtilization = server.gpus && server.gpus.length > 0
    ? Math.max(...server.gpus.map(gpu => {
        if (!gpu.memory_total_mb) return 0;
        return (gpu.memory_used_mb / gpu.memory_total_mb) * 100;
      }))
    : 0;

  // Calculate overall system load (weighted average)
  const overallLoad = (
    cpuPercent * 0.4 +           // CPU weight: 40%
    memoryPercent * 0.3 +        // Memory weight: 30%
    gpuUtilization * 0.15 +      // GPU utilization weight: 15%
    gpuMemoryUtilization * 0.15  // GPU memory weight: 15%
  );

  // Degraded: High overall load or critical resource usage
  if (overallLoad >= 85 || cpuPercent >= 95 || memoryPercent >= 95 || gpuMemoryUtilization >= 95) {
    return {
      status: "degraded",
      label: "DEGRADED",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/50",
      badgeVariant: "outline",
    };
  }

  // In-use: Moderate to high resource usage
  if (overallLoad >= 30 || cpuPercent >= 50 || memoryPercent >= 60 || gpuMemoryUtilization >= 50) {
    return {
      status: "in-use",
      label: "IN USE",
      color: "text-amber-600 dark:text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/40",
      badgeVariant: "secondary",
    };
  }

  // Available: Low resource usage across all metrics
  return {
    status: "available",
    label: "AVAILABLE",
    color: "text-emerald-600 dark:text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/50",
    badgeVariant: "default",
  };
}

/**
 * Get status color classes for UI elements
 */
export function getStatusColorClasses(status: EnhancedStatus) {
  switch (status) {
    case "available":
      return {
        text: "text-emerald-600 dark:text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/50",
        badge: "bg-emerald-500 hover:bg-emerald-600",
        pulse: "animate-pulse",
      };
    case "in-use":
      return {
        text: "text-amber-600 dark:text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/50",
        badge: "bg-amber-500 hover:bg-amber-600",
        pulse: "",
      };
    case "degraded":
      return {
        text: "text-yellow-600 dark:text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/50",
        badge: "bg-yellow-500 hover:bg-yellow-600",
        pulse: "",
      };
    case "offline":
      return {
        text: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/50",
        badge: "bg-destructive hover:bg-destructive/90",
        pulse: "",
      };
  }
}
