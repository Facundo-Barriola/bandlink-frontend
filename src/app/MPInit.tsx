"use client";
import { useEffect } from "react";
import { initMercadoPago } from "@mercadopago/sdk-react";

export default function MPInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (key) {
      initMercadoPago(key, { locale: "es-AR" });
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Falta NEXT_PUBLIC_MP_PUBLIC_KEY");
      }
    }
  }, []);
  return null;
}
