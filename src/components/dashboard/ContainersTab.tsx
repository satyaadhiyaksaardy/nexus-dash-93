import { useState, useEffect, useMemo, useCallback } from "react";
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
import { RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ContainersTab() {
  const [hosts, setHosts] = useState<{ alias: string; hostname: string; ip: string; status: string }[]>([]);
  const [selectedHost, setSelectedHost] = useState<string>("");
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Reset to first page when containers change
  useEffect(() => {
    setCurrentPage(1);
  }, [containers]);

  const loadContainers = useCallback(async () => {
    if (!selectedHost) return;
    setLoading(true);
    const data = await fetchContainers(selectedHost);
    setContainers(data);
    setLoading(false);
  }, [selectedHost]);

  // Load containers when host changes
  useEffect(() => {
    if (selectedHost) {
      loadContainers();
    }
  }, [selectedHost, loadContainers]);

  // Pagination logic
  const totalPages = Math.ceil(containers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContainers = containers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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
              paginatedContainers.map((container) => (
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
              Showing {startIndex + 1}-{Math.min(endIndex, containers.length)} of {containers.length} containers
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

      {totalPages <= 1 && !loading && containers.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {containers.length} containers
        </div>
      )}
    </div>
  );
}