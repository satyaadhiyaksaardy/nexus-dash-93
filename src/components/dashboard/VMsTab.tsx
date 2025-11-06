import { useState, useEffect } from "react";
import { VM } from "@/types/server";
import { fetchVMs, controlVM } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Square, RotateCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface VMsTabProps {
  onOpenTerminal: (vmId: string, host: string) => void;
}

export function VMsTab({ onOpenTerminal }: VMsTabProps) {
  const [selectedHost, setSelectedHost] = useState("gpu-01");
  const [vms, setVMs] = useState<VM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVMs();
  }, [selectedHost]);

  const loadVMs = async () => {
    setLoading(true);
    const data = await fetchVMs(selectedHost);
    setVMs(data);
    setLoading(false);
  };

  const handleAction = async (id: string, action: "start" | "stop" | "restart") => {
    const result = await controlVM(selectedHost, id, action);
    if (result.ok) {
      toast.success(`VM ${action} successful`);
      loadVMs();
    } else {
      toast.error(`Failed to ${action} VM`);
    }
  };

  const getStateVariant = (state: string) => {
    switch (state) {
      case "running": return "default";
      case "stopped": return "secondary";
      case "paused": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Host:</label>
        <Select value={selectedHost} onValueChange={setSelectedHost}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpu-01">gpu-01</SelectItem>
            <SelectItem value="web-01">web-01</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadVMs}>
          <RotateCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-20 w-full" />
                </TableCell>
              </TableRow>
            ) : vms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No VMs on selected host
                </TableCell>
              </TableRow>
            ) : (
              vms.map((vm) => (
                <TableRow key={vm.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold">{vm.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStateVariant(vm.state)} className="font-mono text-xs">
                      {vm.state.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{vm.ip}</TableCell>
                  <TableCell className="font-mono">{vm.cpu_pct.toFixed(1)}%</TableCell>
                  <TableCell className="font-mono">{(vm.mem_mb / 1024).toFixed(1)}GB</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {vm.state !== "running" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAction(vm.id, "start")}
                          className="h-8 w-8 p-0"
                        >
                          <Play className="h-4 w-4 text-success" />
                        </Button>
                      )}
                      {vm.state === "running" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(vm.id, "stop")}
                            className="h-8 w-8 p-0"
                          >
                            <Square className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAction(vm.id, "restart")}
                            className="h-8 w-8 p-0"
                          >
                            <RotateCw className="h-4 w-4 text-warning" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenTerminal(vm.id, selectedHost)}
                        className="h-8 w-8 p-0"
                      >
                        <Terminal className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
