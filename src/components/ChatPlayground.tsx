"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useChatConnectionsSearch } from "@/hooks/useChatConnectionsSearch";
import { useUser } from "@/app/context/userContext";
import Navbar from "./ui/navbar";
import { Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Colores brand centralizados (por si querés ajustar fine-tuning)
const BRAND = {
  bgSoft: "#F7F2FF",      // fondo suave
  bgLavender: "#EADDFF",  // banda/headers
  primary: "#65558F",     // morado principal
  text: "#49454F",        // texto
  border: "#E3D7FF",      // borde suave
};

type Conversation = {
  idConversation: number;
  title?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  type?: "dm" | "group";
  otherUserId?: number;
  otherId?: number;
  peerUserId?: number;
  otherUser?: { idUser?: number; displayName?: string; avatarUrl?: string | null };
  participants?: number[];
  [k: string]: any;
};


export default function ChatPlayground({ initialConversationId }: { initialConversationId?: number }) {
  const { user, ready } = useUser();
  const meId = user?.idUser ?? undefined;
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const {
    active, activate,
    term, setTerm, results,
    profileById,
    loading: searching,
  } = useChatConnectionsSearch({
    meId,
    apiBase: API,
    hydrateProfiles: true,
    batchChunkSize: 50,
  });

  const [loading, setLoading] = useState(false);
  const [convsRaw, setConvsRaw] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<number | null>(initialConversationId ?? null);
  const deleteConversation = useCallback(async (id: number) => {
    if (!confirm("¿Eliminar esta conversación? Esta acción no se puede deshacer.")) return;

    const snapshot = convsRaw; // para rollback optimista
    setDeletingId(id);
    setConvsRaw((prev) => prev.filter((c) => c.idConversation !== id));
    if (selected === id) setSelected(null);

    try {
      const res = await fetch(`${API}/chat/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // opcional: refrescar desde servidor
      await loadConversations();
    } catch (e) {
      setConvsRaw(snapshot); // rollback
      alert("No se pudo eliminar la conversación.");
    } finally {
      setDeletingId(null);
    }
  }, [API, convsRaw, selected]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/chat/conversations`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = await r.json().catch(() => ({} as any));

      // Admite varios shapes: {data:[…]}, {rows:[…]}, o directamente […]
      const rows: Conversation[] =
        Array.isArray(j?.data) ? j.data :
          Array.isArray(j?.rows) ? j.rows :
            Array.isArray(j) ? j :
              [];
      setConvsRaw(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready) loadConversations(); }, [ready, loadConversations]);

  const convs = useMemo(() => {
    const arr = Array.isArray(convsRaw) ? convsRaw : [];
    return arr.map((c) => {
      const idConversation = c.idConversation ?? (c as any).id ?? (c as any).id_conversation;
      const otherId =
        c.otherUserId ??
        c.peerUserId ??
        c.otherId ??
        c.otherUser?.idUser ??
        (Array.isArray(c.participants) && meId != null
          ? c.participants.find((u) => Number(u) !== Number(meId))
          : undefined);

      const prof = otherId != null ? profileById[Number(otherId)] : undefined;

      const title =
        prof?.displayName ??
        c.otherUser?.displayName ??
        c.title ??
        (c.type === "dm" && otherId != null ? `DM con #${otherId}` : `Conv #${idConversation}`);

      const avatarUrl =
        prof?.avatarUrl ??
        c.otherUser?.avatarUrl ??
        null;

      const lastMessagePreview = (c as any).lastMessage?.body ?? c.lastMessagePreview ?? "";

      return {
        ...c,
        idConversation,
        otherUserId: otherId,
        title,
        avatarUrl,
        lastMessagePreview,
        unreadCount: c.unreadCount ?? 0,
      } as Conversation & { avatarUrl?: string | null };
    });
  }, [convsRaw, profileById, meId]);

  const openDMWithUser = useCallback(async (targetUserId: number) => {
    try {
      const r = await fetch(`${API}/chat/dm`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const j = await r.json();
      const id = j?.data?.idConversation ?? j?.idConversation ?? j?.data ?? j?.id;
      if (id) {
        setSelected(id);
        setTerm("");
        await loadConversations();
      } else {
        alert("No se pudo abrir el DM");
      }
    } catch (e) {
      console.error(e);
      alert("Error creando el DM");
    }
  }, [loadConversations, setTerm]);

  const selectedConv = useMemo(
    () => convs.find(c => c.idConversation === selected) || null,
    [convs, selected]
  );


  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ ["--band-text" as any]: BRAND.text }}
    >
      <div className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <Navbar />
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5 h-full text-[color:var(--band-text)] px-4 py-4"
        >

          {/* Sidebar */}
          <div
            className="rounded-2xl border shadow-sm flex flex-col"
            style={{ borderColor: BRAND.border, background: "#fff" }}
          >
            {/* Header de la lista */}
            <div
              className="px-4 py-3 rounded-t-2xl border-b"
              style={{ background: BRAND.bgLavender, borderColor: BRAND.border }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold" style={{ color: BRAND.primary }}>Conversaciones</h2>
                <button
                  onClick={loadConversations}
                  disabled={loading}
                  className="text-xs md:text-sm rounded-full px-3 py-1 border transition-colors cursor-pointer"
                  style={{
                    borderColor: BRAND.primary,
                    color: BRAND.primary,
                    background: "transparent",
                  }}
                >
                  {loading ? "Cargando..." : "Refrescar"}
                </button>
              </div>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b" style={{ borderColor: BRAND.border }}>
              <label className="text-xs mb-1 block opacity-80">Buscar conexiones</label>
              <input
                value={term}
                onFocus={() => !active && activate()}
                onChange={(e) => { if (!active) activate(); setTerm(e.target.value); }}
                placeholder="Nombre…"
                className="w-full rounded-xl border px-3 py-2 bg-transparent outline-none transition-shadow"
                style={{ borderColor: BRAND.border }}
                onFocusCapture={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND.primary}22`)}
                onBlurCapture={(e) => (e.currentTarget.style.boxShadow = "none")}
              />
              {active && (
                <div
                  className="mt-2 rounded-xl border max-h-64 overflow-auto"
                  style={{ borderColor: BRAND.border, background: "#fff" }}
                >
                  {searching && <div className="p-2 text-xs">Cargando…</div>}
                  {!searching && results.length === 0 && (
                    <div className="p-2 text-xs opacity-70">Sin resultados</div>
                  )}
                  {!searching && results.map((m) => (
                    <button
                      key={m.idUser}
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDMWithUser(m.idUser); }}
                      className="w-full p-2 flex items-center gap-3 text-left transition-colors cursor-pointer"
                      style={{ borderBottom: `1px solid ${BRAND.border}` }}
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full grid place-items-center text-[10px]"
                          style={{ background: BRAND.bgLavender, color: BRAND.primary }}
                        >
                          DM
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.displayName ?? `#${m.idUser}`}</div>
                      </div>
                      <span
                        className="text-[11px] rounded-full px-2 py-0.5"
                        style={{ background: `${BRAND.primary}12`, color: BRAND.primary, border: `1px solid ${BRAND.primary}40` }}
                      >
                        Abrir DM
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lista de conversaciones */}
            <div className="overflow-auto min-h-0 flex-1 divide-y" style={{ ["--tw-divide-opacity" as any]: 1, ["--tw-divide-color" as any]: BRAND.border }}>
              {convs.length === 0 && (
                <div className="text-sm opacity-70 p-4">
                  {loading ? "Cargando…" : "No hay conversaciones."}
                </div>
              )}

              {convs.map((c) => {
                const selectedRow = selected === c.idConversation;
                const isDeleting = deletingId === c.idConversation;

                return (
                  <div
                    key={c.idConversation}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(c.idConversation); }}
                    className="w-full text-left p-3 transition-colors cursor-pointer"
                    style={{ background: selectedRow ? `${BRAND.bgLavender}66` : "#fff" }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected(c.idConversation); }}
                  >
                    <div className="flex items-center gap-3">
                      {"avatarUrl" in c && (c as any).avatarUrl ? (
                        <img
                          src={(c as any).avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover ring-2"
                          style={{ ["--tw-ring-color" as any]: `${BRAND.primary}22` }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full grid place-items-center text-[10px]"
                          style={{ background: BRAND.bgLavender, color: BRAND.primary }}
                        >
                          DM
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium" style={{ color: BRAND.primary }}>{c.title}</div>

                          {/* Acciones derechas: contador + eliminar */}
                          <div className="flex items-center gap-2">
                            {!!c.unreadCount && (
                              <span
                                className="text-[11px] rounded-full px-2 py-0.5"
                                style={{ background: BRAND.primary, color: "#fff" }}
                              >
                                {c.unreadCount}
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label="Eliminar conversación"
                              title="Eliminar conversación"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteConversation(c.idConversation); }}
                              disabled={isDeleting}
                              className="rounded-full p-1.5 border hover:opacity-80 disabled:opacity-50"
                              style={{ borderColor: BRAND.border, color: BRAND.primary, background: "#fff" }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {c.lastMessagePreview && (
                          <div className="text-xs opacity-70 line-clamp-1 mt-1">{c.lastMessagePreview}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel de conversación */}
          <div
            className="rounded-2xl border shadow-sm flex flex-col"
            style={{ borderColor: BRAND.border, background: "#fff" }}
          >
            {selected ? (
              <ConversationPanel idConversation={selected}
                headerTitle={(selectedConv as any)?.otherUser?.displayName || selectedConv?.title || `Conv #${selected}`}
                headerAvatar={(selectedConv as any)?.avatarUrl || (selectedConv as any)?.otherUser?.avatarUrl || null}
              />
            ) : (
              <div className="flex-1 grid place-items-center text-sm opacity-70 p-6">
                Elegí una conversación o abrí un DM desde tus conexiones.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationPanel({ idConversation, headerTitle, headerAvatar }: { idConversation: number, headerTitle?: string; headerAvatar?: string | null }) {
  const { user } = useUser();
  const meId = user?.idUser ?? null;
  const { messages, typingFrom, joined, send, setIsTyping } = useChat(idConversation);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<any>(null);
  const senderIdOf = (m: any) =>
    m.idUserSender ?? m.senderId ?? m.fromUserId ?? m.idUser ?? m.userId ?? null;

  const senderNameOf = (m: any) =>
    m.senderName ?? m.fromName ?? m.userName ?? m.authorName ?? null;

  const fmtTimeHM = (iso: string | number | Date) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const BRAND = {
    bgLavender: "#EADDFF",
    primary: "#65558F",
    border: "#E3D7FF",
    text: "#49454F",
  };

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const onChange = (v: string) => {
    setText(v);
    setIsTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setIsTyping(false), 1200);
  };

  const onSend = () => {
    const body = text.trim();
    if (!body) return;
    send(body);
    setText("");
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 rounded-t-2xl border-b flex items-center justify-between"
        style={{ background: BRAND.bgLavender, borderColor: BRAND.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {headerAvatar ? (
            <img
              src={headerAvatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover ring-2"
              style={{ ["--tw-ring-color" as any]: `${BRAND.primary}22` }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full grid place-items-center text-[10px]"
              style={{ background: BRAND.bgLavender, color: BRAND.primary }}
            >
              DM
            </div>
          )}
          <div className="truncate">
            <div className="font-semibold truncate" style={{ color: BRAND.primary }}>
              {headerTitle ?? `Chat #${idConversation}`}
            </div>
            <div className="text-[11px]" style={{ color: BRAND.text }}>
              {joined ? (typingFrom != null ? "Escribiendo…" : "Conectado") : "Uniéndose…"}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-2">
        {messages.map((m: any) => {
          const mine = meId != null && Number(senderIdOf(m)) === Number(meId);
          const nameLabel = mine ? "Vos" : (senderNameOf(m) || headerTitle || "Usuario");
          const timeLabel = fmtTimeHM(m.createdAt);

          return (
            <div
              key={m.idMessage ?? m.localId ?? `${m.createdAt}-${Math.random()}`}
              className={`w-full flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] ${mine ? "ml-auto" : ""}`}>
                {/* Etiqueta superior */}
                <div className={`text-[11px] mb-1 ${mine ? "text-right" : "text-left"} opacity-60`}>
                  {nameLabel} · {timeLabel}
                </div>

                {/* Burbuja */}
                <div
                  className={[
                    "rounded-2xl px-3 py-2 border break-words",
                    mine
                      ? "bg-[#65558F] text-white border-[#65558F] rounded-br-sm"
                      : "bg-white text-[color:var(--band-text)] border-[#65558F33] rounded-bl-sm",
                  ].join(" ")}
                >
                  <div dir="auto">{m.body}</div>
                </div>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="text-sm opacity-70">Aún no hay mensajes.</div>
        )}
      </div>

      {/* Composer */}
      <div className="p-3 border-t flex gap-2" style={{ borderColor: BRAND.border }}>
        <input
          className="flex-1 rounded-xl border px-3 py-2 bg-transparent outline-none disabled:opacity-50 transition-shadow"
          style={{ borderColor: BRAND.border }}
          placeholder={joined ? "Escribe un mensaje…" : "Uniéndose al chat…"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={!joined}
          onFocusCapture={(e) => (e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND.primary}22`)}
          onBlurCapture={(e) => (e.currentTarget.style.boxShadow = "none")}
        />
        <button
          onClick={onSend}
          disabled={!joined || !text.trim()}
          className="rounded-full px-4 py-2 font-medium transition-colors disabled:opacity-50"
          style={{
            background: BRAND.primary,
            color: "#fff",
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
