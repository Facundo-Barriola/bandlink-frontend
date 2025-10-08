"use client";

import { useParams } from "next/navigation";
import ChatPlayground from "@/components/ChatPlayground";

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const idConversation = Number(params.id);

  // si el id no es válido, no pasamos initialConversationId
  const initialId = Number.isFinite(idConversation) && idConversation > 0 ? idConversation : undefined;

  return (
    <div className="p-4">
      <ChatPlayground initialConversationId={initialId} />
    </div>
  );
}
