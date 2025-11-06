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
        disks: sortDisksByUsage(server.disks || [])
      }));

      setData(sorted);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch server status:", error);
    } finally {
      setLoading(false);
    }
  };

  const sortDisksByUsage = (disks: Array<{total_gb: number; [key: string]: any}>) => {
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
