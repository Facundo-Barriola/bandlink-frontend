"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAcceptedConnections } from "@/hooks/useAcceptedConnections";

type Props = {
  meId: number;
  apiBase?: string;
  hydrateProfiles?: boolean;
  buildProfileUrl?: (idUser: number) => string;
  onSelectFriend?: (friendUserId: number) => void;
};

export default function FriendsDialogButton({
  meId,
  apiBase,
  hydrateProfiles = true,
  buildProfileUrl,
  onSelectFriend,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const { friends, loading, error, refresh } = useAcceptedConnections({
    enabled: open, // carga al abrir
    meId,
    apiBase,
    hydrateProfiles,
    buildProfileUrl,
  });

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter(f =>
      (f.displayName ?? `Usuario #${f.friendUserId}`).toLowerCase().includes(term)
      || String(f.friendUserId).includes(term)
    );
  }, [friends, q]);

  return (
    <>
      <Button type="button" variant="secondary" className="inline-flex items-center gap-2 rounded-xl bg-[#EADDFF]"
        onClick={() => setOpen(true)} aria-label="Ver amigos">
        <Users className="h-4 w-4" />
        Amigos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tus amigos</DialogTitle>
            <DialogDescription>Conexiones aceptadas.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button variant="ghost" onClick={refresh}>Actualizar</Button>
          </div>

          {loading && <div className="py-6 text-sm text-muted-foreground">Cargando…</div>}
          {error && !loading && <div className="py-6 text-sm text-red-600">Error: {error}</div>}
          {!loading && !error && filtered.length === 0 && (
            <div className="py-6 text-sm text-muted-foreground">
              {q ? "Sin resultados." : "Todavía no tenés amigos aceptados."}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <ul className="mt-2 max-h-[50vh] overflow-auto divide-y divide-border rounded-md border">
              {filtered.map((f) => (
                <li key={f.idConnection} className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 flex items-center justify-center rounded-full bg-muted text-sm">
                    {(f.displayName?.[0] ?? String(f.friendUserId)[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{f.displayName ?? `Usuario #${f.friendUserId}`}</div>
                    <div className="text-xs text-muted-foreground">ID: {f.friendUserId}</div>
                  </div>
                  {onSelectFriend && (
                    <Button size="sm" onClick={() => onSelectFriend(f.friendUserId)}>
                      Ver
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
