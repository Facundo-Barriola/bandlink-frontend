"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { useBandInvite } from "@/hooks/useBandInvite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
    bandId: number;
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
    const { invite, inviting } = useBandInvite(bandId);
    async function handleSend() {
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
        if (!ok) {
            toast.error("No se pudo enviar la invitación");
        }
    }
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
            Indicá un rol sugerido y un mensaje para el músico. Podrá aceptar o rechazar la invitación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
          <Button className="bg-[#65558F] text-white" onClick={handleSend} disabled={inviting}>
            {inviting ? "Enviando…" : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
