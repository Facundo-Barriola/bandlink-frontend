"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Props = {
  idBand: number;
  onUpdated?: (patch: Partial<{ name: string; description: string; genres: string[] }>) => void;
};

export default function EditBandDialog({ idBand, onUpdated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [genresCsv, setGenresCsv] = React.useState("");

  React.useEffect(() => {
    const el = document.getElementById("edit-band-dialog-trigger");
    if (!el) return;
    const fn = () => setOpen(true);
    el.addEventListener("click", fn);
    return () => el.removeEventListener("click", fn);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setError(null);
      try {
        const r = await fetch(`${API}/bands/${idBand}`, { credentials: "include" });
        if (!r.ok) throw new Error(await r.text());
        const b = await r.json();
        setName(b.name ?? "");
        setDescription(b.description ?? "");
        setGenresCsv((b.genres ?? []).join(", "));
      } catch (e: any) {
        setError(e?.message ?? "No se pudo cargar la banda");
      }
    })();
  }, [open, idBand]);

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      const genres = genresCsv.split(",").map(s => s.trim()).filter(Boolean);
      const r = await fetch(`${API}/bands/${idBand}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, genres })
      });
      if (!r.ok) throw new Error(await r.text());
      onUpdated?.({ name, description, genres });
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar banda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Géneros (separados por coma)</label>
            <Input value={genresCsv} onChange={e => setGenresCsv(e.target.value)} placeholder="Rock, Indie, Funk" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
