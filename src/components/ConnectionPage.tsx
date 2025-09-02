"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Archive, Trash2, CheckCircle2, Users } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ConnectionStatus = "pending" | "accepted" | "rejected" | "canceled";

type ConnectionRow = {
  idConnection: number;
  idUserA: number;
  idUserB: number;
  status: ConnectionStatus;
  requestedBy: number;
  requestedAt: string;
  updatedAt: string;
};

async function $fetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    const msg = json?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json?.data ?? json) as T;
}

export default function ConnectionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConnectionRow[]>([]);

  async function load() {
    setLoading(true);
    try {
    const res = await fetch(`${API_URL}/network/connections/incoming/pending`, {
      credentials: "include",
    });
    const json = await res.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    setRows(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAccept(idConnection: number) {
    // Optimistic: quitamos de la lista primero
    const prev = rows;
    setRows((r) => r.filter((x) => x.idConnection !== idConnection));
    try {
      await $fetch(`${API_URL}/network/connections/${idConnection}/accept`, {
        method: "POST",
      });
      toast.success("Conexión aceptada");
    } catch (err: any) {
      setRows(prev); // rollback
      toast.error(err?.message ?? "No se pudo aceptar la solicitud");
    }
  }

  async function handleArchive(idConnection: number) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.idConnection !== idConnection));
    try {
      await $fetch(`${API_URL}/network/connections/${idConnection}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived: true }),
      });
      toast.success("Solicitud archivada");
    } catch (err: any) {
      setRows(prev);
      toast.error(err?.message ?? "No se pudo archivar la solicitud");
    }
  }

  async function handleDelete(idConnection: number) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.idConnection !== idConnection));
    try {
      await $fetch(`${API_URL}/network/connections/${idConnection}`, {
        method: "DELETE",
      });
      toast.success("Solicitud eliminada");
    } catch (err: any) {
      setRows(prev);
      toast.error(err?.message ?? "No se pudo eliminar la solicitud");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#65558F]">Solicitudes de Conexión</h1>
          <p className="text-sm text-muted-foreground">
            Gestioná tus invitaciones pendientes: aceptar, archivar o eliminar.
          </p>
        </div>
        <Button variant="outline" onClick={load}>Actualizar</Button>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#65558F]">
            <Users size={18} />
            Pendientes recibidas
            {!loading && (
              <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-3 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-40 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenés solicitudes pendientes.</p>
          ) : (
            rows.map((c) => (
              <RequestRow
                key={c.idConnection}
                row={c}
                onAccept={() => handleAccept(c.idConnection)}
                onArchive={() => handleArchive(c.idConnection)}
                onDelete={() => handleDelete(c.idConnection)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Ítem de solicitud */
function RequestRow({
  row,
  onAccept,
  onArchive,
  onDelete,
}: {
  row: ConnectionRow;
  onAccept: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  // Nota: acá podrías resolver y mostrar datos del usuario que te invitó.
  // El endpoint trae ids; si tenés un /users/:id, podrías hacer un SWR interno para name/avatar.
  const when = new Date(row.requestedAt).toLocaleString();

  return (
    <div className="flex items-center justify-between gap-4 p-3 border rounded-xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
          <UserPlus size={18} />
        </div>
        <div>
          <p className="font-medium">
            Nueva solicitud de conexión
          </p>
          <p className="text-xs text-muted-foreground">
            idConnection: {row.idConnection} • solicitada el {when}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onAccept} className="bg-[#65558F] text-white">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Aceptar
        </Button>
        <Button variant="secondary" onClick={onArchive}>
          <Archive className="mr-2 h-4 w-4" />
          Archivar
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
