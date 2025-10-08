"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getChatSocket } from "@/lib/chatClient";

type Message = {
    idMessage: number;
    idConversation: number;
    authorIdUser: number; // <-- si tu API manda authorIdUser
    body: string;
    createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useChat(idConversation: number) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingFrom, setTypingFrom] = useState<number | null>(null);
    const [joined, setJoined] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (!idConversation) return;

        const s = getChatSocket();
        console.log("socket", s);

        // garantizar join tras connect y pedir ACK
        const doJoin = () => {
            s.emit("conversation:join", idConversation, (ok: boolean) => {
                setJoined(!!ok);
            });
        };
        if (s.connected) doJoin();
        else s.once("connect", doJoin);

        const onNew = (m: Message) => {
            if (m.idConversation === idConversation) setMessages(prev => [...prev, m]);
        };
        const onTyping = (p: { idConversation: number; isTyping: boolean; idUser: number }) => {
            if (p.idConversation === idConversation) setTypingFrom(p.isTyping ? p.idUser : null);
        };

        s.on("message:new", onNew);
        s.on("typing", onTyping);

        // carga inicial + marcar leído
        if (!loadedRef.current) {
            loadedRef.current = true;
            fetch(`${API}/chat/conversations/${idConversation}/messages`, {
                credentials: "include",
                headers: { Accept: "application/json" },
            })
                .then(r => r.json())
                .then(({ data }) => setMessages(data ?? []))
                .then(() => s.emit("message:read", { idConversation, until: new Date().toISOString() }))
                .catch(() => { });
        }

        return () => {
            s.off("message:new", onNew);
            s.off("typing", onTyping);
            setJoined(false);
            setTypingFrom(null);
            setMessages([]);
            loadedRef.current = false;
        };
    }, [idConversation]);
    type SendAck = { ok: true; msg: Message } | { ok: false; error?: string };
    const send = useCallback((body: string, attachments?: any) => {
        if (!body.trim()) return;
        const s = getChatSocket();

        s.timeout(5000).emit(
            "message:send",
            { idConversation, body, attachments },
            (res: SendAck) => {
                if (res.ok) {
                    setMessages(prev => [...prev, res.msg]);
                } else {
                    console.error("send failed:", res.error);
                }
            }
        );
    }, [idConversation]);

    const setIsTyping = useCallback((isTyping: boolean) => {
        const s = getChatSocket();
        s.emit("typing", { idConversation, isTyping });
    }, [idConversation]);

    return { messages, typingFrom, joined, send, setIsTyping };
}
