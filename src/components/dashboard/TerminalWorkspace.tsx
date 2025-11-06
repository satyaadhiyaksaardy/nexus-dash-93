import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Terminal, Plus, X, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface TerminalSession {
  id: string;
  targetType: "host" | "vm" | "container";
  targetId: string;
  host?: string;
  connected: boolean;
}

interface TerminalWorkspaceProps {
  initialTarget?: { type: "host" | "vm" | "container"; id: string; host?: string };
}

export function TerminalWorkspace({ initialTarget }: TerminalWorkspaceProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  
  const [targetType, setTargetType] = useState<"host" | "vm" | "container">(
    initialTarget?.type || "host"
  );
  const [targetId, setTargetId] = useState(initialTarget?.id || "");
  const [host, setHost] = useState(initialTarget?.host || "");

  const openSession = () => {
    if (!targetId) {
      toast.error("Please select a target");
      return;
    }

    const newSession: TerminalSession = {
      id: `session-${Date.now()}`,
      targetType,
      targetId,
      host: targetType !== "host" ? host : undefined,
      connected: false
    };

    setSessions([...sessions, newSession]);
    setActiveSession(newSession.id);
    
    // Simulate WebSocket connection
    setTimeout(() => {
      setSessions(prev => prev.map(s => 
        s.id === newSession.id ? { ...s, connected: true } : s
      ));
      toast.success("Terminal session connected");
    }, 1000);
  };

  const closeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (activeSession === id) {
      setActiveSession(sessions[0]?.id || null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            New Terminal Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="vm">VM</SelectItem>
                <SelectItem value="container">Container</SelectItem>
              </SelectContent>
            </Select>

            {targetType !== "host" && (
              <Select value={host} onValueChange={setHost}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Parent Host" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpu-01">gpu-01</SelectItem>
                  <SelectItem value="web-01">web-01</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Input
              placeholder={`Target ${targetType} ID...`}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 min-w-[200px]"
            />

            <Button onClick={openSession} className="gap-2">
              <Plus className="h-4 w-4" />
              Open Session
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {sessions.length === 0 ? (
          <Card className="glass-effect">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active terminal sessions</p>
              <p className="text-sm mt-2">Configure a target above to open a new session</p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="glass-effect">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-mono">
                      {session.targetType} / {session.targetId}
                      {session.host && ` @ ${session.host}`}
                    </CardTitle>
                    <Badge 
                      variant={session.connected ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {session.connected ? "CONNECTED" : "CONNECTING"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => closeSession(session.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-background/90 rounded-lg p-4 font-mono text-sm h-[400px] overflow-y-auto border border-primary/20">
                  <div className="space-y-1">
                    <div className="text-success">
                      $ Connected to {session.targetId}
                    </div>
                    <div className="text-muted-foreground">
                      Welcome to the terminal session. WebSocket endpoint:{" "}
                      <span className="text-primary">
                        /ws/terminal?targetType={session.targetType}&targetId={session.targetId}
                        {session.host && `&host=${session.host}`}
                      </span>
                    </div>
                    <div className="text-warning mt-4">
                      ⚠ Sessions are proxied by the server. Commands are executed with your account permissions.
                    </div>
                    <div className="mt-4 text-muted-foreground">
                      ~ This is a mock terminal for demonstration. In production, this would connect via WebSocket.
                    </div>
                    <div className="mt-2">
                      <span className="text-primary">user@{session.targetId}:~$</span>{" "}
                      <span className="animate-pulse">█</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
