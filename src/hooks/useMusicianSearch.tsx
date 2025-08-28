// app/(discover)/useMusicianSearch.ts
"use client";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type MusicianHit = {
  idMusician: number;
  idUser: number;
  displayName: string;
  avatarUrl: string | null;
  instruments: string[];
  genres: string[];
};

export function useMusicianSearch() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<MusicianHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/directory/musicians/search?q=${encodeURIComponent(q)}&limit=8`,
          { signal: ac.signal, credentials: "include", headers: { Accept: "application/json" } }
        );  
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setResults(json?.data?.items ?? []);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300); 

    return () => {
      clearTimeout(t);
      if (!ac.signal.aborted) ac.abort("cleanup");
    };
  }, [term]);

  return { term, setTerm, results, loading };
}
