"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useChatConnectionsSearch} from "@/hooks/useChatConnectionsSearch"
import { useUser } from "@/app/context/userContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  // Buscador lazy: solo pide conexiones cuando lo activás
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

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/chat/conversations`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = await r.json();
      const rows: Conversation[] = (j?.data ?? j ?? []) as any[];
      setConvsRaw(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready) loadConversations(); }, [ready, loadConversations]);

  // Enriquecer títulos/avatars sin nuevas requests
  const convs = useMemo(() => {
    return convsRaw.map((c) => {
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

      const lastMessagePreview = c.lastMessage?.body ?? c.lastMessagePreview ?? "";

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
        setTerm(""); // limpia el buscador
        await loadConversations(); // refresca inbox
      } else {
        alert("No se pudo abrir el DM");
      }
    } catch (e) {
      console.error(e);
      alert("Error creando el DM");
    }
  }, [loadConversations, setTerm]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-4 h-[80vh]">
      {/* Sidebar */}
      <div className="border rounded-xl p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Conversaciones</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={loadConversations}
              className="text-sm rounded-lg border px-3 py-1 hover:bg-white/5"
              disabled={loading}
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>
        </div>

        {/* Buscador (no hace requests hasta que lo activás) */}
        <div className="mb-4">
          <label className="text-sm block mb-1">Buscar conexiones</label>
          <input
            value={term}
            onFocus={() => !active && activate()}
            onChange={(e) => { if (!active) activate(); setTerm(e.target.value); }}
            placeholder="Nombre…"
            className="w-full rounded-lg border px-3 py-2 bg-transparent focus:outline-none"
          />
          {active && (
            <div className="mt-2 border rounded-lg divide-y max-h-64 overflow-auto">
              {searching && <div className="p-2 text-xs">Cargando…</div>}
              {!searching && results.length === 0 && (
                <div className="p-2 text-xs opacity-70">Sin resultados</div>
              )}
              {!searching && results.map((m) => (
                <button
                  key={m.idUser}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDMWithUser(m.idUser);
                  }}
                  className="w-full p-2 flex items-center gap-3 hover:bg-white/5 text-left"
                >
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border grid place-items-center text-[10px] opacity-60">DM</div>
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.displayName ?? `#${m.idUser}`}</div>
                  </div>
                  <span className="text-xs rounded border px-2 py-0.5">Abrir DM</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista de conversaciones (títulos enriquecidos, sin requests extra) */}
        <div className="overflow-auto min-h-0 flex-1 divide-y">
          {convs.length === 0 && (
            <div className="text-sm opacity-70 p-2">
              {loading ? "Cargando…" : "No hay conversaciones."}
            </div>
          )}

          {convs.map((c) => (
            <button
              key={c.idConversation}
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(c.idConversation); }}
              className={`w-full text-left p-3 hover:bg-white/5 ${selected === c.idConversation ? "bg-white/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                {"avatarUrl" in c && (c as any).avatarUrl ? (
                  <img src={(c as any).avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full border grid place-items-center text-[10px] opacity-60">DM</div>
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{c.title}</div>
                    {!!c.unreadCount && (
                      <span className="text-xs rounded-full bg-blue-600/80 px-2 py-0.5">{c.unreadCount}</span>
                    )}
                  </div>
                  {c.lastMessagePreview && (
                    <div className="text-xs opacity-70 line-clamp-1 mt-1">{c.lastMessagePreview}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel de conversación */}
      <div className="border rounded-xl flex flex-col">
        {selected ? (
          <ConversationPanel idConversation={selected} />
        ) : (
          <div className="flex-1 grid place-items-center text-sm opacity-70">
            Elegí una conversación o abrí un DM desde tus conexiones.
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationPanel({ idConversation }: { idConversation: number }) {
  const { messages, typingFrom, joined, send, setIsTyping } = useChat(idConversation);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<any>(null);

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
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="font-semibold">Conv #{idConversation}</div>
        <div className="text-xs opacity-70">
          {joined ? (typingFrom != null ? "Escribiendo…" : "Conectado") : "Uniéndose…"}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.idMessage} className="flex flex-col">
            <div className="text-xs opacity-60">#{m.idMessage} • {new Date(m.createdAt).toLocaleString()}</div>
            <div className="rounded-xl border px-3 py-2 mt-1 whitespace-pre-wrap">{m.body}</div>
          </div>
        ))}
        {messages.length === 0 && <div className="text-sm opacity-70">Aún no hay mensajes.</div>}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 rounded-lg border px-3 py-2 bg-transparent focus:outline-none disabled:opacity-50"
          placeholder={joined ? "Escribe un mensaje…" : "Uniéndose al chat…"}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={!joined}
        />
        <button onClick={onSend} className="rounded-lg border px-4 py-2 hover:bg-white/5" disabled={!joined || !text.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
