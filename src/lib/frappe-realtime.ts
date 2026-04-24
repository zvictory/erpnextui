"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getRealtimeSocket(siteUrl: string): Socket {
  const site = new URL(siteUrl).hostname;

  if (socket && socket.connected && socket.io.opts.query && (socket.io.opts.query as Record<string, string>).site === site) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(`/${site}`, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
    query: { site },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
