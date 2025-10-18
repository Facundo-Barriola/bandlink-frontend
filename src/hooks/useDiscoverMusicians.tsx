import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DiscoverMusician = {
  idUser: number; idMusician: number; displayName: string; avatarUrl: string | null;
  dist_km: number | null; score: number;
  genre_matches: number; inst_matches: number;
};

export function useDiscoverMusicians(limit = 12) {
  const [items, setItems] = useState<DiscoverMusician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/discover/musicians?limit=${limit}`, { credentials: "include" });
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