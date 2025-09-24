"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ReviewPayload = {
  targetIdUser: number;
  rating: number;
  comment: string | null;
};

export function RateUserDialog({
  open,
  onOpenChange,
  targetIdUser,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetIdUser: number;
  onSubmitted?: (p: ReviewPayload) => void;
}) {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const current = hover || rating;

  async function handleSubmit() {
    setErr(null);
    if (rating < 1 || rating > 5) {
      setErr("Elegí una calificación de 1 a 5 estrellas.");
      return;
    }
    setLoading(true);
    try {
      const body: ReviewPayload = {
        targetIdUser,
        rating,
        comment: comment.trim() ? comment.trim() : null,
      };
      const res = await fetch(`${API}/feedback/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      onSubmitted?.(body);
      // reset y cerrar
      setRating(0);
      setHover(0);
      setComment("");
      onOpenChange(false);
      alert("¡Calificación enviada!");
    } catch (e: any) {
      setErr(e?.message || "No se pudo enviar la calificación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Calificar usuario</DialogTitle>
        </DialogHeader>

        {/* Estrellas */}
        <div className="flex items-center gap-1 py-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const val = i + 1;
            const active = val <= current;
            return (
              <button
                key={val}
                type="button"
                className="p-1"
                onMouseEnter={() => setHover(val)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(val)}
                aria-label={`${val} estrella${val > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-6 w-6 ${active ? "text-yellow-500" : "text-muted-foreground"}`}
                  // truco para “rellenar” el Star de lucide
                  fill="currentColor"
                />
              </button>
            );
          })}
          {current > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{current}/5</span>
          )}
        </div>

        {/* Comentario */}
        <div className="space-y-2">
          <Label htmlFor="review-comment">Comentario (opcional)</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Contá brevemente tu experiencia…"
            className="rounded-xl"
            rows={4}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">Tu calificación puede ser visible para otros usuarios.</p>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleSubmit}
            disabled={loading || rating < 1}
          >
            {loading ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
