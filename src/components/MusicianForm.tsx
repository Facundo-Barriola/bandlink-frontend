"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Select from "react-select";

export default function MusicianForm() {
  const [role, setRole] = useState<"musico" | "sala" | null>(null);
  const instrumentsOptions = [
    { value: 'guitar', label: 'Guitarra' },
    { value: 'drums', label: 'Batería' },
    { value: 'bass', label: 'Bajo' },
    { value: 'vocals', label: 'Voz' },
    { value: 'keyboard', label: 'Teclado' }]
  const experienceOptions = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
    { value: 'professional', label: 'Profesional' }]
  return (
    <Card className="w-[450px] shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className=" text-[#65558F] text-center">Registro Músico</CardTitle>
      </CardHeader>
      <CardContent className="text-[#65558F] grid grid-cols-2 gap-8">
        <div>
          <label className="text-[#65558F]">Nombre</label>
          <input
            type="text"
            placeholder="Nombre"
            className=" text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Apellido</label>
          <input
            type="text"
            placeholder="Apellido"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Fecha Nacimiento</label>
          <input
            type="date"
            placeholder="Fecha de Nacimiento"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="text-[#65558F]">Pais</label>
          <select name="paises" id="paises" className="text-[#65558F] border rounded-lg p-2">

          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Provincia</label>
          <select name="provincias" id="provincias" className="text-[#65558F] border rounded-lg p-2">

          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Ciudad</label>
          <select name="ciudades" id="ciudades" className="text-[#65558F] border rounded-lg p-2">

          </select>
        </div>
        <div>
          <label className="text-[#65558F]">Código Postal</label>
          <input
            type="codPostal"
            placeholder="Código Postal"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Dirección</label>
          <input
            type="direccion"
            placeholder="direccion"
            className="text-[#65558F] border rounded-lg p-2"
          />
        </div>
        <div>
          <label className="text-[#65558F]">Instrumentos</label>
          <Select options={instrumentsOptions} isMulti placeholder="Selecciona Instrumentos" className="text-[#65558F]" />
        </div>
        <div>
          <label className="text-[#65558F]">Nivel de Experiencia</label>
          <Select options={experienceOptions} placeholder="Exp" className="text-[#65558F]" />
        </div>
        <div className="col-span-2">
          <label className="text-[#65558F]">Descripción</label>
          <textarea
            placeholder="Descripción"
            className="text-[#65558F] border rounded-lg p-2 h-24 w-full"
          />
        </div>
        <Button className="bg-[#65558F] text-white w-full">Registrarme</Button>
        <Button
          variant="ghost"
          onClick={() => setRole(null)}
          className=" bg-[#EC221F] text-white w-full"
        >
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};