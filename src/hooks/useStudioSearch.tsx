"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type StudioHit = {
    idUser: number,
    idStudio: number,
    idUserProfile: number,
    displayName: string,
}
type ApiResponse = { ok: boolean; data?: { items?: StudioHit[] } };

export function useStudioSearch() {
    const [termStudio, setTermStudio] = useState("");
    const [resultsStudio, setResultsStudio] = useState<StudioHit[]>([]);
    const [loadingStudio, setLoadingStudio] = useState(false);

    useEffect(() => {
        const q = termStudio.trim();
        if (q.length < 2) {
            setResultsStudio([]);
            return;
        }

        const ac = new AbortController();
        setLoadingStudio(true);

        const t = setTimeout(async () => {
            try {
                const res = await fetch(
                    `${API_URL}/directory/studios/search?q=${encodeURIComponent(q)}&limit=8`,
                    { signal: ac.signal, credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" }
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as ApiResponse;
                setResultsStudio(json?.data?.items ?? []);
            } catch (err: any) {
                if (!(err as any)?.name?.includes?.("Abort")) console.error(err);
            } finally {
                setLoadingStudio(false);
            }
        }, 300);

        return () => {
            clearTimeout(t);
            if (!ac.signal.aborted) ac.abort("cleanup");
        };
    }, [termStudio]);

    return { termStudio, setTermStudio, resultsStudio, loadingStudio };
}