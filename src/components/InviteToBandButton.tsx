"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { useBandInvite } from "@/hooks/useBandInvite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/app/context/userContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AdminBand = { idBand: number; name: string };

type Props = {
  bandId?: number; // ← ahora opcional
  targetMusicianId: number;
  defaultRoleSuggested?: string | null;
  defaultMessage?: string | null;
  buttonLabel?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  onInvited?: (idBandInvite: number | null) => void;
  disabled?: boolean;
};

export function InviteToBandButton({
  bandId,
  targetMusicianId,
  defaultRoleSuggested = "",
  defaultMessage = "",
  buttonLabel = "Invitar",
  className,
  variant = "secondary",
  size = "sm",
  onInvited,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [roleSuggested, setRoleSuggested] = useState<string>(defaultRoleSuggested ?? "");
  const [message, setMessage] = useState<string>(defaultMessage ?? "");
  const [myAdminBands, setMyAdminBands] = useState<AdminBand[]>([]);
  const [loadingBands, setLoadingBands] = useState(false);
  const [selectedBandId, setSelectedBandId] = useState<number | null>(bandId ?? null);
  const user = useUser();

  useEffect(() => {
    if (bandId != null) return;
    let ignore = false;
    setLoadingBands(true);
    (async () => {
      try {
        const r = await fetch(`${API_URL}/bands/${user.user?.idUser}/adminBands`, { credentials: "include" });
        const j = await r.json();
        const list: AdminBand[] = (j?.data ?? j ?? []).map((b: any) => ({ idBand: b.idBand, name: b.name }));
        if (!ignore) {
          setMyAdminBands(list);
          if (list.length === 1) setSelectedBandId(list[0].idBand);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoadingBands(false);
      }
    })();
    return () => { ignore = true; };
  }, [bandId]);

  // hook de invitación atado a la banda elegida
  const bandForInvite = selectedBandId ?? bandId ?? 0;
  const { invite, inviting } = useBandInvite(bandForInvite);

  async function handleSend() {
    if (!selectedBandId && !bandId) {
      toast.error("Seleccioná una banda primero");
      return;
    }
    const ok = await invite(targetMusicianId, {
      roleSuggested: roleSuggested.trim() || null,
      message: message.trim() || null,
      onSuccess: (p) => {
        onInvited?.(p.idBandInvite);
        setOpen(false);
        setRoleSuggested(defaultRoleSuggested ?? "");
        setMessage(defaultMessage ?? "");
      },
    });
    if (!ok) toast.error("No se pudo enviar la invitación");
  }

  const canSend = (bandId != null || selectedBandId != null) && !inviting && !disabled;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className={cn("bg-[#65558F] text-white hover:bg-[#51447A]", className)}
          disabled={disabled}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invitar a la banda</DialogTitle>
          <DialogDescription>
            Elegí la banda (si administrás varias), sugerí un rol y agregá un mensaje opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Selector de banda solo si no vino por props */}
          {bandId == null && (
            <div>
              <label className="text-sm mb-1 block">Banda</label>
              <select
                className="w-full border rounded-md h-9 px-3 text-sm"
                value={selectedBandId ?? ""}
                onChange={(e) => setSelectedBandId(e.target.value ? Number(e.target.value) : null)}
                disabled={loadingBands}
              >
                <option value="">{loadingBands ? "Cargando..." : "Seleccioná una banda"}</option>
                {myAdminBands.map((b) => (
                  <option key={b.idBand} value={b.idBand}>{b.name}</option>
                ))}
              </select>
              {(!loadingBands && myAdminBands.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  No sos admin de ninguna banda. Creá una banda o pedí permiso de admin para invitar músicos.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm mb-1 block">Rol sugerido (opcional)</label>
            <Input
              value={roleSuggested}
              onChange={(e) => setRoleSuggested(e.target.value)}
              placeholder="Ej: Guitarra líder / Voz / Teclados"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block">Mensaje (opcional)</label>
            <Textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contale sobre el proyecto, estilo, horarios, etc."
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/300</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button className="bg-[#65558F] text-white" onClick={handleSend} disabled={!canSend}>
            {inviting ? "Enviando…" : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
