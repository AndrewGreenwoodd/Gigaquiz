import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PacksService } from '../packs/packs.service';
import { Room, RoomPlayer, QuestionCell } from './room.types';
import type { GameState, Player, Question, Category } from '@gigaquiz/shared';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

@Injectable()
export class GameService {
  private rooms = new Map<string, Room>();

  constructor(private readonly packsService: PacksService) {}

  private findBySocket(room: Room, socketId: string): RoomPlayer | undefined {
    for (const p of room.players.values()) {
      if (p.socketId === socketId) return p;
    }
    return undefined;
  }

  async createRoom(packId: string, hostSocketId: string, hostName: string): Promise<{ roomCode: string; playerId: string }> {
    const pack = await this.packsService.findOne(packId);
    let code: string;
    do { code = generateCode(); } while (this.rooms.has(code));

    const board: QuestionCell[][] = (pack.categories as unknown as Category[]).map((cat) =>
      cat.questions.map((q) => ({ question: q as Question, answered: false })),
    );

    const playerId = randomUUID();
    const host: RoomPlayer = {
      id: playerId,
      socketId: hostSocketId,
      displayName: hostName,
      score: 0,
      isHost: true,
      hasAnsweredCurrentQuestion: false,
    };

    const room: Room = {
      code,
      hostSocketId,
      packId,
      timerDuration: pack.timerDuration,
      phase: 'lobby',
      players: new Map([[playerId, host]]),
      categories: pack.categories as any,
      board,
      activePlayerId: null,
      currentQuestion: null,
      buzzedPlayerId: null,
      timerEndsAt: null,
      buzzTimer: null,
    };

    this.rooms.set(code, room);
    return { roomCode: code, playerId };
  }

  joinRoom(
    roomCode: string,
    socketId: string,
    displayName: string,
  ): { error?: string; room?: Room; playerId?: string } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.phase === 'game-over') return { error: 'Game has ended' };

    const playerId = randomUUID();
    const player: RoomPlayer = {
      id: playerId,
      socketId,
      displayName,
      score: 0,
      isHost: false,
      hasAnsweredCurrentQuestion: false,
    };
    room.players.set(playerId, player);
    return { room, playerId };
  }

  reconnect(
    roomCode: string,
    playerId: string,
    socketId: string,
  ): { error?: string; room?: Room } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    const player = room.players.get(playerId);
    if (!player) return { error: 'Player not found in room' };
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = undefined;
    }
    player.socketId = socketId;
    if (player.isHost) room.hostSocketId = socketId;
    return { room };
  }

  startGame(roomCode: string, socketId: string): { error?: string; room?: Room } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.hostSocketId !== socketId) return { error: 'Not the host' };
    if (room.phase !== 'lobby') return { error: 'Game already started' };
    if (room.players.size < 2) return { error: 'Need at least one player' };

    const playerIds = [...room.players.keys()].filter((id) => !room.players.get(id)!.isHost);
    room.activePlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    room.phase = 'question-selection';
    return { room };
  }

  selectQuestion(
    roomCode: string,
    socketId: string,
    categoryId: string,
    questionId: string,
  ): { error?: string; room?: Room; timerDuration?: number } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.phase !== 'question-selection') return { error: 'Not in selection phase' };

    const player = this.findBySocket(room, socketId);
    if (!player || room.activePlayerId !== player.id) return { error: 'Not your turn to select' };

    let found: Question | null = null;
    for (const col of room.board) {
      for (const cell of col) {
        if (cell.question.id === questionId && !cell.answered) {
          found = cell.question;
        }
      }
    }
    if (!found) return { error: 'Question not found or already answered' };

    room.currentQuestion = found;
    room.phase = 'question-active';
    room.timerEndsAt = Date.now() + room.timerDuration * 1000;
    for (const p of room.players.values()) p.hasAnsweredCurrentQuestion = false;

    return { room, timerDuration: room.timerDuration };
  }

  openBuzzer(roomCode: string): { error?: string; room?: Room } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    room.phase = 'buzzer-open';
    room.timerEndsAt = null;
    return { room };
  }

  buzz(roomCode: string, socketId: string): { error?: string; player?: RoomPlayer; room?: Room } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.phase !== 'buzzer-open') return { error: 'Buzzer not open' };

    const player = this.findBySocket(room, socketId);
    if (!player || player.hasAnsweredCurrentQuestion) return { error: 'Cannot buzz' };

    room.buzzedPlayerId = player.id;
    room.phase = 'awaiting-verification';
    if (room.buzzTimer) { clearTimeout(room.buzzTimer); room.buzzTimer = null; }

    return { player, room };
  }

  verify(
    roomCode: string,
    socketId: string,
    correct: boolean,
  ): { error?: string; room?: Room; points?: number; nextPhase?: 'question-selection' | 'game-over' } {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };
    if (room.hostSocketId !== socketId) return { error: 'Not the host' };
    if (room.phase !== 'awaiting-verification') return { error: 'Not in verification phase' };

    const buzzedPlayer = room.players.get(room.buzzedPlayerId!);
    const question = room.currentQuestion!;

    if (correct) {
      buzzedPlayer!.score += question.points;
      this.markAnswered(room, question.id);
      room.activePlayerId = room.buzzedPlayerId;
      room.buzzedPlayerId = null;
      room.currentQuestion = null;

      const allAnswered = room.board.every((col) => col.every((c) => c.answered));
      const nextPhase = allAnswered ? 'game-over' : 'question-selection';
      room.phase = nextPhase;
      return { room, points: question.points, nextPhase };
    } else {
      buzzedPlayer!.score -= question.points;
      buzzedPlayer!.hasAnsweredCurrentQuestion = true;
      const canBuzz = [...room.players.values()].filter(
        (p) => !p.isHost && !p.hasAnsweredCurrentQuestion,
      );
      if (canBuzz.length === 0) {
        this.markAnswered(room, question.id);
        room.buzzedPlayerId = null;
        room.currentQuestion = null;
        const allAnswered = room.board.every((col) => col.every((c) => c.answered));
        const nextPhase = allAnswered ? 'game-over' : 'question-selection';
        room.phase = nextPhase;
        return { room, points: 0, nextPhase };
      }
      room.buzzedPlayerId = null;
      room.phase = 'buzzer-open';
      return { room, points: 0, nextPhase: 'question-selection' };
    }
  }

  markDisconnected(socketId: string, onExpired: (room: Room) => void): void {
    for (const room of this.rooms.values()) {
      const player = this.findBySocket(room, socketId);
      if (!player) continue;

      // 15-second grace period before actually removing the player
      player.disconnectTimer = setTimeout(() => {
        player.disconnectTimer = undefined;
        room.players.delete(player.id);

        if (room.players.size === 0) {
          if (room.buzzTimer) clearTimeout(room.buzzTimer);
          this.rooms.delete(room.code);
          return;
        }

        // If the disconnected player had the active turn, assign to someone else
        if (room.activePlayerId === player.id) {
          const eligible = [...room.players.values()].filter((p) => !p.isHost);
          room.activePlayerId = eligible.length > 0 ? eligible[0].id : null;
        }

        onExpired(room);
      }, 15_000);

      return;
    }
  }

  getRoomBySocket(socketId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (this.findBySocket(room, socketId)) return room;
    }
    return null;
  }

  buildGameState(room: Room): GameState {
    const players: Player[] = [...room.players.values()].map((p) => ({
      id: p.id,
      displayName: p.displayName,
      score: p.score,
      isHost: p.isHost,
      hasAnsweredCurrentQuestion: p.hasAnsweredCurrentQuestion,
    }));

    const winner = room.phase === 'game-over'
      ? players.filter((p) => !p.isHost).sort((a, b) => b.score - a.score)[0] ?? null
      : null;

    return {
      roomCode: room.code,
      phase: room.phase,
      players,
      board: room.board,
      categories: room.categories,
      activePlayerId: room.activePlayerId,
      currentQuestion: room.currentQuestion,
      buzzedPlayerId: room.buzzedPlayerId,
      buzzedPlayerName: room.buzzedPlayerId
        ? (room.players.get(room.buzzedPlayerId)?.displayName ?? null)
        : null,
      timerDuration: room.timerDuration,
      timerEndsAt: room.timerEndsAt,
      winner,
    };
  }

  private markAnswered(room: Room, questionId: string) {
    for (const col of room.board) {
      for (const cell of col) {
        if (cell.question.id === questionId) cell.answered = true;
      }
    }
  }
}
