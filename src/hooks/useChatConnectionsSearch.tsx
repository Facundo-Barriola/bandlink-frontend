"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ConnectionRowAPI = {
  idConnection: number;
  idUserA: number;
  idUserB: number;
  status: string;
  respondedAt?: string | null;
  updatedAt: string;

  // Nuevos (pueden venir del backend)
  friendUserId?: number;
  friend?: { idUser: number; displayName: string | null; avatarUrl: string | null } | null;
  displayName?: string | null;  // plano (por si no mandás friend)
  avatarUrl?: string | null;    // plano
};

type FriendLite = {
  idConnection: number;
  friendUserId: number;
  respondedAt?: string | null;
  updatedAt: string;
};

type Profile = { idUser: number; displayName: string | null; avatarUrl: string | null };

// cache global
const profileCache = new Map<number, Profile>();

type Options = {
  meId?: number;
  apiBase?: string;
  minChars?: number;
  hydrateProfiles?: boolean;
  batchChunkSize?: number;
};

export function useChatConnectionsSearch(opts: Options = {}) {
  const {
    meId,
    apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    minChars = 2,
    hydrateProfiles = true,
    batchChunkSize = 50,
  } = opts;

  const [active, setActive] = useState(false);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendLite[]>([]);
  const didLoadRef = useRef(false);

  const activate = () => setActive(true);

  // 1) Traer aceptadas (una vez al activar)
  useEffect(() => {
    if (!active || didLoadRef.current) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/network/connections/accepted`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const rows: ConnectionRowAPI[] = Array.isArray(payload) ? payload : (payload?.data ?? []);

        const accepted = rows.filter(r => r.status === "accepted");

        // Mapear y precalentar cache si el back ya envía nombres
        const mapped: FriendLite[] = accepted.map(r => {
          const fid =
            r.friendUserId ??
            (meId && Number.isFinite(meId) ? (r.idUserA === meId ? r.idUserB : r.idUserA) : r.idUserB);

          // Precalentar cache si vino info
          const p = r.friend ?? (r.displayName || r.avatarUrl
            ? { idUser: fid, displayName: r.displayName ?? null, avatarUrl: r.avatarUrl ?? null }
            : null);

          if (p && Number.isFinite(p.idUser)) {
            profileCache.set(p.idUser, {
              idUser: p.idUser,
              displayName: p.displayName ?? null,
              avatarUrl: p.avatarUrl ?? null,
            });
          }

          return {
            idConnection: r.idConnection,
            friendUserId: fid,
            respondedAt: r.respondedAt ?? null,
            updatedAt: r.updatedAt,
          };
        });

        if (!cancelled) {
          setFriends(mapped);
          didLoadRef.current = true;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error al cargar conexiones");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, apiBase, meId]);

  // 2) Hidratar faltantes en batch (fallback)
  useEffect(() => {
    if (!active || !hydrateProfiles || friends.length === 0) return;

    const uniqIds = Array.from(new Set(friends.map(f => f.friendUserId)));
    const missing = uniqIds.filter(id => !profileCache.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    setLoadingProfiles(true);

    (async () => {
      try {
        for (let i = 0; i < missing.length; i += batchChunkSize) {
          const ids = missing.slice(i, i + batchChunkSize);
          const url = `${apiBase}/directory/user-profile/by-users?ids=${encodeURIComponent(ids.join(","))}`;
          const res = await fetch(url, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) continue;
          const json = await res.json();
          const items: any[] = Array.isArray(json) ? json : (json?.data ?? json ?? []);
          for (const it of items) {
            const idUser = Number(it?.idUser ?? it?.userId ?? it?.id);
            if (!Number.isFinite(idUser)) continue;
            profileCache.set(idUser, {
              idUser,
              displayName: (it?.displayName ?? null) as string | null,
              avatarUrl: (it?.avatarUrl ?? null) as string | null,
            });
          }
        }
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, hydrateProfiles, friends, apiBase, batchChunkSize]);

  // 3) Resultados
  const results = useMemo(() => {
    if (!active) return [];
    const q = term.trim().toLowerCase();

    const source =
      q.length < minChars
        ? friends.slice(0, 20)
        : friends.filter(f => {
            const p = profileCache.get(f.friendUserId);
            const name = (p?.displayName ?? "").toLowerCase();
            return (name && name.includes(q)) || String(f.friendUserId).includes(q);
          });

    return source.map(f => {
      const p = profileCache.get(f.friendUserId);
      return {
        idUser: f.friendUserId,
        idConnection: f.idConnection,
        displayName: p?.displayName ?? null, // <- ya nombres, no IDs
        avatarUrl: p?.avatarUrl ?? null,
      };
    });
  }, [active, term, friends, minChars]);

  // Para títulos del inbox por id
  const profileById = useMemo(() => {
    const out: Record<number, { displayName: string | null; avatarUrl: string | null }> = {};
    for (const f of friends) {
      const p = profileCache.get(f.friendUserId);
      if (p) out[f.friendUserId] = { displayName: p.displayName, avatarUrl: p.avatarUrl };
    }
    return out;
  }, [friends, loadingProfiles]);

  return {
    active, activate,
    term, setTerm,
    results,
    profileById,
    loading: loading || loadingProfiles,
    error,
  };
}
