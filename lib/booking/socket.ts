"use client";

// Shared Socket.IO client — Super App utils/socket.js parity for the web.
// Namespace /ws, JWT via handshake auth { token } (see WsAuthGuard).
// Singleton per token; polling fallback (chat + track pages) stays as backup.

import { io, type Socket } from "socket.io-client";

import { API_BASE_URL, getAuthToken } from "./api-client";

function socketBase(): string {
  try {
    const u = new URL(API_BASE_URL);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://43.205.190.95:3000";
  }
}

let socket: Socket | null = null;
let socketToken: string | null = null;

export function connectSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = getAuthToken();
  if (!token) return null;
  if (socket && socketToken === token && socket.connected) return socket;
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
  socket = io(`${socketBase()}/ws`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 10,
  });
  socketToken = token;
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    try {
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
    socketToken = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinBookingRoom(bookingId: string): void {
  const s = connectSocket();
  s?.emit("join:booking", { bookingId });
}

export function leaveBookingRoom(bookingId: string): void {
  socket?.emit("leave:booking", { bookingId });
}

export function joinConversationRoom(conversationId: string): void {
  const s = connectSocket();
  s?.emit("chat:join", { conversationId });
}

export function leaveConversationRoom(conversationId: string): void {
  socket?.emit("chat:leave", { conversationId });
}

export function emitTyping(conversationId: string, isTyping: boolean): void {
  const s = connectSocket();
  s?.emit("chat:typing", { conversationId, isTyping });
}
