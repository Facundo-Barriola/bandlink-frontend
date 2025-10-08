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
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Users, Music2, Pencil, ArrowLeft } from "lucide-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/app/context/userContext";
import EditBandDialog from "@/components/EditBandDialog";
import { UserPlus, UserCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BRAND = "#65558F";

// ===== Tipos =====
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
  const [levelS, setLevelS] = useState<string>("");
  const [remoteS, setRemoteS] = useState<boolean>(false);

  type MembershipState = { isMember: boolean; isFollowing: boolean } | null;
  const [mship, setMship] = useState<MembershipState>(null);
  const [savingFollow, setSavingFollow] = useState(false);

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

  async function toggleFollow() {
    if (!data || !mship || savingFollow) return;
    try {
      setSavingFollow(true);
      const next = !mship.isFollowing;
      setMship({ ...mship, isFollowing: next }); // UI optimista
      const method = next ? "POST" : "DELETE";
      const r = await fetch(`${API_URL}/bands/${data.idBand}/follow`, {
        method,
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!r.ok) throw new Error(await r.text());
      toast.success(next ? "Ahora seguís a la banda" : "Dejaste de seguir la banda");
    } catch (e: any) {
      setMship((prev) => (prev ? { ...prev, isFollowing: !prev.isFollowing } : prev));
      toast.error(e?.message ?? "No se pudo actualizar el seguimiento");
    } finally {
      setSavingFollow(false);
    }
  }

  useEffect(() => {
    if (!ready || !user) return;

    const fromCtx = Number((user as any)?.idMusician);
    if (Number.isFinite(fromCtx) && fromCtx > 0) {
      setMyMusicianId(fromCtx);
      return;
    }

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

  useEffect(() => {
    if (!data?.idBand) return;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/bands/${data.idBand}/membership`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (r.ok) {
          const m = await r.json();
          const isMember = !!m.isMember;
          const isFollowing = !!m.isFollowing;
          setMship({ isMember, isFollowing });
        } else {
          const isMember = data.members.some((m) => m.idMusician === myMusicianId);
          setMship({ isMember, isFollowing: false });
        }
      } catch {
        const isMember = data.members.some((m) => m.idMusician === myMusicianId);
        setMship({ isMember, isFollowing: false });
      }
    })();
  }, [data?.idBand, myMusicianId]);

  // ====== Render ======
  if (!hasId) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
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
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <section className="flex items-center justify-between">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </section>
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
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
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
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#65558F]/15 via-background to-background">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:gap-4">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: BRAND }}>
              {name}
            </h1>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 mt-2 pt-2 border-t border-border/60">
              {isAdmin && (
                <>
                  <Button
                    className="h-9 rounded-xl px-4 min-w-[140px] text-white"
                    style={{ backgroundColor: BRAND }}
                    onClick={() => {
                      document
                        .getElementById("edit-band-dialog-trigger")
                        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Administrar
                  </Button>

                  <Dialog open={openSearch} onOpenChange={setOpenSearch}>
                    <DialogTrigger asChild>
                      <Button
                        className="h-9 rounded-xl px-4 min-w-[160px] text-white"
                        style={{ backgroundColor: BRAND }}
                      >
                        Publicar búsqueda
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Nueva búsqueda de músico</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-1">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Título *</label>
                          <Input
                            value={titleS}
                            onChange={(e) => setTitleS(e.target.value)}
                            placeholder="Ej: Buscamos guitarrista líder"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Descripción</label>
                          <Textarea
                            rows={4}
                            value={descS}
                            onChange={(e) => setDescS(e.target.value)}
                            placeholder="Detalles, horarios, referencias..."
                            className="rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">ID Instrumento (opcional)</label>
                            <Input
                              value={instIdS}
                              onChange={(e) => setInstIdS(e.target.value)}
                              placeholder="Ej: 1 (Guitarra)"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Nivel mínimo (opcional)</label>
                            <Input
                              value={levelS}
                              onChange={(e) => setLevelS(e.target.value)}
                              placeholder="beginner|intermediate|advanced..."
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={remoteS}
                            onCheckedChange={(v) => setRemoteS(Boolean(v))}
                          />
                          Trabajo remoto / a distancia
                        </label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenSearch(false)} className="rounded-xl">
                          Cancelar
                        </Button>
                        <Button
                          onClick={createSearch}
                          className="rounded-xl text-white"
                          style={{ backgroundColor: BRAND }}
                        >
                          Publicar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {mship && !mship.isMember && (
                <Button
                  variant={mship.isFollowing ? "outline" : "default"}
                  className={`h-9 rounded-xl px-4 min-w-[148px] ${mship.isFollowing ? "" : "text-white"}`}
                  style={mship.isFollowing ? undefined : { backgroundColor: BRAND }}
                  onClick={toggleFollow}
                  disabled={savingFollow}
                >
                  {mship.isFollowing ? (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" /> Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Seguir banda
                    </>
                  )}
                </Button>
              )}

              {/* Volver (secundario) */}
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="h-9 rounded-xl px-4 min-w-[112px] transition-all"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Descripción */}
      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium" style={{ color: BRAND, backgroundColor: "#65558F1A" }}>
            <Music2 className="h-4 w-4" /> Descripción
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description ?? "Sin descripción."}
          </p>
        </CardContent>
      </Card>

      {/* Géneros y Miembros */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold" style={{ color: BRAND }}>Géneros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {genres.length ? (
              genres.map((g) => (
                <Badge key={g.idGenre} variant="secondary" className="rounded-full border bg-muted/40 hover:bg-muted">
                  {g.genreName}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sin géneros asignados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
              <Users className="h-5 w-5" /> Miembros
            </CardTitle>
            <Badge variant="outline" className="rounded-full">{members.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.length ? (
              members.map((m) => (
                <div key={m.idMusician} className="flex items-center justify-between rounded-xl border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs font-medium">{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <div className="font-medium leading-none">{m.displayName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {m.roleInBand ?? "Sin rol asignado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.isAdmin && (
                      <Badge className="inline-flex items-center gap-1 rounded-full" style={{ backgroundColor: "#F5F3FF", color: BRAND }}>
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
      <button id="edit-band-dialog-trigger" className="hidden" />
      <EditBandDialog
        idBand={data.idBand}
        onUpdated={(patch) => {
          setData((prev) => {
            if (!prev) return prev;
            const next = { ...prev } as any;
            if (patch.name !== undefined) next.name = patch.name ?? next.name;
            if (patch.description !== undefined) next.description = patch.description ?? next.description;
            if (patch.genres) next.genres = patch.genres.map((g, i) => ({ idGenre: i + 1, genreName: g }));
            return next;
          });
        }}
      />
    </div>
  );
}
