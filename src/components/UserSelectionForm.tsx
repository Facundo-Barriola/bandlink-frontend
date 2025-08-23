"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import  MusicianWizard  from "@/components/MusicianWizard";
import Select from "react-select";
import Image from "next/image";

export default function UserSelectionForm(){
    const [role, setRole] = useState<"musico" | "sala" | "estandar" |null>(null);
      const [openMusician, setOpenMusician] = useState(false);


  const handleMusicianClick = () => {
    setRole("musico");
    setOpenMusician(true);
  };
    return(
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
              onClick= {() => setRole("sala")}
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
        }} />
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
