import { useState, useMemo } from "react";
import { Machine } from "@/types/server";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Terminal, Search, Server, HardDrive, Container } from "lucide-react";

interface MachinesTableProps {
  machines: Machine[];
  onOpenTerminal: (machineId: string) => void;
}

export function MachinesTable({ machines, onOpenTerminal }: MachinesTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch = 
        search === "" ||
        machine.alias.toLowerCase().includes(search.toLowerCase()) ||
        machine.ip.includes(search) ||
        machine.labels.some(l => l.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || machine.status === statusFilter;
      const matchesType = typeFilter === "all" || machine.type === typeFilter;
      const matchesGroup = groupFilter === "all" || machine.group === groupFilter;

      return matchesSearch && matchesStatus && matchesType && matchesGroup;
    });
  }, [machines, search, statusFilter, typeFilter, groupFilter]);

  const groups = Array.from(new Set(machines.map(m => m.group)));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "host": return <Server className="h-4 w-4" />;
      case "vm": return <HardDrive className="h-4 w-4" />;
      case "container": return <Container className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "online": return "default";
      case "offline": return "destructive";
      case "degraded": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by alias, IP, or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="host">Host</SelectItem>
            <SelectItem value="vm">VM</SelectItem>
            <SelectItem value="container">Container</SelectItem>
          </SelectContent>
        </Select>

        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups.map(group => (
              <SelectItem key={group} value={group}>{group}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Alias</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>OS</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No machines found matching filters
                </TableCell>
              </TableRow>
            ) : (
              filteredMachines.map((machine) => (
                <TableRow key={machine.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Badge variant={getStatusVariant(machine.status)} className="font-mono text-xs">
                      {machine.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{machine.alias}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(machine.type)}
                      <span className="capitalize">{machine.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{machine.group}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {machine.parent || "—"}
                  </TableCell>
                  <TableCell className="font-mono">{machine.ip}</TableCell>
                  <TableCell>{machine.os}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {machine.labels.map((label, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenTerminal(machine.id)}
                      className="h-8"
                    >
                      <Terminal className="h-4 w-4 mr-1" />
                      Terminal
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredMachines.length} of {machines.length} machines
      </div>
    </div>
  );
}
