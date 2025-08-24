"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MusicianWizard from "@/components/MusicianWizard";
import Select from "react-select";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Role = "musico" | "sala" | "estandar";

type WizardCompletePayload = {
  profile: { displayName: string; bio: string | null };
  musician: {
    birthDate: string;
    skillLevel: "beginner" | "intermediate" | "advanced" | "professional";
    isAvailable: boolean;
    travelRadiusKm: number;
    visibility: "city" | "province" | "country" | "global";
    instruments: { idInstrument: number; isPrimary: boolean }[];
  };
};

export default function UserSelectionForm({
  email,
  password,
  onRegistered, }: {
    email: string;
    password: string;
    onRegistered?: (data: any) => void;
  }
) {
  const [role, setRole] = useState<Role | null>(null);
  const [openMusician, setOpenMusician] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleMusicianClick = () => {
    setRole("musico");
    setOpenMusician(true);
  };

  async function registerFullAsMusician(payload: WizardCompletePayload) {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`${API_URL}/account/registerFull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: "musico",
          profile: payload.profile,
          musician: payload.musician,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Error en el registro");
      }

      const data = await res.json();
      onRegistered?.(data);
      // cerrar y resetear selección
      setOpenMusician(false);
      setRole(null);
    } catch (e: any) {
      setError(e?.message || "Error en el registro");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="flex items-center justify-center w-full">
      {!role && (
        <Card className="w-[400px] shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center text-[#65558F]">Registrarse como...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              className="w-full bg-[#65558F] hover:bg-[#51447A] text-white"
              onClick={handleMusicianClick}
            >
              🎸 Músico
            </Button>
            <Button
              className="w-full bg-[#65558F] hover:bg-[#51447A] text-white"
              onClick={() => setRole("sala")}
              variant="outline"
            >
              🏠 Sala de Ensayo
            </Button>
            <Button
              className="w-full bg-[#65558F] hover:bg-[#51447A] text-white"
              onClick={() => setRole("estandar")}
            >
              👤 Usuario Estándar
            </Button>
          </CardContent>
        </Card>
      )}

      {role === "estandar" && (
        <Card className="w-[400px] shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center">Registro Usuario Estándar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              className="border rounded-lg p-2"
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="border rounded-lg p-2"
            />

            <input
              type="password"
              placeholder=" Repetir Contraseña"
              className="border rounded-lg p-2"
            />
            <Button className="w-full">Registrarme</Button>
            <Button
              variant="ghost"
              onClick={() => setRole(null)}
              className="text-sm"
            >
              ⬅ Volver
            </Button>
          </CardContent>
        </Card>
      )}

      {role === "musico" && (
        <MusicianWizard open={openMusician}
          onOpenChange={(v) => {
            setOpenMusician(v);
            if (!v) setRole(null);
          }}
           onComplete={registerFullAsMusician} />
      )}

      {role === "sala" && (
        <Card className="w-[400px] shadow-xl rounded-2xl">
          <CardHeader>
            <CardTitle className="text-center">Registro Sala de Ensayo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Nombre Sala"
              className="border rounded-lg p-2"
            />
            <input
              type="text"
              placeholder="Dirección"
              className="border rounded-lg p-2"
            />
            <input
              type="email"
              placeholder="Email"
              className="border rounded-lg p-2"
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="border rounded-lg p-2"
            />
            <Button className="w-full">Registrarme</Button>
            <Button
              variant="ghost"
              onClick={() => setRole(null)}
              className="text-sm"
            >
              ⬅ Volver
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
