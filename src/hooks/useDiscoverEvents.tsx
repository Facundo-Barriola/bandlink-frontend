"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type DiscoverEvent = {
  idEvent: number;
  name: string;
  description: string | null;
  visibility: string;
  capacityMax: number | null;
  idAddress: number | null;
  startsAt: string;  // ISO
  endsAt: string | null;

  // señales que devuelve el backend de /discover/events
  dist_km: number | null;
  genre_score: number;
  proximity_score: number;
  recency_score: number;
  popularity_score: number;
  score: number;
};

type ApiResponse = { ok: boolean; data?: { items?: DiscoverEvent[] } };

export function useDiscoverEvents(opts?: { limit?: number; days?: number }) {
  const limit = Math.max(1, Math.min(opts?.limit ?? 12, 50));
  const days = Math.max(1, Math.min(opts?.days ?? 60, 90));

  const [items, setItems] = useState<DiscoverEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // para poder refrescar manualmente

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const url = `${API}/discover/events?limit=${limit}&days=${days}`;
        const res = await fetch(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: ac.signal,
        });

        const json = (await res.json().catch(() => ({}))) as ApiResponse | any;
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

        const list = (json as ApiResponse)?.data?.items ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "No se pudieron cargar eventos");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [limit, days, tick]);

  const refresh = () => setTick((x) => x + 1);

  return { items, loading, error, refresh };
}
