export interface QuestionPack {
  id: string;
  name: string;
  description?: string;
  authorName: string;
  isPublic: boolean;
  timerDuration: number;
  categories: Category[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  packId: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  answer: string;
  points: number;
  imageUrl?: string;
  order: number;
  categoryId: string;
}

export interface Player {
  id: string;
  displayName: string;
  score: number;
  isHost: boolean;
  hasAnsweredCurrentQuestion: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'question-selection'
  | 'question-active'
  | 'buzzer-open'
  | 'awaiting-verification'
  | 'game-over';

export interface QuestionCell {
  question: Question;
  answered: boolean;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  board: QuestionCell[][];
  categories: Category[];
  activePlayerId: string | null;
  currentQuestion: Question | null;
  buzzedPlayerId: string | null;
  buzzedPlayerName: string | null;
  timerDuration: number;
  timerEndsAt: number | null;
  winner: Player | null;
}
