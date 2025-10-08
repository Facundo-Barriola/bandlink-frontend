"use client";

import { useEffect, useMemo, useState } from "react";

export type ConnectionRow = {
  idConnection: number;
  idUserA: number;
  idUserB: number;
  status: string;
  respondedBy?: number | null;
  respondedAt?: string | null;
  updatedAt: string;

  // --- Opcionales que puede traer el backend (nuevo)
  friendUserId?: number;
  friend?: { idUser: number; displayName: string | null; avatarUrl: string | null } | null;
  displayName?: string | null; // llano (por si no mandás friend)
  avatarUrl?: string | null;   // llano
};

export type FriendItem = {
  idConnection: number;
  friendUserId: number;
  respondedAt?: string | null;
  updatedAt: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type Options = {
  enabled?: boolean;
  meId?: number;
  apiBase?: string;
  hydrateProfiles?: boolean; // ahora true por defecto
  buildProfileUrl?: (idUser: number) => string; // fallback one-by-one (casi no se usa ya)
};

export function useAcceptedConnections(opts: Options = {}) {
  const {
    enabled = true,
    meId,
    apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    hydrateProfiles = true,
    buildProfileUrl = (id) => `${apiBase}/directory/user-profile/by-user/${id}`,
  } = opts;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [rows, setRows]       = useState<ConnectionRow[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);

  async function fetchAccepted() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/network/connections/accepted`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const data: ConnectionRow[] = Array.isArray(payload) ? payload : payload?.data ?? [];
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar conexiones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (enabled) fetchAccepted(); }, [enabled, apiBase]);

  // Base ya con nombre/avatar si el back lo envió
  const baseFriends: FriendItem[] = useMemo(() => {
    return rows
      .filter(r => r.status === "accepted")
      .map(r => {
        const fid =
          r.friendUserId ??
          (meId && Number.isFinite(meId) ? (r.idUserA === meId ? r.idUserB : r.idUserA) : r.idUserB);

        const dn = r.friend?.displayName ?? r.displayName ?? null;
        const av = r.friend?.avatarUrl ?? r.avatarUrl ?? null;

        return {
          idConnection: r.idConnection,
          friendUserId: fid,
          respondedAt: r.respondedAt ?? null,
          updatedAt: r.updatedAt,
          displayName: dn,
          avatarUrl: av,
        };
      });
  }, [rows, meId]);

  // Set inmediato (muestra lo que ya vino con nombre), y luego enriquecemos faltantes si hace falta
  useEffect(() => { setFriends(baseFriends); }, [baseFriends]);

  // Hidratación en batch sólo para los que no traen displayName
  useEffect(() => {
    if (!hydrateProfiles || friends.length === 0) return;

    const missingIds = Array.from(
      new Set(
        friends.filter(f => !f.displayName).map(f => f.friendUserId)
      )
    );
    if (missingIds.length === 0) return;

    let cancel = false;

    (async () => {
      try {
        const url = `${apiBase}/directory/user-profile/by-users?ids=${encodeURIComponent(missingIds.join(","))}`;
        const r = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
        if (!r.ok) return;

        const json = await r.json();
        const arr: Array<{ idUser: number; displayName?: string | null; avatarUrl?: string | null }> =
          Array.isArray(json) ? json : (json?.data ?? json ?? []);

        const map = new Map(arr.map(p => [Number(p.idUser), p]));
        const enriched = friends.map(f => {
          if (f.displayName) return f; // ya tenía
          const p = map.get(f.friendUserId);
          return p
            ? { ...f, displayName: p.displayName ?? null, avatarUrl: p.avatarUrl ?? null }
            : f;
        });

        if (!cancel) setFriends(enriched);
      } catch {
        // noop: mantenemos los que ya teníamos
      }
    })();

    return () => { cancel = true; };
  }, [friends, hydrateProfiles, apiBase]);

  return { loading, error, friends, refresh: fetchAccepted };
}
