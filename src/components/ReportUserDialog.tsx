"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, ShieldAlert } from "lucide-react";
import { useUser } from "@/app/context/userContext";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ReportPayload = {
  reportedIdUser: number;
  reasonCode: string;
  description: string | null;
};

const REASONS: { code: string; label: string; hint?: string }[] = [
  { code: "spam", label: "Spam o publicidad no deseada" },
  { code: "abuse", label: "Acoso o lenguaje abusivo" },
  { code: "scam", label: "Estafa o intento de fraude" },
  { code: "fake_profile", label: "Perfil falso o suplantación" },
  { code: "inappropriate", label: "Contenido inapropiado" },
  { code: "other", label: "Otro" },
];

export function ReportUserDialog({
  open,
  onOpenChange,
  reportedIdUser,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportedIdUser: number;
  onSubmitted?: () => void;
}) {
  const { user } = useUser();
  const isSelf = user?.idUser === reportedIdUser;

  const [reason, setReason] = useState<string>("spam");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!reason) {
      setError("Seleccioná un motivo");
      return;
    }
    if (isSelf) {
      setError("No podés reportarte a vos mismo");
      return;
    }
    setLoading(true);
    try {
      const body: ReportPayload = {
        reportedIdUser,
        reasonCode: reason,
        description: description?.trim() ? description.trim() : null,
      };
      const resp = await fetch(`${API}/feedback/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "No se pudo enviar el reporte");
      }
      toast.success("Reporte enviado. ¡Gracias por ayudarnos a cuidar la comunidad!");
      onSubmitted?.();
      onOpenChange(false);
      setDescription("");
      setReason("spam");
    } catch (e: any) {
      const msg = e?.message || "Error inesperado";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Reportar usuario
          </DialogTitle>
          <DialogDescription>
            Enviá este reporte si este usuario infringió las normas de BandLink. Nuestro equipo lo revisará.
          </DialogDescription>
        </DialogHeader>

        {isSelf && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">
            No podés reportarte a vos mismo.
          </div>
        )}

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Motivo</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="grid grid-cols-1 gap-2">
              {REASONS.map((r) => (
                <label key={r.code} className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value={r.code} className="mt-1" />
                  <div>
                    <div className="font-medium">{r.label}</div>
                    {r.hint && <p className="text-sm text-muted-foreground">{r.hint}</p>}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Textarea
              placeholder="Contanos qué pasó, enlaces, fechas, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] rounded-2xl"
              maxLength={800}
            />
            <div className="text-xs text-muted-foreground text-right">{description.length}/800</div>
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button className="rounded-xl" onClick={handleSubmit} disabled={loading || isSelf}>
            {loading ? "Enviando…" : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ReportUserButton({
  reportedIdUser,
  variant = "outline",
  size = "sm",
  className,
  children,
}: {
  reportedIdUser: number;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const isSelf = user?.idUser === reportedIdUser;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className ?? "rounded-xl"}
        onClick={() => setOpen(true)}
        disabled={isSelf}
        title={isSelf ? "No podés reportarte" : "Reportar"}
      >
        <Flag className="w-4 h-4 mr-2" />
        {children ?? "Reportar"}
      </Button>

      <ReportUserDialog
        open={open}
        onOpenChange={setOpen}
        reportedIdUser={reportedIdUser}
        onSubmitted={() => {}}
      />
    </>
  );
}
