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
      setData(results);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch server status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { data, loading, lastUpdate, refresh };
}
