"use client";
import {loadStripe} from "@stripe/stripe-js";
import {Elements, PaymentElement, useStripe, useElements} from "@stripe/react-stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function Inner({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const onPay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + "/payments/success" },
      redirect: "if_required"
    });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Pago procesado");
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      <button className="btn" disabled={!stripe || loading} onClick={onPay}>
        {loading ? "Procesando..." : "Pagar"}
      </button>
    </div>
  );
}

export default function StripeCheckout({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements options={{ clientSecret }} stripe={stripePromise}>
      <Inner clientSecret={clientSecret} />
    </Elements>
  );
}
