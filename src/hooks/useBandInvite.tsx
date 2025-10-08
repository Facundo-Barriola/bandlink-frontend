
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type InviteResponse = {
  ok: boolean;
  data?: { idBandInvite?: number | null; status?: string | null; info?: string | null };
  error?: string | null;
};

type Options = {
  roleSuggested?: string | null;
  message?: string | null;
  onSuccess?: (payload: { idBandInvite: number | null; status: string | null; info: string | null }) => void;
  onError?: (err: Error) => void;
  silent?: boolean;
};

export function useBandInvite(bandId: number) {
  const [inviting, setInviting] = useState(false);
  const [lastInvite, setLastInvite] = useState<{ idBandInvite: number | null; status: string | null } | null>(null);

  const invite = useCallback(
    async (targetMusicianId: number, opts: Options = {}) => {
      if (!Number.isFinite(bandId) || !Number.isFinite(targetMusicianId)) {
        const err = new Error("Parámetros inválidos");
        opts.onError?.(err);
        if (!opts.silent) toast.error(err.message);
        return false;
      }

      setInviting(true);
      try {
        const res = await fetch(`${API_URL}/band-invites/${bandId}/invites`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            targetMusicianId,
            roleSuggested: opts.roleSuggested ?? null,
            message: opts.message ?? null,
          }),
        });

        const json: InviteResponse = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));

        if (!res.ok || !json.ok) {
          const reason = json.error ?? json.data?.info ?? `HTTP ${res.status}`;
          const err = new Error(reason);
          opts.onError?.(err);
          if (!opts.silent) toast.error(
            reason === "already_pending"
              ? "Ya existe una invitación pendiente"
              : reason === "already_member"
              ? "Ese músico ya es miembro"
              : reason === "not_admin"
              ? "Solo el admin puede invitar"
              : reason || "No se pudo enviar la invitación"
          );
          return false;
        }

        const payload = {
          idBandInvite: json.data?.idBandInvite ?? null,
          status: json.data?.status ?? "pending",
          info: json.data?.info ?? null,
        };
        setLastInvite({ idBandInvite: payload.idBandInvite, status: payload.status });
        opts.onSuccess?.(payload);

        if (!opts.silent) {
          toast.success(
            payload.status === "pending" ? "Invitación enviada 🎉" : "Acción realizada",
            { description: opts.roleSuggested ? `Rol sugerido: ${opts.roleSuggested}` : undefined }
          );
        }
        return true;
      } catch (e: any) {
        opts.onError?.(e);
        if (!opts.silent) toast.error(e?.message ?? "Error de red");
        return false;
      } finally {
        setInviting(false);
      }
    },
    [bandId]
  );

  return { invite, inviting, lastInvite };
}
