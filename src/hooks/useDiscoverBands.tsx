import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DiscoverBandOpening = {
  idSearch: number; idBand: number; bandName: string; title: string;
  idInstrument: number | null; instrumentName: string | null;
  createdAt: string; dist_km: number | null; score: number;
};

export function useDiscoverBands(limit = 12) {
  const [items, setItems] = useState<DiscoverBandOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_URL}/discover/bands?limit=${limit}`, { credentials: "include" });
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