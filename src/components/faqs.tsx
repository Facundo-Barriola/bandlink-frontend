"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/app/context/userContext";
import { Card, CardContent } from "@/components/ui/card";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const BRAND = {
  primary: "#65558F",
  border: "#E3D7FF",
  bgLavender: "#EADDFF",
  text: "#49454F",
};

type Faq = {
  idFaq: number;
  question: string;
  answer: string;
};

export default function FaqList() {
  const { user } = useUser();
  const group = user?.idUserGroup ?? 0;

  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFaqs = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("group", String(group));
      if (q && q.trim()) qs.set("q", q.trim());
      const res = await fetch(`${API}/faqs?${qs.toString()}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setItems(Array.isArray(j.data) ? j.data : []);
    } catch (e: any) {
      setError(e?.message ?? "No se pudieron cargar las FAQs");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // carga inicial / cuando cambia el grupo
  useEffect(() => {
    fetchFaqs(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  // debounce de búsqueda
  useEffect(() => {
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => fetchFaqs(term), 250);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="rounded-2xl border shadow-sm" style={{ borderColor: BRAND.border }}>
        <CardContent className="p-5">
          <div className="mb-4">
            <h2 className="text-xl font-semibold" style={{ color: BRAND.primary }}>
              Preguntas frecuentes
            </h2>
            <p className="text-sm opacity-70">Encontrá respuestas rápidas sobre Bandlink.</p>
          </div>

          <div className="mb-4">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por palabra clave…"
              className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-shadow"
              style={{ borderColor: BRAND.border }}
              onFocusCapture={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND.primary}22`)}
              onBlurCapture={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
          </div>

          {loading && <div className="text-sm opacity-70">Cargando…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="text-sm opacity-70">No se encontraron FAQs.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-2">
              {items.map((f) => (
                <details key={f.idFaq} className="group rounded-xl border" style={{ borderColor: BRAND.border }}>
                  <summary
                    className="cursor-pointer list-none px-4 py-3 rounded-xl flex items-center justify-between gap-3"
                    style={{ background: "#fff" }}
                  >
                    <span className="font-medium">{f.question}</span>
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ background: BRAND.bgLavender, color: BRAND.primary }}
                    >
                      Ver
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-sm"
                       style={{ color: BRAND.text, whiteSpace: "pre-line" }}>
                    {f.answer}
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
