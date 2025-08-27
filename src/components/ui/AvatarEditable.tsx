"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Users, Crown, MapPin, Pencil } from "lucide-react";
import { useUser } from "@/app/context/userContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type AvatarEditableProps = {
  idUser: number;
  displayName: string;
  src?: string | null;
  editable?: boolean;        
  onUploaded?: (url: string) => void;
};

export function AvatarEditable({ idUser, displayName, src, editable = true, onUploaded }: AvatarEditableProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(src ?? null);
  const [uploading, setUploading] = useState(false);

  const openPicker = () => editable && fileRef.current?.click();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // (opcional) validaciones rápidas
    if (!file.type.startsWith("image/")) {
      alert("Subí una imagen válida.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) { // 4MB
      alert("La imagen no puede superar 4MB.");
      return;
    }

    const local = URL.createObjectURL(file);
    setPreview(local);

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      // ⚠️ Cambiá esta ruta por tu endpoint real:
      // p.ej. `${API_URL}/directory/${idUser}/avatar` si lo manejás en /directory
      const res = await fetch(`${API_URL}/users/${idUser}/avatar`, {
        method: "PUT",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      const url = json.url ?? json.data?.url ?? preview; // ajustá según respuesta del back
      if (url) {
        setPreview(url);
        onUploaded?.(url);
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo subir el avatar.");
      setPreview(src ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group inline-block">
      <Avatar className="h-24 w-24 rounded-2xl transition
                         group-hover:ring-2 group-hover:ring-[#65558F]">
        <AvatarImage src={preview ?? ""} alt={displayName} />
        <AvatarFallback className="rounded-2xl text-xl">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Overlay hover (solo si es editable) */}
      {editable && (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openPicker()}
          className="absolute inset-0 rounded-2xl bg-black/40 opacity-0
                     group-hover:opacity-100 transition flex items-center justify-center
                     cursor-pointer"
          aria-label="Cambiar foto"
          title="Cambiar foto"
        >
          <span className="flex items-center gap-1 text-white text-sm">
            <Pencil className="w-4 h-4" />
            {uploading ? "Subiendo..." : "Cambiar"}
          </span>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
