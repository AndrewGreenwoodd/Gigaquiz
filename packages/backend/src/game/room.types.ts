import type { GamePhase, Question, Category } from '@gigaquiz/shared';

export interface RoomPlayer {
  id: string;
  socketId: string;
  displayName: string;
  score: number;
  isHost: boolean;
  hasAnsweredCurrentQuestion: boolean;
  disconnectTimer?: ReturnType<typeof setTimeout>;
}

export interface QuestionCell {
  question: Question;
  answered: boolean;
}

export interface Room {
  code: string;
  hostSocketId: string;
  packId: string;
  timerDuration: number;
  phase: GamePhase;
  players: Map<string, RoomPlayer>;
  categories: Category[];
  board: QuestionCell[][];
  activePlayerId: string | null;
  currentQuestion: Question | null;
  buzzedPlayerId: string | null;
  timerEndsAt: number | null;
  buzzTimer: ReturnType<typeof setTimeout> | null;
}
