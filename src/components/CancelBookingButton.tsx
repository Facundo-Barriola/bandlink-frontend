"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {toast} from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Props = {
  idBooking: number;
  totalAmount?: number | null;      // lo usamos como refundedAmount si existiera
  onDone?: () => void;              // para refrescar/optimizar UI
};

export default function CancelBookingButton({ idBooking, totalAmount, onDone }: Props) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    const ok = window.confirm("¿Confirmás cancelar esta reserva? Si ya fue pagada, se reembolsará.");
    if (!ok) return;

    try {
      setLoading(true);
      const refundedAmount = Number.isFinite(Number(totalAmount)) ? Number(totalAmount) : 0;

      const res = await fetch(`${API}/booking/cancel`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idBooking,
          refundedStatus: "refunded", 
          refundedAmount,                 
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const msg = json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      if (onDone) onDone();
      toast.success("Reserva cancelada. Si estaba paga, se realizó el reembolso.");
    } catch (e: any) {
      console.error("[CancelBookingButton]", e);
      toast.error(`No se pudo cancelar: ${e?.message ?? "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="rounded-xl"
      onClick={handleCancel}
      disabled={loading}
    >
      {loading ? "Cancelando..." : "Cancelar"}
    </Button>
  );
}
