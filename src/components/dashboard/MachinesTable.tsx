import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Server, HardDrive, Container, ChevronLeft, ChevronRight } from "lucide-react";

interface MachinesTableProps {
  machines: Machine[];
  searchQuery?: string;
  statusFilter?: string;
  typeFilter?: string;
  groupFilter?: string;
  onFiltersChange?: (filters: { status: string; type: string; group: string }) => void;
}

export function MachinesTable({
  machines,
  searchQuery = "",
  statusFilter = "all",
  typeFilter = "all",
  groupFilter = "all",
  onFiltersChange
}: MachinesTableProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localTypeFilter, setLocalTypeFilter] = useState(typeFilter);
  const [localGroupFilter, setLocalGroupFilter] = useState(groupFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Update local state when props change
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setLocalStatusFilter(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setLocalTypeFilter(typeFilter);
  }, [typeFilter]);

  useEffect(() => {
    setLocalGroupFilter(groupFilter);
  }, [groupFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [localSearch, localStatusFilter, localTypeFilter, localGroupFilter]);

  const handleFilterChange = (type: 'status' | 'type' | 'group', value: string) => {
    const newFilters = {
      status: type === 'status' ? value : localStatusFilter,
      type: type === 'type' ? value : localTypeFilter,
      group: type === 'group' ? value : localGroupFilter,
    };

    setLocalStatusFilter(newFilters.status);
    setLocalTypeFilter(newFilters.type);
    setLocalGroupFilter(newFilters.group);

    onFiltersChange?.(newFilters);
  };

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch =
        localSearch === "" ||
        machine.alias.toLowerCase().includes(localSearch.toLowerCase()) ||
        machine.ip.includes(localSearch) ||
        machine.labels.some(l => l.toLowerCase().includes(localSearch.toLowerCase()));

      const matchesStatus = localStatusFilter === "all" || machine.status === localStatusFilter;
      const matchesType = localTypeFilter === "all" || machine.type === localTypeFilter;
      const matchesGroup = localGroupFilter === "all" || machine.group === localGroupFilter;

      return matchesSearch && matchesStatus && matchesType && matchesGroup;
    });
  }, [machines, localSearch, localStatusFilter, localTypeFilter, localGroupFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMachines = filteredMachines.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={localStatusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
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

        <Select value={localTypeFilter} onValueChange={(value) => handleFilterChange('type', value)}>
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

        <Select value={localGroupFilter} onValueChange={(value) => handleFilterChange('group', value)}>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMachines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No machines found matching filters
                </TableCell>
              </TableRow>
            ) : (
              paginatedMachines.map((machine) => (
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredMachines.length)} of {filteredMachines.length} machines
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNumber > totalPages) return null;

                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {totalPages <= 1 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredMachines.length} of {machines.length} machines
        </div>
      )}
    </div>
  );
}