import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@gigaquiz/shared';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: false }) as AppSocket;
  }
  return socket;
}
