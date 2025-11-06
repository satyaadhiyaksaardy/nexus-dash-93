import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ServerStatus, Machine } from "@/types/server";
import { Server, CheckCircle2, XCircle, Container, HardDrive, Cpu, MemoryStick } from "lucide-react";

interface ClusterSummaryProps {
  servers: ServerStatus[];
  machines: Machine[];
}

export function ClusterSummary({ servers, machines }: ClusterSummaryProps) {
  const onlineCount = servers.filter(s => s.status === "ok").length;
  const offlineCount = servers.filter(s => s.status === "down").length;
  const totalContainers = machines.filter(m => m.type === "container" && m.status === "online").length;
  const totalVMs = machines.filter(m => m.type === "vm" && m.status === "online").length;
  
  const avgCpu = servers.length > 0 
    ? servers.reduce((acc, s) => acc + s.cpu.percent, 0) / servers.length 
    : 0;
  const avgMem = servers.length > 0
    ? servers.reduce((acc, s) => acc + s.memory.percent, 0) / servers.length
    : 0;

  const cards = [
    {
      icon: Server,
      label: "Total Machines",
      value: servers.length,
      color: "text-primary"
    },
    {
      icon: CheckCircle2,
      label: "Online",
      value: onlineCount,
      color: "text-success"
    },
    {
      icon: XCircle,
      label: "Offline",
      value: offlineCount,
      color: "text-destructive"
    },
    {
      icon: Container,
      label: "Containers",
      value: totalContainers,
      color: "text-chart-4"
    },
    {
      icon: Cpu,
      label: "Avg CPU",
      value: `${avgCpu.toFixed(1)}%`,
      progress: avgCpu,
      color: "text-primary"
    },
    {
      icon: MemoryStick,
      label: "Avg Memory",
      value: `${avgMem.toFixed(1)}%`,
      progress: avgMem,
      color: "text-primary"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, i) => (
        <Card key={i} className="glass-effect border-border/50 hover:border-primary/30 transition-all">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold font-mono">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              {card.progress !== undefined && (
                <Progress value={card.progress} className="h-1.5 mt-2" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
