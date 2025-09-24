
"use client";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type EventHit = {
  idEvent: number;
  idUser: number;
  name: string
};

export function useEventSearch() {
  const [termEvents, setTermEvents] = useState("");
  const [resultsSearchEvents, setResultsSearchEvents] = useState<EventHit[]>([]);
  const [loadingSearchEvents, setLoadingSearchEvents] = useState(false);

  useEffect(() => {
    const q = termEvents.trim();
    if (q.length < 2) {
      setResultsSearchEvents([]);
      return;
    }

    const ac = new AbortController();
    setLoadingSearchEvents(true);

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/events/search?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal, credentials: "include", headers: { Accept: "application/json" } }
        );  
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setResultsSearchEvents(json?.data?.items ?? []);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      } finally {
        setLoadingSearchEvents(false);
      }
    }, 300); 

    return () => {
      clearTimeout(t);
      if (!ac.signal.aborted) ac.abort("cleanup");
    };
  }, [termEvents]);

  return { termEvents, setTermEvents, resultsSearchEvents, loadingSearchEvents };
}
