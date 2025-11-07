import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Server, LogOut, User, Filter, X, History } from "lucide-react";
import { ClusterSummary } from "@/components/dashboard/ClusterSummary";
import { ServerCard } from "@/components/dashboard/ServerCard";
import { MachinesTable } from "@/components/dashboard/MachinesTable";
import { ContainersTab } from "@/components/dashboard/ContainersTab";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useMachines } from "@/hooks/useMachines";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ServerStatus } from "@/types/server";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getEnhancedStatus } from "@/lib/statusUtils";

const Index = () => {
  const { data: servers, loading: serversLoading, lastUpdate, refresh } = useServerStatus();
  const { data: machines, loading: machinesLoading, lastUpdate: machinesLastUpdate } = useMachines();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, signOut } = useAuth();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [serverStatusFilter, setServerStatusFilter] = useState<string>("all");
  const [machineStatusFilter, setMachineStatusFilter] = useState<string>("all");
  const [machineTypeFilter, setMachineTypeFilter] = useState<string>("all");
  const [machineGroupFilter, setMachineGroupFilter] = useState<string>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dashboard-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("dashboard-recent-searches", JSON.stringify(updated));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setServerStatusFilter("all");
    setMachineStatusFilter("all");
    setMachineTypeFilter("all");
    setMachineGroupFilter("all");
  };

  // Filtered data
  const filteredServers = useMemo(() => {
    const statusPriority: Record<string, number> = {
      "in-use": 0,
      "degraded": 1,
      "available": 2,
      "offline": 3,
    };

    const filtered = servers.filter((server) => {
      const matchesSearch = searchQuery === "" ||
        server.server_alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        server.ip.includes(searchQuery) ||
        server.os.toLowerCase().includes(searchQuery.toLowerCase());

      const enhancedStatus = getEnhancedStatus(server).status;
      const matchesStatus = serverStatusFilter === "all" ||
        serverStatusFilter === enhancedStatus;

      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const statusA = getEnhancedStatus(a).status;
      const statusB = getEnhancedStatus(b).status;

      if (statusA !== statusB) {
        return (statusPriority[statusA] ?? 99) - (statusPriority[statusB] ?? 99);
      }

      const maxGpuUsage = (server: ServerStatus) => {
        if (!server.gpus || server.gpus.length === 0) return 0;
        return Math.max(...server.gpus.map(gpu => {
          if (!gpu.memory_total_mb) return 0;
          return (gpu.memory_used_mb / gpu.memory_total_mb) * 100;
        }));
      };

      return maxGpuUsage(b) - maxGpuUsage(a);
    });
  }, [servers, searchQuery, serverStatusFilter]);

  const filteredMachines = useMemo(() => {
    return machines.filter((machine) => {
      const matchesSearch = searchQuery === "" ||
        machine.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.ip.includes(searchQuery) ||
        machine.os.toLowerCase().includes(searchQuery.toLowerCase()) ||
        machine.labels.some(l => l.toLowerCase().includes(searchQuery.toLowerCase())) ||
        machine.group.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = machineStatusFilter === "all" || machine.status === machineStatusFilter;
      const matchesType = machineTypeFilter === "all" || machine.type === machineTypeFilter;
      const matchesGroup = machineGroupFilter === "all" || machine.group === machineGroupFilter;

      return matchesSearch && matchesStatus && matchesType && matchesGroup;
    });
  }, [machines, searchQuery, machineStatusFilter, machineTypeFilter, machineGroupFilter]);

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    saveRecentSearch(query);
    setShowRecentSearches(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit(searchQuery);
    } else if (e.key === "Escape") {
      setShowRecentSearches(false);
    }
  };

  const removeRecentSearch = (searchToRemove: string) => {
    const updated = recentSearches.filter(s => s !== searchToRemove);
    setRecentSearches(updated);
    localStorage.setItem("dashboard-recent-searches", JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("dashboard-recent-searches");
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                {/* image logo for react */}
                <img className="p-2" src="logo-nexus.png" alt="Mitlab Nexus" />

              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  Mitlab Nexus
                </h1>
                {lastUpdate && (
                  <p className="text-sm text-muted-foreground font-mono">
                    Internal Server Dashboard
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search and Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search servers & machines..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => setShowRecentSearches(true)}
                    onBlur={() => setTimeout(() => setShowRecentSearches(false), 200)}
                    className="pl-10 w-[280px]"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {showRecentSearches && recentSearches.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-[280px] bg-popover border border-border rounded-md shadow-md z-50">
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Recent Searches</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearRecentSearches}
                            className="h-6 px-2 text-xs"
                          >
                            Clear all
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {recentSearches.map((search, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer"
                              onClick={() => handleSearchSubmit(search)}
                            >
                              <div className="flex items-center gap-2">
                                <History className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{search}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRecentSearch(search);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filters Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <Filter className="h-4 w-4" />
                      {(serverStatusFilter !== "all" || machineStatusFilter !== "all" || machineTypeFilter !== "all" || machineGroupFilter !== "all") && (
                        <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Filters</h4>
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear all
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Server Status</label>
                          <Select value={serverStatusFilter} onValueChange={setServerStatusFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="in-use">In Use</SelectItem>
                              <SelectItem value="degraded">Degraded</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Machine Status</label>
                          <Select value={machineStatusFilter} onValueChange={setMachineStatusFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                              <SelectItem value="degraded">Degraded</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Machine Type</label>
                          <Select value={machineTypeFilter} onValueChange={setMachineTypeFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="host">Host</SelectItem>
                              <SelectItem value="vm">VM</SelectItem>
                              <SelectItem value="container">Container</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Machine Group</label>
                          <Select value={machineGroupFilter} onValueChange={setMachineGroupFilter}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Groups</SelectItem>
                              {Array.from(new Set(machines.map(m => m.group))).map(group => (
                                <SelectItem key={group} value={group}>{group}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Active Filters Display */}
                      <div className="pt-2 border-t">
                        <div className="flex flex-wrap gap-1">
                          {serverStatusFilter !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Server: {serverStatusFilter}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 ml-1 p-0"
                                onClick={() => setServerStatusFilter("all")}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          )}
                          {machineStatusFilter !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Machine: {machineStatusFilter}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 ml-1 p-0"
                                onClick={() => setMachineStatusFilter("all")}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          )}
                          {machineTypeFilter !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Type: {machineTypeFilter}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 ml-1 p-0"
                                onClick={() => setMachineTypeFilter("all")}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          )}
                          {machineGroupFilter !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Group: {machineGroupFilter}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 ml-1 p-0"
                                onClick={() => setMachineGroupFilter("all")}
                              >
                                <X className="h-2 w-2" />
                              </Button>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={refresh} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">My Account</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {serversLoading || machinesLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <ClusterSummary servers={filteredServers} machines={filteredMachines} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-card/50 border border-border/50 p-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="machines">Machines</TabsTrigger>
                <TabsTrigger value="containers">Containers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredServers.map((server) => (
                    <ServerCard
                      key={server.server_alias}
                      server={server}
                    />
                  ))}
                </div>
                {filteredServers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No servers match the current filters
                  </div>
                )}
              </TabsContent>

              <TabsContent value="machines">
                <MachinesTable
                  machines={filteredMachines}
                  searchQuery={searchQuery}
                  statusFilter={machineStatusFilter}
                  typeFilter={machineTypeFilter}
                  groupFilter={machineGroupFilter}
                  onFiltersChange={(filters) => {
                    setMachineStatusFilter(filters.status);
                    setMachineTypeFilter(filters.type);
                    setMachineGroupFilter(filters.group);
                  }}
                />
              </TabsContent>

              <TabsContent value="containers">
                <ContainersTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
