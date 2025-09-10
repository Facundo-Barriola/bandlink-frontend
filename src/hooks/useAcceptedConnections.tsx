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
  apiBase?: string; // e.g. http://localhost:4000
  hydrateProfiles?: boolean;
  buildProfileUrl?: (idUser: number) => string; // usa apiBase
};

export function useAcceptedConnections(opts: Options = {}) {
  const {
    enabled = true,
    meId,
    apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    hydrateProfiles = false,
    buildProfileUrl = (id) => `${apiBase}/directory/user-profile/by-user/${id}`,
  } = opts;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [rows, setRows]       = useState<ConnectionRow[]>([]);

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

  const baseFriends: FriendItem[] = useMemo(() => {
    return rows
      .filter(r => r.status === "accepted")
      .map(r => ({
        idConnection: r.idConnection,
        friendUserId: meId && Number.isFinite(meId)
          ? (r.idUserA === meId ? r.idUserB : r.idUserA)
          : r.idUserB,
        respondedAt: r.respondedAt ?? null,
        updatedAt: r.updatedAt,
      }));
  }, [rows, meId]);

  const [friends, setFriends] = useState<FriendItem[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!hydrateProfiles) { setFriends(baseFriends); return; }
      const enriched = await Promise.all(baseFriends.map(async f => {
        try {
          const r = await fetch(buildProfileUrl(f.friendUserId), { credentials: "include" });
          if (!r.ok) return f;
          const pj = await r.json();
          const prof = Array.isArray(pj) ? pj[0] : pj?.data ?? pj;
          return { ...f, displayName: prof?.displayName ?? null, avatarUrl: prof?.avatarUrl ?? null };
        } catch { return f; }
      }));
      if (!cancel) setFriends(enriched);
    })();
    return () => { cancel = true; };
  }, [baseFriends, hydrateProfiles, buildProfileUrl]);

  return { loading, error, friends, refresh: fetchAccepted };
}
