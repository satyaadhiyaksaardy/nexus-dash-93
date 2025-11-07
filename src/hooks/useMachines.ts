import { useState, useEffect } from "react";
import { Machine } from "@/types/server";
import { fetchMachines } from "@/lib/api";

export function useMachines(pollInterval = 5000) {
  const [data, setData] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = async () => {
    try {
      const results = await fetchMachines();
      setData(results);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch machines:", error);
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
