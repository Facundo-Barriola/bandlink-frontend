"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Props = {
  idBooking: number;
  onDone?: (args: { newStartsAtIso: string; newEndsAtIso: string }) => void;
  triggerClassName?: string;
};

export default function RescheduleBookingDialog({ idBooking, onDone, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [startLocal, setStartLocal] = useState<string>(""); // "YYYY-MM-DDTHH:mm"
  const [endLocal, setEndLocal] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!startLocal || !endLocal) return "Completá ambos campos de fecha y hora.";
    const s = new Date(startLocal);
    const e = new Date(endLocal);
    if (isNaN(+s) || isNaN(+e)) return "Fechas inválidas.";
    if (e <= s) return "La hora de fin debe ser posterior a la de inicio.";
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setLoading(true);

    // Enviar como ISO "local" (sin Z) para que el backend lo tome tal cual
    const newStartsAtIso = startLocal; // "YYYY-MM-DDTHH:mm"
    const newEndsAtIso = endLocal;

    try {
      const res = await fetch(`${API}/booking/reschedule`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idBooking, newStartsAtIso, newEndsAtIso }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      if (onDone) onDone({ newStartsAtIso, newEndsAtIso });
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo reprogramar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className={triggerClassName} onClick={() => setOpen(true)}>
        Cambiar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Reprogramar reserva</DialogTitle>
            <DialogDescription>
              Elegí nuevo día y horario. Si la reserva ya está pagada, no se podrá cambiar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nuevo inicio</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nuevo fin</label>
              <input
                type="datetime-local"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
