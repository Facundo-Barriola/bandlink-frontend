"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Music, Users, CheckCircle2, ArrowLeft, ArrowRight, Search, Plus } from "lucide-react";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMusicianSearch } from "@/hooks/useMusicianSearch";
import { useUser } from "@/app/context/userContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Genre = { idGenre: number; genreName: string };
type MusicianLite = { idMusician: number; displayName: string; mainInstrument?: string | null; avatarUrl?: string | null };
type InviteDraft = { idMusician: number; roleInBand: string | null; message?: string | null };

async function $get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return (json?.data ?? json) as T;
}
async function $post<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return (json?.data ?? json) as T;
}

// Util para extraer idBand de cualquier shape
function extractId(v: any): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof v === "object") {
    return extractId(
      v.idBand ?? v.id ?? v.bandId ?? v.band?.idBand ?? v.band?.id
    );
  }
  return undefined;
}

type Props = { onCreated?: (idBand: number) => void; triggerLabel?: string };
export function BandWizard({ onCreated, triggerLabel = "Nueva banda" }: Props) {
  const steps = ["Detalles", "Géneros", "Miembros", "Confirmar"] as const;
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const progress = useMemo(() => Math.round(((stepIdx + 1) / steps.length) * 100), [stepIdx]);

  const { user } = useUser();
  const myMusicianId = Number((user as any)?.idMusician);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const { term, setTerm, results, loading } = useMusicianSearch();

  const [invites, setInvites] = useState<InviteDraft[]>([]);

  function resetAll() {
    setStepIdx(0);
    setName("");
    setDescription("");
    setGenres([]);
    setSelectedGenres([]);
    setInvites([]);
  }

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setGenresLoading(true);
        const data = await $get<Genre[]>(`${API_URL}/directory/genres`);
        setGenres(data);
      } catch (e: any) {
        console.error(e);
        toast.error("No se pudieron cargar los géneros");
      } finally {
        setGenresLoading(false);
      }
    })();
  }, [open]);

  function toggleGenre(idGenre: number, checked: boolean) {
    setSelectedGenres(prev => (checked ? [...prev, idGenre] : prev.filter(id => id !== idGenre)));
  }

  function addInvite(m: MusicianLite) {
    const targetId = Number(m.idMusician);
    if (!Number.isFinite(targetId)) return;
    if (Number.isFinite(myMusicianId) && targetId === myMusicianId) {
      toast("No podés invitarte a vos mismo");
      return;
    }
    if (invites.some(x => x.idMusician === targetId)) return;
    setInvites(prev => [...prev, { idMusician: targetId, roleInBand: "", message: "" }]);
  }
  function removeInvite(idMusician: number) {
    setInvites(prev => prev.filter(x => x.idMusician !== idMusician));
  }
  function setInviteRole(idMusician: number, role: string) {
    setInvites(prev => prev.map(x => x.idMusician === idMusician ? { ...x, roleInBand: role } : x));
  }
  function setInviteMessage(idMusician: number, msg: string) {
    setInvites(prev => prev.map(x => x.idMusician === idMusician ? { ...x, message: msg } : x));
  }

  const canNextDetails = name.trim().length >= 3;
  const canNextGenres = true || selectedGenres.length > 0;
  const canSubmit = canNextDetails;

  async function handleSubmit() {
    try {
      if (!canSubmit) {
        toast.error("Completá el nombre de la banda");
        return;
      }

      // 1) crear banda (sin invites)
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        genres: selectedGenres.map(id => ({ idGenre: id })),
      };
      const createdRaw = await $post<any>(`${API_URL}/bands/`, payload);
      const idBand = extractId(createdRaw);
      if (!Number.isFinite(idBand)) throw new Error("No se pudo determinar el id de la banda creada.");

      // 2) enviar invitaciones (endpoint correcto: /bands/:id/invites)
      if (invites.length) {
        const invitesToSend = invites
          .map(i => ({ ...i, idMusician: Number(i.idMusician) }))
          .filter(i => Number.isFinite(i.idMusician) && (!Number.isFinite(myMusicianId) || i.idMusician !== myMusicianId));

        if (invitesToSend.length) {
          const results = await Promise.allSettled(
            invitesToSend.map(i =>
              fetch(`${API_URL}/band-invites/${idBand}/invites`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                  targetMusicianId: i.idMusician,
                  roleSuggested: i.roleInBand?.trim() || null,
                  message: i.message?.trim() || null,
                }),
              })
                .then(async (r) => {
                  let body: any = {};
                  try { body = await r.json(); } catch {}
                  return { httpOk: r.ok, status: r.status, ...(body ?? {}) }; // { ok?:bool, error?:str }
                })
                .catch((err) => ({ httpOk: false, status: 0, ok: false, error: String(err) }))
            )
          );

          const fulfilled = results.filter(r => r.status === "fulfilled").map(r => (r as any).value);
          const okCount   = fulfilled.filter(v => v.httpOk && (v.ok ?? true)).length;
          const failItems = fulfilled.filter(v => !v.httpOk || v.ok === false);

          if (okCount) toast.success(`Invitaciones enviadas: ${okCount}`);
          if (failItems.length) {
            const first = failItems[0];
            toast.error(`Error invitando: ${first.error ?? `HTTP ${first.status}`}`);
          }
          if (okCount === 0) return; // no navegamos si todas fallaron
        }
      }

      // 3) cerrar y navegar
      setOpen(false);
      resetAll();
      onCreated?.(idBand!);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "No se pudo crear la banda");
    }
  }

  function next() {
    if (stepIdx < steps.length - 1) setStepIdx(i => i + 1);
  }
  function prev() {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-[#65558F] text-white">
          <Plus className="mr-2 h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] sm:max-w-[640px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-[#65558F]">Crear banda</DialogTitle>
          <DialogDescription>Completá los pasos y confirmá.</DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <Progress value={progress} className="h-2" />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {steps.map((s, i) => (
              <span key={s} className={`mr-2 ${i === stepIdx ? "font-semibold text-[#65558F]" : ""}`}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="px-6 pb-2 pt-4 max-h-[65vh] overflow-y-auto">
          {/* Detalles */}
          {step === "Detalles" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm mb-1 block">Nombre *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Los Viajeros" />
                <p className="text-xs text-muted-foreground mt-1">Mínimo 3 caracteres.</p>
              </div>
              <div>
                <label className="text-sm mb-1 block">Descripción</label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Estilo, influencias, objetivos…" />
              </div>
            </div>
          )}

          {/* Géneros */}
          {step === "Géneros" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-[#65558F]" />
                <p className="font-medium">Géneros musicales</p>
              </div>
              {genresLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {genres.map(g => {
                    const checked = selectedGenres.includes(g.idGenre);
                    return (
                      <label
                        key={g.idGenre}
                        className={`flex items-center gap-2 border rounded-xl p-2 cursor-pointer ${checked ? "border-[#65558F] bg-[#65558F]/5" : ""}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleGenre(g.idGenre, Boolean(v))} />
                        <span className="text-sm">{g.genreName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {selectedGenres.map(id => {
                  const g = genres.find(x => x.idGenre === id);
                  if (!g) return null;
                  return <Badge key={id} className="bg-[#65558F] text-white rounded-full">{g.genreName}</Badge>;
                })}
              </div>
            </div>
          )}

          {/* Miembros */}
          {step === "Miembros" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#65558F]" />
                <p className="font-medium">Invitar músicos (opcional)</p>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Buscar por nombre, instrumento o género…"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setTerm(""); }}
                  />
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                <Button type="button" disabled className="pointer-events-none">
                  {loading ? "Buscando…" : "Buscar"}
                </Button>
              </div>

              {/* Resultados */}
              {term.trim().length >= 2 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {loading ? "Buscando..." : `${results.length} resultado(s)`}
                  </p>

                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {!loading && results.length === 0 && (
                      <div className="text-sm text-muted-foreground px-2">Sin resultados</div>
                    )}

                    {results.map((m) => {
                      const mainInstrument = (m as any).instruments?.[0] ?? null;
                      const isSelf = Number.isFinite(myMusicianId) && m.idMusician === myMusicianId;
                      const already = invites.some(x => x.idMusician === m.idMusician);
                      return (
                        <div key={m.idMusician} className="flex items-center justify-between border rounded-xl p-3">
                          <div className="text-sm">
                            <p className="font-medium">{m.displayName}</p>
                            <div className="text-xs text-muted-foreground">
                              {mainInstrument ? `Instrumento: ${mainInstrument}` : null}
                              {(m as any).genres?.length ? (mainInstrument ? " · " : "") + (m as any).genres.slice(0, 2).join(", ") : null}
                            </div>
                          </div>
                          {already ? (
                            <Button variant="secondary" size="sm" onClick={() => removeInvite(m.idMusician)}>
                              Quitar
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => addInvite(m)} disabled={isSelf}>
                              Invitar
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invitaciones seleccionadas */}
              {invites.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Invitaciones</p>
                    <div className="space-y-2 max-h-40 overflow-auto pr-1">
                      {invites.map((inv) => (
                        <div key={inv.idMusician} className="flex items-center justify-between border rounded-xl p-3">
                          <div className="text-sm">
                            <span className="font-medium">Músico #{inv.idMusician}</span>
                            <div className="mt-2 flex flex-col gap-2 w-full">
                              <div className="flex items-center gap-2">
                                <Input
                                  className="h-9 flex-1"
                                  placeholder="Rol sugerido (ej: Guitarra líder)"
                                  value={inv.roleInBand ?? ""}
                                  onChange={(e) => setInviteRole(inv.idMusician, e.target.value)}
                                />
                                <Badge variant="outline">
                                  {inv.roleInBand ? "Con rol" : "Sin rol"}
                                </Badge>
                              </div>
                              <Textarea
                                className="w-full"
                                rows={3}
                                placeholder="Mensaje para el músico (opcional)"
                                value={inv.message ?? ""}
                                onChange={(e) => setInviteMessage(inv.idMusician, e.target.value)}
                                maxLength={300}
                              />
                            </div>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => removeInvite(inv.idMusician)}>
                            Quitar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Confirmar */}
          {step === "Confirmar" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#65558F]" />
                <p className="font-medium">Revisá y confirmá</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="font-medium">{name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Descripción</p>
                <p className="font-medium">{description || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Géneros</p>
                <div className="flex flex-wrap gap-2">
                  {selectedGenres.length
                    ? selectedGenres.map(id => {
                        const g = genres.find(x => x.idGenre === id);
                        return <Badge key={id} className="bg-[#65558F] text-white rounded-full">{g?.genreName ?? id}</Badge>;
                      })
                    : <span className="text-sm">—</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invitaciones</p>
                {invites.length ? (
                  <div className="space-y-1 text-sm">
                    {invites.map(inv => (
                      <div key={inv.idMusician}>
                        Músico #{inv.idMusician} {inv.roleInBand ? <span className="text-muted-foreground">• {inv.roleInBand}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : <span className="text-sm">—</span>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{step}</div>
          <div className="flex gap-2">
            {stepIdx > 0 ? (
              <Button variant="outline" onClick={() => prev()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
              </Button>
            ) : (
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
            )}
            {stepIdx < steps.length - 1 ? (
              <Button onClick={() => next()} disabled={(step === "Detalles" && !canNextDetails) || (step === "Géneros" && !canNextGenres)}>
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="bg-[#65558F] text-white" onClick={handleSubmit} disabled={!canSubmit}>
                Crear banda
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
