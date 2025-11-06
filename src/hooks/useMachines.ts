import { useState, useEffect } from "react";
import { Machine } from "@/types/server";
import { fetchMachines } from "@/lib/api";

export function useMachines() {
  const [data, setData] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const results = await fetchMachines();
      setData(results);
    } catch (error) {
      console.error("Failed to fetch machines:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, refresh };
}
