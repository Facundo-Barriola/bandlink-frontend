import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DiscoverStudio = {
  idUser: number; displayName: string;
  dist_km: number | null; rating_avg: number | null; rating_cnt: number; score: number;
};

export function useDiscoverStudios(limit = 9) {
  const [items, setItems] = useState<DiscoverStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/discover/studios?limit=${limit}`, { credentials: "include" });
        const j = await r.json();
        if (!r.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${r.status}`);
        if (!abort) setItems(j.data.items ?? j.data ?? []);
      } catch (e:any) {
        if (!abort) setError(e?.message ?? "Error");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [limit]);

  return { items, loading, error };
}