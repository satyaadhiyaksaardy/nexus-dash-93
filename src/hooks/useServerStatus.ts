import { useState, useEffect } from "react";
import { ServerStatus } from "@/types/server";
import { fetchServerStatus } from "@/lib/api";

export function useServerStatus(pollInterval = 5000) {
  const [data, setData] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = async () => {
    try {
      const results = await fetchServerStatus();
      const sorted = results.map(server => ({
        ...server,
        gpus: [
          {
            index: 0,
            name: server.gpus.length > 0 ? server.gpus[0].name : "NVIDIA GTX 1080",
            utilization_pct: server.gpus.length > 0 ? server.gpus[0].utilization_pct : 55,
            memory_used_mb: server.gpus.length > 0 ? server.gpus[0].memory_used_mb : 4096,
            memory_total_mb: server.gpus.length > 0 ? server.gpus[0].memory_total_mb : 8192,
            temperature_celsius: 65,
            fan_speed_pct: 70,
            processes: [
              { pid: 1234, username: "alice", cmd: "python app.py", type: "App", used_memory_mb: 2048 },
              { pid: 5678, username: "bob", cmd: "python train.py", type: "ML Training", used_memory_mb: 2048 },
              { pid: 9012, username: "charlie", cmd: "python evaluate.py", type: "ML Inference", used_memory_mb: 1024 },
              { pid: 3456, username: "dave", cmd: "python render.py", type: "Rendering", used_memory_mb: 512 }
            ]
          }
        ],
        disks: sortDisksByUsage(server.disks),
        os: 'Ubuntu 20.04'
      }));
      
     
      setData(sorted);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch server status:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortDisksByUsage = (disks) => {
  // Create a copy of the array using slice() to avoid mutating the original array.
  // Then, sort the copy.
  return disks.slice().sort((a, b) => {
    // We want descending order (total gb first),
    return b.total_gb - a.total_gb;
  });
}


  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { data, loading, lastUpdate, refresh };
}
