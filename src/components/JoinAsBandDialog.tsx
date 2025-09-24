"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

const API_FALLBACK = "http://localhost:4000";

export type AdminBand = { idBand: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  idUser: number | null | undefined;
  onSelect: (band: AdminBand) => void;
};

export default function JoinAsBandDialog({
  open,
  onOpenChange,
  idUser,
  onSelect,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [bands, setBands] = useState<AdminBand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    if (!idUser) {
      setBands([]);
      setError("Usuario no disponible.");
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Endpoint sugerido: GET /users/:idUser/bands?admin=true
        const res = await fetch(`${API_FALLBACK}/bands/${idUser}/adminBands`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
        const data: AdminBand[] = json?.data ?? json ?? [];
        if (alive) setBands(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (alive) setError(e?.message || "No se pudo obtener tus bandas.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, idUser]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return bands;
    return bands.filter((b) => b.name.toLowerCase().includes(term));
  }, [q, bands]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setSelectedId(null); setQ(""); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Elegí una banda (sos admin)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre..."
            className="rounded-xl"
          />

          <div className="text-sm text-muted-foreground">
            Mostrando bandas donde <Badge variant="secondary">sos administrador</Badge>
          </div>

          <div className="border rounded-2xl">
            <ScrollArea className="max-h-64 p-2">
              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
              ) : error ? (
                <div className="p-3 text-sm text-destructive">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No se encontraron bandas.</div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((b) => {
                    const selected = selectedId === b.idBand;
                    return (
                      <li key={b.idBand}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(b.idBand)}
                          className={[
                            "w-full text-left px-3 py-2 rounded-xl border transition",
                            selected
                              ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                              : "border-muted hover:bg-muted/50",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{b.name}</span>
                            {selected && <Badge className="bg-primary text-primary-foreground">Seleccionada</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">ID: {b.idBand}</div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!selectedId}
            onClick={() => {
              const band = bands.find((b) => b.idBand === selectedId);
              if (band) onSelect(band);
            }}
          >
            Unirme con banda seleccionada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
