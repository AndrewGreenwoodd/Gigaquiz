import type { GameState, Player } from './models';

// Client → Server
export interface ClientToServerEvents {
  'host:create-room': (data: { packId: string; hostName: string }, callback: (res: { roomCode: string; playerId: string } | { error: string }) => void) => void;
  'player:join': (data: { roomCode: string; displayName: string }, callback: (res: { success: boolean; playerId: string } | { error: string }) => void) => void;
  'player:reconnect': (data: { roomCode: string; playerId: string }, callback: (res: { success: boolean } | { error: string }) => void) => void;
  'host:start-game': (data: Record<string, never>, callback: (res: { success: boolean } | { error: string }) => void) => void;
  'player:select-question': (data: { categoryId: string; questionId: string }) => void;
  'player:buzz': (data: Record<string, never>) => void;
  'host:verify': (data: { correct: boolean }) => void;
}

// Server → Client
export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:timer-start': (data: { duration: number }) => void;
  'game:buzz-accepted': (data: { playerId: string; playerName: string }) => void;
  'game:question-result': (data: { correct: boolean; points: number; scores: Record<string, number> }) => void;
  'game:ended': (data: { winner: Player; scores: Record<string, number> }) => void;
  'game:error': (data: { message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomCode: string;
  displayName: string;
  isHost: boolean;
}
