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
import { ServerStatus } from "@/types/server";
import { MoreVertical, Copy, Activity } from "lucide-react";
import { toast } from "sonner";

interface ServerCardProps {
  server: ServerStatus;
}

export function ServerCard({ server }: ServerCardProps) {
  const isOnline = server.status === "ok";
  const uptimeDays = Math.floor(server.uptime_seconds / 86400);

  const copySSH = () => {
    navigator.clipboard.writeText(`ssh ${server.ip}`);
    toast.success("SSH command copied to clipboard");
  };

  return (
    <Card className={`glass-effect transition-all hover:border-primary/30 ${!isOnline && "border-destructive/50"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className={`h-4 w-4 ${isOnline ? "text-success animate-pulse" : "text-destructive"}`} />
              {server.server_alias}
            </CardTitle>
            <p className="text-sm text-muted-foreground terminal-font">{server.hostname} • {server.ip}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="font-mono">
              {isOnline ? "ONLINE" : "DOWN"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copySSH}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy SSH
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOnline && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-mono">{uptimeDays}d {Math.floor((server.uptime_seconds % 86400) / 3600)}h</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-mono">{server.cpu.percent.toFixed(1)}%</span>
              </div>
              <Progress value={server.cpu.percent} className="h-2" />
              <div className="flex gap-2 text-xs text-muted-foreground font-mono">
                <span>1m: {server.cpu.loadavg["1m"]}</span>
                <span>5m: {server.cpu.loadavg["5m"]}</span>
                <span>15m: {server.cpu.loadavg["15m"]}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-mono">{server.memory.used_gb.toFixed(1)}GB / {server.memory.total_gb}GB</span>
              </div>
              <Progress value={server.memory.percent} className="h-2" />
            </div>

            {server.disks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Disks</p>
                <div className="space-y-2">
                  {server.disks.map((disk, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-muted-foreground">{disk.mountpoint}</span>
                        <span className="font-mono">{disk.free_gb}GB / {disk.total_gb}GB</span>
                      </div>
                      <Progress value={disk.percent} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {server.users.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Logged Users</p>
                <div className="space-y-1">
                  {server.users.map((user, i) => (
                    <div key={i} className="text-xs font-mono bg-secondary/50 p-2 rounded">
                      <span className="text-primary">{user.name}</span> @ {user.tty} from {user.host}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {server.gpus.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground font-semibold">GPUs</p>
                {server.gpus.map((gpu, i) => (
                  <div key={i} className="space-y-2 p-3 bg-gradient-to-br from-primary/10 to-transparent rounded-lg border border-primary/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm font-semibold">{gpu.name}</p>
                        <p className="text-xs text-muted-foreground">GPU {gpu.index}</p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {gpu.utilization_pct}%
                      </Badge>
                    </div>
                    <Progress value={gpu.utilization_pct} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>Memory: {gpu.memory_used_mb}MB / {gpu.memory_total_mb}MB</span>
                      <span>{((gpu.memory_used_mb / gpu.memory_total_mb) * 100).toFixed(1)}%</span>
                    </div>
                    {gpu.processes.length > 0 && (
                      <div className="space-y-1 pt-2">
                        <p className="text-xs text-muted-foreground">Processes:</p>
                        {gpu.processes.map((proc, j) => (
                          <div key={j} className="text-xs font-mono bg-background/50 p-2 rounded flex justify-between">
                            <span className="truncate flex-1">
                              <span className="text-primary">{proc.username}</span>: {proc.cmd}
                            </span>
                            <span className="text-muted-foreground ml-2">{proc.used_memory_mb}MB</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground font-mono">
                Last update: {new Date(server.timestamp).toLocaleTimeString()}
              </p>
            </div>
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
