"use client";
import { useState } from "react";
import { Wallet } from "@mercadopago/sdk-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function PayBookingButton({ idBooking, email }: { idBooking: number; email?: string }) {
  const [prefId, setPrefId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  async function createPreference() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/payments/booking/${idBooking}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await r.json();
      
      if (json.ok && json.preferenceId) {
        console.log("json", json);
        console.log("preferenceId", json.preferenceId);
        setPrefId(json.preferenceId);
        
      } else {
        alert(json.error ?? "No se pudo iniciar el pago");
      }
    } finally {
      setLoading(false);
    }
  }

  if (prefId) {
    return <Wallet initialization={{ preferenceId: prefId }} />;
  }
  return (
    <button
      className="px-3 py-2 rounded-lg bg-[#65558F] text-white hover:bg-[#51447A]"
      onClick={createPreference}
      disabled={loading}
    >
      {loading ? "Generando..." : "Pagar reserva"}
    </button>
  );
}
