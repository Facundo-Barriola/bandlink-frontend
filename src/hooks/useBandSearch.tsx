"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type BandHit = {
  idBand: number;
  name: string;
  idUserAdmin?: number | null; 
}
type ApiResponse = { ok: boolean; data?: { items?: BandHit[] } };

export function useBandSearch() {
    const [termBand, setTermBand] = useState("");
    const [resultsBand, setResultsBand] = useState<BandHit[]>([]);
    const [loadingBand, setLoadingBand] = useState(false);

    useEffect(() => {
        const q = termBand.trim();
        if (q.length < 2) {
            setResultsBand([]);
            return;
        }

        const ac = new AbortController();
        setLoadingBand(true);

        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API_URL}/bands/search?q=${encodeURIComponent(q)}&limit=8`,
                    { signal: ac.signal, credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as ApiResponse;
                setResultsBand(json?.data?.items ?? []);
            } catch (err: any) {
                if (!(err as any)?.name?.includes?.("Abort")) console.error(err);
            } finally {
                setLoadingBand(false);
            }
        }, 300);

        return () => {
            clearTimeout(t);
            if (!ac.signal.aborted) ac.abort("cleanup");
        };
    }, [termBand]);

    return { termBand, setTermBand, resultsBand, loadingBand };
}