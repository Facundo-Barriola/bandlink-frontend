"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/app/context/userContext";
import { Star } from "lucide-react";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// ---- Types (map to backend) ----
export type ReviewWithAuthor = {
  idReview: number;
  targetIdUser: number;
  authorIdUser: number;
  rating: number; // 1..5
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
};

export type CommentWithAuthor = {
  idComment: number;
  targetIdUser: number;
  authorIdUser: number;
  body: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
};

export type RatingSummary = {
  idUser: number;
  avgRating: number | null;
  ratingsCount: number;
};

// ---- Helpers ----
function Stars({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} width={size} height={size} className={i < v ? "fill-[#65558F] text-[#65558F]" : "text-gray-300"} />
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR")} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---- Component ----
export default function UserFeedbackPanel({
  targetIdUser,
  showRateButton = false,
  showCommentBox = true,
  pageSize = 5,
}: {
  targetIdUser: number;
  showRateButton?: boolean; // para evitar duplicar RateUserButton si ya lo pones en el header
  showCommentBox?: boolean; // caja para comentar (si está logueado y no es su propio perfil)
  pageSize?: number;
}) {
  const { user, ready } = useUser();
  const isOwner = ready && user?.idUser === targetIdUser;

  const [loading, setLoading] = useState(true);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<RatingSummary>({ idUser: targetIdUser, avgRating: null, ratingsCount: 0 });
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [revOffset, setRevOffset] = useState(0);
  const [revHasMore, setRevHasMore] = useState(true);

  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [comOffset, setComOffset] = useState(0);
  const [comHasMore, setComHasMore] = useState(true);
  const [newComment, setNewComment] = useState("");

  // initial load (summary + first page of reviews + comments)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Reviews (trae también summary dentro de data)
        const revRes = await fetch(`${API}/feedback/reviews?targetIdUser=${targetIdUser}&limit=${pageSize}&offset=0`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const revJson = await revRes.json().catch(() => ({}));
        if (!revRes.ok || !revJson?.ok) throw new Error(revJson?.error || `HTTP ${revRes.status}`);
        const revData = revJson.data as { items: ReviewWithAuthor[]; summary: RatingSummary };

        // Comments
        const comRes = await fetch(`${API}/feedback/comments?targetIdUser=${targetIdUser}&limit=${pageSize}&offset=0`, {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const comJson = await comRes.json().catch(() => ({}));
        if (!comRes.ok || !comJson?.ok) throw new Error(comJson?.error || `HTTP ${comRes.status}`);
        const comData = comJson.data as { items: CommentWithAuthor[] };

        if (!alive) return;
        setSummary(revData.summary ?? { idUser: targetIdUser, avgRating: null, ratingsCount: 0 });
        setReviews(revData.items ?? []);
        setRevOffset((revData.items ?? []).length);
        setRevHasMore((revData.items ?? []).length >= pageSize);

        setComments(comData.items ?? []);
        setComOffset((comData.items ?? []).length);
        setComHasMore((comData.items ?? []).length >= pageSize);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "No se pudo cargar la reputación");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [targetIdUser, pageSize]);

  async function loadMoreReviews() {
    try {
      setLoadingMoreReviews(true);
      const res = await fetch(`${API}/feedback/reviews?targetIdUser=${targetIdUser}&limit=${pageSize}&offset=${revOffset}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const data = json.data as { items: ReviewWithAuthor[]; summary: RatingSummary };
      setReviews(prev => [...prev, ...(data.items ?? [])]);
      setRevOffset(prev => prev + (data.items?.length ?? 0));
      setRevHasMore((data.items?.length ?? 0) >= pageSize);
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron cargar más reseñas");
    } finally {
      setLoadingMoreReviews(false);
    }
  }

  async function loadMoreComments() {
    try {
      setLoadingMoreComments(true);
      const res = await fetch(`${API}/feedback/comments?targetIdUser=${targetIdUser}&limit=${pageSize}&offset=${comOffset}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const data = json.data as { items: CommentWithAuthor[] };
      setComments(prev => [...prev, ...(data.items ?? [])]);
      setComOffset(prev => prev + (data.items?.length ?? 0));
      setComHasMore((data.items?.length ?? 0) >= pageSize);
    } catch (e: any) {
      toast.error(e?.message || "No se pudieron cargar más comentarios");
    } finally {
      setLoadingMoreComments(false);
    }
  }

  async function reloadCommentsFromStart() {
    try {
      const res = await fetch(`${API}/feedback/comments?targetIdUser=${targetIdUser}&limit=${pageSize}&offset=0`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      const data = json.data as { items: CommentWithAuthor[] };
      setComments(data.items ?? []);
      setComOffset((data.items ?? []).length);
      setComHasMore((data.items ?? []).length >= pageSize);
    } catch (e: any) {
      // silencioso
    }
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`${API}/feedback/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ targetIdUser, body: newComment.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      // En vez de depender de campos del contexto (displayName/avatarUrl), refrescamos desde el backend
      await reloadCommentsFromStart();
      setNewComment("");
      toast.success("Comentario publicado");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo publicar el comentario");
    }
  }

  const avg = summary.avgRating ?? 0;
  const ratingsCount = summary.ratingsCount ?? 0;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg text-[#65558F]">Reputación</CardTitle>
          {showRateButton && !isOwner && (
            // Podés pasar tu propio RateUserButton en el header del perfil; este flag evita duplicarlo
            <Badge className="bg-[#65558F] text-white">Calificar</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-4">
          <div className="text-3xl font-semibold text-[#65558F]">{avg ? avg.toFixed(1) : "–"}</div>
          <div>
            <Stars value={avg} size={18} />
            <div className="text-xs text-muted-foreground">{ratingsCount} {ratingsCount === 1 ? "reseña" : "reseñas"}</div>
          </div>
        </div>

        <Separator />

        {/* Reviews list */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80">Reseñas</h3>
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay reseñas.</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.idReview} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-violet-200 overflow-hidden" />
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{r.authorDisplayName ?? "@usuario"}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</div>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{r.comment}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Stars value={r.rating} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {revHasMore && (
            <div className="pt-1">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={loadMoreReviews} disabled={loadingMoreReviews}>
                {loadingMoreReviews ? "Cargando..." : "Cargar más reseñas"}
              </Button>
            </div>
          )}
        </section>

        <Separator />

        {/* Comments */}
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80">Comentarios</h3>

          {/* New comment */}
          {showCommentBox && !isOwner && user?.idUser && (
            <div className="space-y-2">
              <Textarea
                placeholder="Escribí un comentario público..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex justify-end">
                <Button className="rounded-xl bg-[#65558F] text-white" onClick={submitComment} disabled={!newComment.trim()}>
                  Publicar
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin comentarios todavía.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.idComment} className="rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-fuchsia-200" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">
                          {c.authorDisplayName ?? (user?.idUser === c.authorIdUser ? "Vos" : "@usuario")}
                        </div>
                        <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {comHasMore && (
            <div className="pt-1">
              <Button size="sm" variant="outline" className="rounded-xl" onClick={loadMoreComments} disabled={loadingMoreComments}>
                {loadingMoreComments ? "Cargando..." : "Cargar más comentarios"}
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
