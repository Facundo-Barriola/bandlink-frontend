import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getChatSocket(token?: string) {
  if (socket) return socket;
  socket = io(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
    path: process.env.NEXT_PUBLIC_SOCKETIO_PATH ?? "/socket.io",
    transports: ["websocket", "polling"],
    transportOptions: { polling: { withCredentials: true } },
    auth: token ? { token } : undefined,  // fallback
  });

  // debug útil
  socket.on("connect", () => console.log("[ws] connected", socket?.id));
  socket.on("connect_error", (e) => console.error("[ws] connect_error", e?.message));
  socket.on("disconnect", (r) => console.warn("[ws] disconnect", r));

  return socket;
}