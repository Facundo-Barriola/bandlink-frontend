"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function OpenDmByUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  useEffect(() => {
    const targetUserId = Number(userId);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      router.replace("/chat");
      return;
    }

    (async () => {
      try {
        const r = await fetch(`${API}/chat/dm`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ targetUserId }),
        });

        if (!r.ok) {
          router.replace("/chat"); // 401/403/etc.
          return;
        }

        const j = await r.json();
        const id =
          j?.data?.idConversation ??
          j?.idConversation ??
          j?.data ??
          j?.id;

        router.replace(id ? `/chat/${id}` : "/chat");
      } catch {
        router.replace("/chat");
      }
    })();
  }, [userId, router]);

  return <div className="p-4">Abriendo chat…</div>;
}
