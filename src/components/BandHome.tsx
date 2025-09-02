// app/bands/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Users, Music2, Pencil, ArrowLeft } from "lucide-react";
// Si usás un context de usuario:
import { useUser } from "@/app/context/userContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type GenreObj = { idGenre: number; genreName: string };
type Member = {
  idMusician: number;
  displayName: string;
  avatarUrl: string | null;
  roleInBand: string | null;
  isAdmin: boolean;
  joinedAt: string | null;
};

type BandApi = {
  band: {
    idBand: number;
    name: string;
    description: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  genres: Array<string | GenreObj>;
  members: Member[];
};

type BandView = {
  idBand: number;
  name: string;
  description: string | null;
  genres: GenreObj[];
  members: Member[];
};

function normalizePayload(raw: any): BandView {
  const band = raw?.band ?? {};
  const genresRaw = Array.isArray(raw?.genres) ? raw.genres : [];
  const genres: GenreObj[] = genresRaw.map((g: any, i: number) =>
    typeof g === "string" ? { idGenre: i + 1, genreName: g } : g
  );
  const members: Member[] = Array.isArray(raw?.members) ? raw.members : [];
  return {
    idBand: band.idBand,
    name: band.name,
    description: band.description ?? null,
    genres,
    members,
  };
}

export default function BandHome() {
  const router = useRouter();
  const params = useParams() as { id: string; idBand?: string };
  const idRaw = params.id ?? params.idBand;
  const bandId = Number(idRaw);

  const { user, ready } = useUser(); // opcional
  const [data, setData] = useState<BandView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    if (!ready || !user || !data) return false;
    const myMusicianId = (user as any)?.idMusician ?? null;
    if (!myMusicianId) return false;
    return data.members.some(m => m.idMusician === myMusicianId && m.isAdmin);
  }, [ready, user, data]);

  useEffect(() => {
    if (!Number.isFinite(bandId)) {
      setLoading(false);
      setErrMsg("ID de banda inválido.");
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setErrMsg(null);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/bands/${bandId}`, {
          signal: ac.signal,
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} - ${txt}`);
        }
        const json = await res.json();
        const payload = json?.data ?? json;
        setData(normalizePayload(payload));
      } catch (e: any) {
        console.error(e);
        setErrMsg(e?.message ?? "No se pudo cargar la banda.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort("cleanup");
  }, [bandId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-52 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <Skeleton className="h-5 w-64 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-[80%]" />
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl"><CardHeader><CardTitle>Géneros</CardTitle></CardHeader><CardContent><Skeleton className="h-8 w-full" /></CardContent></Card>
          <Card className="rounded-2xl"><CardHeader><CardTitle>Miembros</CardTitle></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (errMsg || !data) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{errMsg ?? "No se encontró la banda."}</p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { name, description, genres, members } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#65558F]">{name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          {isAdmin && (
            <Button className="bg-[#65558F] text-white" onClick={() => router.push(`/bands/${data.idBand}/manage`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Administrar
            </Button>
          )}
        </div>
      </div>

      {/* Descripción */}
      <Card className="rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#65558F]">
            <Music2 className="h-5 w-5" />
            <span className="font-medium">Descripción</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {description ?? "Sin descripción."}
          </p>
        </CardContent>
      </Card>

      {/* Géneros y Miembros */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-[#65558F]">Géneros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {genres.length ? (
              genres.map((g) => (
                <Badge key={g.idGenre} variant="outline">
                  {g.genreName}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin géneros asignados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-[#65558F] flex items-center gap-2">
              <Users className="h-5 w-5" />
              Miembros
            </CardTitle>
            <Badge variant="secondary">{members.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.length ? (
              members.map((m) => (
                <div key={m.idMusician} className="flex items-center justify-between border rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatarUrl || undefined} />
                      <AvatarFallback>{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <div className="font-medium">{m.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.roleInBand ?? "Sin rol asignado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isAdmin && (
                      <Badge className="inline-flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5" /> Admin
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay miembros aún.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* (Opcional) Sección futura: Próximos ensayos/eventos de la banda */}
      {/* <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-[#65558F]">Agenda</CardTitle></CardHeader>
        <CardContent>…</CardContent>
      </Card> */}
    </div>
  );
}
