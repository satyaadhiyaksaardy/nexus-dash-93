import { useState, useEffect } from "react";
import { Container } from "@/types/server";
import { fetchContainers, fetchHosts } from "@/lib/api";
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
import { RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ContainersTab() {
  const [hosts, setHosts] = useState<{ alias: string; hostname: string; ip: string; status: string }[]>([]);
  const [selectedHost, setSelectedHost] = useState<string>("");
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available hosts on mount
  useEffect(() => {
    const loadHosts = async () => {
      const hostList = await fetchHosts();
      setHosts(hostList);
      if (hostList.length > 0 && !selectedHost) {
        setSelectedHost(hostList[0].alias);
      }
    };
    loadHosts();
  }, []);

  // Load containers when host changes
  useEffect(() => {
    if (selectedHost) {
      loadContainers();
    }
  }, [selectedHost]);

  const loadContainers = async () => {
    if (!selectedHost) return;
    setLoading(true);
    const data = await fetchContainers(selectedHost);
    setContainers(data);
    setLoading(false);
  };


  const getStateVariant = (state: string) => {
    switch (state) {
      case "running": return "default";
      case "exited": return "secondary";
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
            <SelectValue placeholder="Select host..." />
          </SelectTrigger>
          <SelectContent>
            {hosts.map((host) => (
              <SelectItem key={host.alias} value={host.alias}>
                {host.alias} ({host.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadContainers}>
          <RotateCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Ports</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memory</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-20 w-full" />
                </TableCell>
              </TableRow>
            ) : containers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No containers on selected host
                </TableCell>
              </TableRow>
            ) : (
              containers.map((container) => (
                <TableRow key={container.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono font-semibold">{container.name}</TableCell>
                  <TableCell className="font-mono text-sm">{container.image}</TableCell>
                  <TableCell>
                    <Badge variant={getStateVariant(container.state)} className="font-mono text-xs">
                      {container.state.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(container.created).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{container.ports || "—"}</TableCell>
                  <TableCell className="font-mono">{container.cpu_pct.toFixed(1)}%</TableCell>
                  <TableCell className="font-mono">{container.mem_mb}MB</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
