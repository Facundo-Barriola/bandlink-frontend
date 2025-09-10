"use client";

import { useState } from "react";
import StripeCheckout from "./StripeCheckOut";
import { Wallet } from "@mercadopago/sdk-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Provider = "stripe" | "mp";

async function payBookingRequest({
  idBooking,
  provider,
  email,
}: {
  idBooking: number;
  provider: Provider;
  email?: string;
}) {
  const res = await fetch(`${API}/payments/${provider}/booking/${idBooking}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, provider }),
  });
  return res.json();
}

export function PayBookingButton({
  idBooking,
  email,
}: {
  idBooking: number;
  email?: string;
}) {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de checkout
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);

  // 1) Flujo STRIPE
  async function onPayStripe() {
    setError(null);
    setLoading("stripe");
    try {
      const r = await payBookingRequest({ idBooking, provider: "stripe", email });
      if (!r?.ok) throw new Error(r?.error ?? "No se pudo iniciar el pago (Stripe)");
      if (!r.clientSecret) throw new Error("Falta clientSecret (Stripe)");
      setStripeClientSecret(r.clientSecret);
    } catch (e: any) {
      setError(e?.message ?? "Error iniciando Stripe");
    } finally {
      setLoading(null);
    }
  }

  // 2) Flujo MERCADO PAGO
  async function onPayMercadoPago() {
    setError(null);
    setLoading("mp");
    try {
      // Opción A: usar endpoint unificado
      const r = await payBookingRequest({ idBooking, provider: "mp", email });
      console.log(r);
      if (!r?.ok) throw new Error(r?.error ?? "No se pudo iniciar el pago (MP)");
      const checkoutUrl: string | undefined = r.checkoutUrl ?? r.data?.checkoutUrl;
      console.log(checkoutUrl);
      if (checkoutUrl) {
        console.log("[UI][MP] redirect ->", checkoutUrl);
        window.location.href = checkoutUrl;
        return;
      }
      const pref = r.preferenceId ?? r.data?.preferenceId;
      if (!pref) throw new Error("Falta preferenceId (MP)");
      setMpPreferenceId(pref);
    } catch (e: any) {
      setError(e?.message ?? "Error iniciando MP");
    } finally {
      setLoading(null);
    }
  }

  // Render según estado
  if (stripeClientSecret) {
    return <StripeCheckout clientSecret={stripeClientSecret} />;
  }
  if (mpPreferenceId) {
    return <Wallet initialization={{ preferenceId: mpPreferenceId }} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        className="px-3 py-2 rounded-lg bg-[#65558F] text-white hover:bg-[#51447A]"
        onClick={onPayStripe}
        disabled={!!loading}
      >
        {loading === "stripe" ? "Generando (Stripe)..." : "Pagar con Stripe"}
      </button>

      <button
        className="px-3 py-2 rounded-lg border border-[#65558F] text-[#65558F] hover:bg-violet-50"
        onClick={onPayMercadoPago}
        disabled={!!loading}
      >
        {loading === "mp" ? "Generando (MP)..." : "Pagar con Mercado Pago"}
      </button>
    </div>
  );
}
