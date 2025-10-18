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
import { Crown, Users, Music2, Pencil, ArrowLeft, UserPlus, UserCheck, Megaphone } from "lucide-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/app/context/userContext";
import EditBandDialog from "@/components/EditBandDialog";

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

type BandSearch = {
  idSearch: number;
  idBand: number;
  title: string;
  description: string | null;
  idInstrument: number | null;
  minSkillLevel: "beginner" | "intermediate" | "advanced" | "expert" | null;
  isRemote: boolean;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  isActive: boolean;
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
  const base = raw?.band ?? raw ?? {};
  const genresSrc = Array.isArray(raw?.genres) ? raw.genres : Array.isArray(base?.genres) ? base.genres : [];
  const genres: GenreObj[] = genresSrc.map((g: any, i: number) =>
    typeof g === "string" ? { idGenre: i + 1, genreName: g } : {
      idGenre: g?.idGenre ?? g?.id ?? (i + 1),
      genreName: g?.genreName ?? g?.name ?? String(g ?? ""),
    }
  );
  const membersSrc = Array.isArray(raw?.members) ? raw.members : Array.isArray(base?.members) ? base.members : [];
  const members: Member[] = membersSrc.map((m: any) => ({
    idMusician: Number(m?.idMusician ?? m?.musicianId ?? m?.id ?? 0),
    displayName: m?.displayName ?? m?.name ?? (m?.idMusician ? `Músico ${m.idMusician}` : "Miembro"),
    avatarUrl: m?.avatarUrl ?? null,
    roleInBand: m?.roleInBand ?? null,
    isAdmin: Boolean(m?.isAdmin),
    joinedAt: m?.joinedAt ?? null,
  }));
  return { idBand: Number(base?.idBand ?? base?.id ?? base?.id_band ?? 0) || 0, name: base?.name ?? "", description: base?.description ?? null, genres, members };
}
function normalizeSearch(raw: any): BandSearch {
  return {
    idSearch: Number(raw?.idSearch),
    idBand: Number(raw?.idBand),
    title: String(raw?.title ?? ""),
    description: raw?.description ?? null,
    idInstrument: raw?.idInstrument != null ? Number(raw.idInstrument) : null,
    minSkillLevel: raw?.minSkillLevel ?? null,
    isRemote: Boolean(raw?.isRemote),
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updatedAt ?? raw?.createdAt ?? new Date().toISOString(),
    isActive: raw?.isActive ?? true,
  };
}
export default function BandHome() {
  const router = useRouter();
  const params = useParams() as { id?: string; idBand?: string };
  const idRaw = params?.id ?? params?.idBand;
  const bandId = idRaw != null ? Number(idRaw) : NaN;
  const hasId = idRaw != null && Number.isFinite(bandId);

  const { user, ready } = useUser();
  const [myMusicianId, setMyMusicianId] = useState<number | null>(null);

  const [data, setData] = useState<BandView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Diálogo “Publicar búsqueda”
  const [openSearch, setOpenSearch] = useState(false);
  const [titleS, setTitleS] = useState("");
  const [descS, setDescS] = useState("");
  const [instIdS, setInstIdS] = useState<string>("");
  const [levelS, setLevelS] = useState<string>("");
  const [remoteS, setRemoteS] = useState<boolean>(false);
  const [kickingId, setKickingId] = useState<number | null>(null);
  const [searches, setSearches] = useState<BandSearch[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const [searchesError, setSearchesError] = useState<string | null>(null);

  type MembershipState = { isMember: boolean; isFollowing: boolean } | null;
  const [mship, setMship] = useState<MembershipState>(null);
  const [savingFollow, setSavingFollow] = useState(false);

  const isAdmin = useMemo(() => {
    if (!data || !Number.isFinite(myMusicianId as any)) return false;
    return data.members.some(m => m.idMusician === myMusicianId && m.isAdmin);
  }, [data, myMusicianId]);

  // --- acciones

  async function loadSearches(bandIdToLoad?: number) {
    const id = bandIdToLoad ?? data?.idBand;
    if (!id) return;
    try {
      setLoadingSearches(true);
      setSearchesError(null);
      const res = await fetch(`${API_URL}/bands/${id}/searches`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP ${res.status}`);
      const items = Array.isArray(json.data) ? json.data.map(normalizeSearch) : [];
      setSearches(items);
    } catch (e: any) {
      setSearchesError(e?.message ?? "No se pudieron cargar las búsquedas");
    } finally {
      setLoadingSearches(false);
    }
  }

  async function kickMember(idMusician: number) {
    if (!data) return;
    const confirmMsg = "¿Seguro que querés echar a este miembro de la banda?";
    if (!window.confirm(confirmMsg)) return;

    try {
      setKickingId(idMusician);
      const res = await fetch(`${API_URL}/bands/${data.idBand}/members/${idMusician}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      setData(prev => prev ? { ...prev, members: prev.members.filter(m => m.idMusician !== idMusician) } : prev);
      toast.success("Miembro eliminado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar el miembro");
    } finally {
      setKickingId(null);
    }
  }
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
      await loadSearches(data!.idBand);
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
      setMship({ ...mship, isFollowing: next }); // optimista
      const method = next ? "POST" : "DELETE";
      const r = await fetch(`${API_URL}/bands/${data.idBand}/follow`, {
        method, credentials: "include", headers: { Accept: "application/json" },
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

  // --- efectos

  useEffect(() => {
    if (data?.idBand) loadSearches(data.idBand);
  }, [data?.idBand]);

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
          credentials: "include", headers: { Accept: "application/json" }, cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        const payload = json?.data ?? json;
        const id = Number(payload?.musician?.idMusician);
        if (Number.isFinite(id) && id > 0) setMyMusicianId(id);
      } catch { }
    })();
  }, [ready, user]);

  useEffect(() => {
    if (!hasId) return;
    const ac = new AbortController();
    setLoading(true);
    setErrMsg(null);
    (async () => {
      try {
        const res = await fetch(`${API_URL}/bands/${bandId}`, {
          signal: ac.signal, credentials: "include", headers: { Accept: "application/json" }, cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const payload = json?.data ?? json;
        setData(normalizePayload(payload));
      } catch (e: any) {
        setErrMsg(e?.message ?? "No se pudo cargar la banda.");
      } finally {
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
          credentials: "include", headers: { Accept: "application/json" }, cache: "no-store",
        });
        if (r.ok) {
          const m = await r.json();
          setMship({ isMember: !!m.isMember, isFollowing: !!m.isFollowing });
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

  // ===== Render =====
  if (!hasId) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        <Card className="rounded-2xl"><CardContent className="p-6">Cargando…</CardContent></Card>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <Skeleton className="h-8 w-60 rounded-xl" />
        <Card className="rounded-2xl"><CardContent className="p-6"><Skeleton className="h-5 w-1/2 mb-2" /><Skeleton className="h-4 w-full" /></CardContent></Card>
      </div>
    );
  }
  if (!isBandView(data)) {
    return (
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <Card className="rounded-2xl"><CardContent className="p-6 text-sm text-muted-foreground">{errMsg ?? "No se encontró la banda."}</CardContent></Card>
      </div>
    );
  }

  const { name, description, genres, members } = data;

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
      {/* Header: nombre en violeta */}
      <section className="rounded-2xl border border-[#E9E6F7] bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-2 sm:gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#65558F]">{name}</h1>
        </div>
      </section>

      {/* Grid principal */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Columna izquierda: panel de acciones amigable */}
        <div className="md:col-span-1 md:order-2 md:sticky md:top-6">
          <Card className="rounded-2xl border border-[#E9E6F7] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#65558F]">Panel de acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isAdmin ? (
                <>
                  <Button
                    className="w-full rounded-xl text-white hover:bg-[#5a4d82]"
                    style={{ backgroundColor: BRAND }}
                    onClick={() => {
                      document
                        .getElementById("edit-band-dialog-trigger")
                        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar banda
                  </Button>

                  <Dialog open={openSearch} onOpenChange={setOpenSearch}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full rounded-xl text-white hover:bg-[#5a4d82]"
                        style={{ backgroundColor: BRAND }}
                      >
                        <Megaphone className="mr-2 h-4 w-4" /> Publicar búsqueda
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Nueva búsqueda</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-1">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Título *</label>
                          <Input value={titleS} onChange={(e) => setTitleS(e.target.value)} placeholder="Ej: Buscamos guitarrista líder" className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Descripción</label>
                          <Textarea rows={4} value={descS} onChange={(e) => setDescS(e.target.value)} placeholder="Detalles, horarios, referencias..." className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">ID Instrumento (opcional)</label>
                            <Input value={instIdS} onChange={(e) => setInstIdS(e.target.value)} placeholder="Ej: 1 (Guitarra)" className="rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Nivel mínimo (opcional)</label>
                            <Input value={levelS} onChange={(e) => setLevelS(e.target.value)} placeholder="beginner|intermediate|advanced" className="rounded-xl" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={remoteS} onCheckedChange={(v) => setRemoteS(Boolean(v))} />
                          Trabajo remoto / a distancia
                        </label>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenSearch(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={createSearch} className="rounded-xl text-white hover:bg-[#5a4d82]" style={{ backgroundColor: BRAND }}>Publicar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <p className="text-xs text-muted-foreground pt-1">Tip: mantené actualizado el perfil para recibir mejores postulaciones.</p>
                </>
              ) : (
                <>
                  {mship && !mship.isMember && (
                    <Button
                      variant={mship.isFollowing ? "outline" : "default"}
                      className={`w-full rounded-xl ${mship.isFollowing ? "" : "text-white hover:bg-[#5a4d82]"}`}
                      style={mship.isFollowing ? undefined : { backgroundColor: BRAND }}
                      onClick={toggleFollow}
                      disabled={savingFollow}
                    >
                      {mship.isFollowing ? (<><UserCheck className="mr-2 h-4 w-4" /> Siguiendo</>) : (<><UserPlus className="mr-2 h-4 w-4" /> Seguir banda</>)}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Seguí la banda para enterarte de nuevas búsquedas.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: descripción + listas */}
        <div className="md:col-span-2 space-y-6">
          {/* Descripción */}
          <Card className="rounded-2xl shadow-sm border border-[#E9E6F7]">
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium" style={{ color: BRAND, backgroundColor: "#65558F1A" }}>
                <Music2 className="h-4 w-4" /> Descripción
              </div>
              <p className="text-sm leading-relaxed text-[#5A5470]">
                {description ?? "Sin descripción."}
              </p>
            </CardContent>
          </Card>

          {/* Géneros y Miembros */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="rounded-2xl shadow-sm border border-[#E9E6F7]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold" style={{ color: BRAND }}>Géneros</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {genres.length ? (
                  genres.map((g) => (
                    <Badge key={g.idGenre} variant="secondary" className="rounded-full border bg-[#F4F1FB] text-[#3A2E5E]">
                      {g.genreName}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Sin géneros asignados.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border border-[#E9E6F7]">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
                  <Users className="h-5 w-5" /> Miembros
                </CardTitle>
                <Badge variant="outline" className="rounded-full">{members.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.length ? (
                  members.map((m) => (
                    <div key={m.idMusician} className="flex items-center justify-between rounded-xl border border-[#EFEAFD] p-3 hover:bg-[#F8F6FF] transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={m.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs font-medium">{(m.displayName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium leading-none text-[#2A2140]">{m.displayName}</div>
                          <div className="text-xs text-[#5A5470] mt-1">
                            {m.roleInBand ?? "Sin rol asignado"}
                          </div>
                        </div>
                      </div>
                      <div>
                        {m.isAdmin && (
                          <Badge className="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] text-[#5B21B6] border border-[#E9E6F7]">
                            <Crown className="h-3.5 w-3.5" /> Admin
                          </Badge>
                        )}
                        {isAdmin && !m.isAdmin && m.idMusician !== myMusicianId && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => kickMember(m.idMusician)}
                            disabled={kickingId === m.idMusician}
                            className="rounded-full"
                            title="Echar de la banda"
                          >
                            {kickingId === m.idMusician ? "Echando..." : "Echar"}
                          </Button>
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
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm border border-[#E9E6F7]">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2" style={{ color: BRAND }}>
            <Megaphone className="h-5 w-5" /> Búsquedas publicadas
          </CardTitle>
          <Badge variant="outline" className="rounded-full">{searches.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingSearches ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          ) : searchesError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {searchesError}
            </p>
          ) : searches.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/30">
              La banda no publicó búsquedas aún.
            </div>
          ) : (
            <ul className="space-y-2">
              {searches.map((s) => (
                <li key={s.idSearch} className="p-3 rounded-xl border hover:shadow-sm transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-[#2A2140]">{s.title}</div>
                      {s.description && (
                        <div className="text-xs text-[#5A5470] mt-1 whitespace-pre-line">
                          {s.description}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {s.minSkillLevel && (
                          <Badge variant="secondary" className="rounded-full bg-[#F4F1FB] text-[#3A2E5E] border">
                            Nivel: {s.minSkillLevel}
                          </Badge>
                        )}
                        {s.idInstrument != null && (
                          <Badge variant="outline" className="rounded-full">
                            Instrumento ID: {s.idInstrument}
                          </Badge>
                        )}
                        <Badge
                          className={`rounded-full ${s.isRemote
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                        >
                          {s.isRemote ? "Remoto" : "Presencial"}
                        </Badge>
                        {!s.isActive && (
                          <Badge className="rounded-full bg-zinc-100 text-zinc-700 border-zinc-200">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right min-w-[140px]">
                      <div>Creada:</div>
                      <div className="font-mono">
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Trigger oculto para abrir el diálogo de editar */}
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
