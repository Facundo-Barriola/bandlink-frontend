"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, User2, Search } from "lucide-react";

import { MusicianHit, useMusicianSearch } from "@/hooks/useMusicianSearch"; // <- TU hook provisto
import { useBandSearch, BandHit } from "@/hooks/useBandSearch";   // <- tu hook actual

type Mode = "musician" | "band";
function toArray<T>(x: T[] | ReadonlyArray<T> | T | null | undefined): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x == null) return [];
  return [x as T];
}

export type InviteTarget =
  | { kind: "musician"; idMusician: number; idUser: number; label: string }
  | { kind: "band"; idBand: number; idUserAdmin: number | null; label: string };

export function InvitePeopleDialog({
  open,
  onOpenChange,
  onInvite,
  defaultMode = "musician",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (target: InviteTarget) => void | Promise<void>;
  defaultMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  const { term, setTerm, results, loading } = useMusicianSearch();           // músicos
  const { termBand, setTermBand, resultsBand, loadingBand } = useBandSearch(); // bandas

  const isMusician = mode === "musician";
  const isLoading = isMusician ? loading : loadingBand;


  const items = useMemo(() => {
    if (isMusician) {
        const list = toArray<MusicianHit>(results);
      return list.map((m) => ({
        key: `m-${m.idMusician}`,
        icon: <User2 className="h-4 w-4" />,
        primary: m.displayName,
        secondary: [
          m.instruments?.length ? `Inst.: ${m.instruments.join(", ")}` : null,
          m.genres?.length ? `Géneros: ${m.genres.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" • "),
        avatarUrl: m.avatarUrl || null,
        action: () =>
          onInvite({
            kind: "musician",
            idMusician: m.idMusician,
            idUser: m.idUser,
            label: m.displayName,
          }),
      }));
    } else {
        const list = toArray<BandHit>(resultsBand);
        console.log("bands search payload:", list[0]);
      return list.map((b) => ({
        key: `b-${b.idBand}`,
        icon: <Users className="h-4 w-4" />,
        primary: b.name,
        secondary:
          b.idUserAdmin != null ? `Admin perfil #${b.idUserAdmin}` : "Admin no definido",
        avatarUrl: null,
        action: () =>
          onInvite({
            kind: "band",
            idBand: b.idBand,
            idUserAdmin: b.idUserAdmin ?? null,
            label: b.name,
          }),
      }));
    }
  }, [isMusician, results, resultsBand, onInvite]);
  
  const itemsSafe = Array.isArray(items) ? items : [];
  const value = isMusician ? term : termBand;
  const onChange = (v: string) => (isMusician ? setTerm(v) : setTermBand(v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Invitar músicos o bandas</DialogTitle>
        </DialogHeader>

        {/* Selector de modo */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isMusician ? "default" : "secondary"}
            className="rounded-xl"
            onClick={() => setMode("musician")}
          >
            <User2 className="mr-2 h-4 w-4" />
            Músicos
          </Button>
          <Button
            type="button"
            variant={!isMusician ? "default" : "secondary"}
            className="rounded-xl"
            onClick={() => setMode("band")}
          >
            <Users className="mr-2 h-4 w-4" />
            Bandas
          </Button>
        </div>

        {/* Searchbar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-xl"
            placeholder={isMusician ? "Buscar músicos por nombre..." : "Buscar bandas por nombre..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Escribí al menos 2 caracteres.</p>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-auto rounded-xl border">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Buscando…</div>
          ) : itemsSafe.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sin resultados.</div>
          ) : (
            <ul className="divide-y">
              {itemsSafe.map((it) => (
                <li key={it.key} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center">
                      {it.avatarUrl ? (
                        <img src={it.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-[10px] text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{it.primary}</span>
                      {it.secondary && (
                        <span className="text-xs text-muted-foreground">{it.secondary}</span>
                      )}
                    </div>
                  </div>
                  <Button className="rounded-xl" size="sm" onClick={it.action}>
                    Invitar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Tip: alterná entre <Badge variant="secondary">Músicos</Badge> y{" "}
            <Badge variant="secondary">Bandas</Badge>.
          </span>
          <Button variant="secondary" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
