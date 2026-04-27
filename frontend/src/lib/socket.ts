import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function resolveSocketUrl(): string {
  const fromEnv = import.meta.env.VITE_SOCKET_URL;
  if (fromEnv && fromEnv.trim() !== '') return fromEnv;
  // Empty/missing → use the same origin as the page (works for nginx proxy & same-domain deploys)
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(resolveSocketUrl(), {
      auth: { token },
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  getSocket().connect();
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
