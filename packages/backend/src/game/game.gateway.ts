import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import type {
  ClientToServerEvents, ServerToClientEvents,
} from '@gigaquiz/shared';

type GigaServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GigaSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true },
})
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: GigaServer;

  constructor(private readonly gameService: GameService) {}

  @SubscribeMessage('host:create-room')
  async handleCreateRoom(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() data: { packId: string; hostName: string },
  ) {
    try {
      const { roomCode, playerId } = await this.gameService.createRoom(data.packId, client.id, data.hostName);
      await client.join(roomCode);
      return { roomCode, playerId };
    } catch {
      return { error: 'Failed to create room' };
    }
  }

  @SubscribeMessage('player:join')
  handleJoin(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() data: { roomCode: string; displayName: string },
  ) {
    const result = this.gameService.joinRoom(data.roomCode, client.id, data.displayName);
    if (result.error) return { error: result.error };

    client.join(data.roomCode);
    this.server.to(data.roomCode).emit('game:state', this.gameService.buildGameState(result.room!));
    return { success: true, playerId: result.playerId };
  }

  @SubscribeMessage('player:reconnect')
  handleReconnect(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ) {
    const result = this.gameService.reconnect(data.roomCode, data.playerId, client.id);
    if (result.error) return { error: result.error };

    client.join(data.roomCode);
    this.server.to(data.roomCode).emit('game:state', this.gameService.buildGameState(result.room!));
    return { success: true };
  }

  @SubscribeMessage('host:start-game')
  handleStartGame(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() _data: Record<string, never>,
  ) {
    const room = this.gameService.getRoomBySocket(client.id);
    if (!room) return { error: 'Not in a room' };

    const result = this.gameService.startGame(room.code, client.id);
    if (result.error) return { error: result.error };

    this.server.to(room.code).emit('game:state', this.gameService.buildGameState(result.room!));
    return { success: true };
  }

  @SubscribeMessage('player:select-question')
  handleSelectQuestion(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() data: { categoryId: string; questionId: string },
  ) {
    const room = this.gameService.getRoomBySocket(client.id);
    if (!room) return;

    const result = this.gameService.selectQuestion(room.code, client.id, data.categoryId, data.questionId);
    if (result.error) return;

    this.server.to(room.code).emit('game:state', this.gameService.buildGameState(result.room!));
    this.server.to(room.code).emit('game:timer-start', { duration: result.timerDuration! });

    result.room!.buzzTimer = setTimeout(() => {
      const openResult = this.gameService.openBuzzer(room.code);
      if (openResult.room) {
        this.server.to(room.code).emit('game:state', this.gameService.buildGameState(openResult.room));
      }
    }, result.timerDuration! * 1000);
  }

  @SubscribeMessage('player:buzz')
  handleBuzz(@ConnectedSocket() client: GigaSocket) {
    const room = this.gameService.getRoomBySocket(client.id);
    if (!room) return;

    const result = this.gameService.buzz(room.code, client.id);
    if (result.error) return;

    this.server.to(room.code).emit('game:buzz-accepted', {
      playerId: result.player!.id,
      playerName: result.player!.displayName,
    });
    this.server.to(room.code).emit('game:state', this.gameService.buildGameState(result.room!));
  }

  @SubscribeMessage('host:verify')
  handleVerify(
    @ConnectedSocket() client: GigaSocket,
    @MessageBody() data: { correct: boolean },
  ) {
    const room = this.gameService.getRoomBySocket(client.id);
    if (!room) return;

    const result = this.gameService.verify(room.code, client.id, data.correct);
    if (result.error) return;

    const state = this.gameService.buildGameState(result.room!);
    const scores: Record<string, number> = {};
    for (const p of state.players) scores[p.id] = p.score;

    this.server.to(room.code).emit('game:question-result', {
      correct: data.correct,
      points: result.points ?? 0,
      scores,
    });
    this.server.to(room.code).emit('game:state', state);

    if (result.nextPhase === 'game-over') {
      this.server.to(room.code).emit('game:ended', {
        winner: state.winner!,
        scores,
      });
    }
  }

  handleDisconnect(client: GigaSocket) {
    this.gameService.markDisconnected(client.id, (room) => {
      this.server.to(room.code).emit('game:state', this.gameService.buildGameState(room));
    });
  }
}
