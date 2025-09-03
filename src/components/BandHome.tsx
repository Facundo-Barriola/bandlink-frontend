
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
import { Crown, Users, Music2, Pencil, ArrowLeft, } from "lucide-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
function isBandView(d: BandView | null): d is BandView {
  return !!d && Number.isFinite(Number(d.idBand));
}
function normalizePayload(raw: any): BandView {
  // Soporta objeto plano o { band, genres, members }
  const base = raw?.band ?? raw ?? {};

  const genresSrc = Array.isArray(raw?.genres)
    ? raw.genres
    : Array.isArray(base?.genres)
      ? base.genres
      : [];
  const genres: GenreObj[] = genresSrc.map((g: any, i: number) =>
    typeof g === "string"
      ? { idGenre: i + 1, genreName: g }
      : {
        idGenre: g?.idGenre ?? g?.id ?? (i + 1),
        genreName: g?.genreName ?? g?.name ?? String(g ?? ""),
      }
  );

  const membersSrc = Array.isArray(raw?.members)
    ? raw.members
    : Array.isArray(base?.members)
      ? base.members
      : [];
  const members: Member[] = membersSrc.map((m: any) => ({
    idMusician: Number(m?.idMusician ?? m?.musicianId ?? m?.id ?? 0),
    displayName:
      m?.displayName ??
      m?.name ??
      (m?.idMusician ? `Músico ${m.idMusician}` : "Miembro"),
    avatarUrl: m?.avatarUrl ?? null,
    roleInBand: m?.roleInBand ?? null,
    isAdmin: Boolean(m?.isAdmin),
    joinedAt: m?.joinedAt ?? null,
  }));

  return {
    idBand: Number(base?.idBand ?? base?.id ?? base?.id_band ?? 0) || 0,
    name: base?.name ?? "",
    description: base?.description ?? null,
    genres,
    members,
  };
}

export default function BandHome() {
  const router = useRouter();
  const params = useParams() as { id?: string; idBand?: string };
  const idRaw = params?.id ?? params?.idBand;
  const bandId = idRaw != null ? Number(idRaw) : NaN;
  const hasId = idRaw != null && Number.isFinite(bandId);
  const [myMusicianId, setMyMusicianId] = useState<number | null>(null);

  const { user, ready } = useUser();
  const [data, setData] = useState<BandView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const [openSearch, setOpenSearch] = useState(false);
  const [titleS, setTitleS] = useState("");
  const [descS, setDescS] = useState("");
  const [instIdS, setInstIdS] = useState<string>("");
  const [levelS, setLevelS] = useState<string>(""); // 'beginner' | 'intermediate' | 'advanced' | ...
  const [remoteS, setRemoteS] = useState<boolean>(false);

  const isAdmin = useMemo(() => {
    if (!data || !Number.isFinite(myMusicianId as any)) return false;
    return data.members.some(m => m.idMusician === myMusicianId && m.isAdmin);
  }, [data, myMusicianId]);

  async function createSearch() {
    try {
      if (!titleS.trim()) {
        toast.error("Título requerido");
        return;
      }
      const body = {
        title: titleS.trim(),
        description: descS.trim() || null,
        idInstrument: instIdS ? Number(instIdS) : null,
        minSkillLevel: levelS || null,
        isRemote: remoteS,
      };
      const res = await fetch(`${API_URL}/bands/${data!.idBand}/searches`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `HTTP ${res.status}`);
      toast.success("Búsqueda publicada");
      setOpenSearch(false);
      setTitleS(""); setDescS(""); setInstIdS(""); setLevelS(""); setRemoteS(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo publicar la búsqueda");
    }
  }

  useEffect(() => {
    if (!ready || !user) return;

    const fromCtx = Number((user as any)?.idMusician);
    if (Number.isFinite(fromCtx) && fromCtx > 0) {
      setMyMusicianId(fromCtx);
      return;
    }

    // fallback: mapear idUser -> idMusician
    (async () => {
      try {
        const res = await fetch(`${API_URL}/directory/${user.idUser}/profile`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        const payload = json?.data ?? json;
        const id = Number(payload?.musician?.idMusician);
        if (Number.isFinite(id) && id > 0) setMyMusicianId(id);
      } catch (e) {
        // si falla, myMusicianId queda null y no se mostrarán botones
        console.warn("No se pudo resolver idMusician del usuario:", e);
      }
    })();
  }, [ready, user]);

  useEffect(() => {
    if (!hasId) return;
    const ac = new AbortController();
    setLoading(true);
    setErrMsg(null);
    setAttempted(false);
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
        if (e?.name === "AbortError" || String(e?.message).includes("aborted")) return;
        console.error(e);
        setErrMsg(e?.message ?? "No se pudo cargar la banda.");
      } finally {
        setAttempted(true);
        setLoading(false);
      }
    })();
    return () => ac.abort("cleanup");
  }, [hasId, bandId]);

  if (!hasId) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Cargando…</p>
          </CardContent>
        </Card>
      </div>
    );
  }
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


  if (!isBandView(data)) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              {errMsg ?? "No se encontró la banda."}
            </p>
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
            <>
              <Button className="bg-[#65558F] text-white" onClick={() => router.push(`/bands/${data.idBand}/manage`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Administrar
              </Button>
              <Dialog open={openSearch} onOpenChange={setOpenSearch}>
                <DialogTrigger asChild>
                  <Button className="bg-[#65558F] text-white">Publicar búsqueda</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva búsqueda de músico</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm">Título *</label>
                      <Input value={titleS} onChange={(e) => setTitleS(e.target.value)} placeholder="Ej: Buscamos guitarrista líder" />
                    </div>
                    <div>
                      <label className="text-sm">Descripción</label>
                      <Textarea rows={4} value={descS} onChange={(e) => setDescS(e.target.value)} placeholder="Detalles, horarios, referencias..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm">ID Instrumento (opcional)</label>
                        <Input value={instIdS} onChange={(e) => setInstIdS(e.target.value)} placeholder="Ej: 1 (Guitarra)" />
                      </div>
                      <div>
                        <label className="text-sm">Nivel mínimo (opcional)</label>
                        <Input value={levelS} onChange={(e) => setLevelS(e.target.value)} placeholder="beginner|intermediate|advanced..." />
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <Checkbox checked={remoteS} onCheckedChange={(v) => setRemoteS(Boolean(v))} />
                      <span>Trabajo remoto / a distancia</span>
                    </label>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenSearch(false)}>Cancelar</Button>
                    <Button className="bg-[#65558F] text-white" onClick={createSearch}>Publicar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
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
