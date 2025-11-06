import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Server, LogOut, User } from "lucide-react";
import { ClusterSummary } from "@/components/dashboard/ClusterSummary";
import { ServerCard } from "@/components/dashboard/ServerCard";
import { MachinesTable } from "@/components/dashboard/MachinesTable";
import { ContainersTab } from "@/components/dashboard/ContainersTab";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useMachines } from "@/hooks/useMachines";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Index = () => {
  const { data: servers, loading: serversLoading, lastUpdate, refresh } = useServerStatus();
  const { data: machines, loading: machinesLoading } = useMachines();
  const [activeTab, setActiveTab] = useState("overview");
  const { user, signOut } = useAuth();

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
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <Server className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Server Dashboard</h1>
                {lastUpdate && (
                  <p className="text-sm text-muted-foreground font-mono">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search machines..."
                  className="pl-10 w-[250px]"
                />
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
            <ClusterSummary servers={servers} machines={machines} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-card/50 border border-border/50 p-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="machines">Machines</TabsTrigger>
                <TabsTrigger value="containers">Containers</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {servers.map((server) => (
                    <ServerCard
                      key={server.server_alias}
                      server={server}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="machines">
                <MachinesTable
                  machines={machines}
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
