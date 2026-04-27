import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../rooms/rooms.service';
import { GameType, RoomStatus } from '../rooms/room.entity';
import { MonopolyService } from '../games/monopoly/monopoly.service';
import { QuizService } from '../games/monopoly/quiz.service';
import { BOARD } from '../games/monopoly/board.data';
import { CHANCE_CARDS } from '../games/monopoly/chance.data';
import { COMMUNITY_CHEST_CARDS } from '../games/monopoly/community_chest.data';
import { GameSettings } from '../games/monopoly/monopoly.types';
import { WerewolfService } from '../games/werewolf/werewolf.service';
import type { WerewolfState } from '../games/werewolf/werewolf.types';

interface AuthSocket extends Socket {
  userId: string;
  username: string;
}

function defaultSettings(): GameSettings {
  return {
    startingMoney: 15000,
    goBonus: 2000,
    customBoard: BOARD.map(s => ({ originalId: s.id, name: s.name, price: s.price })),
    enabledChanceCards: CHANCE_CARDS.map(c => c.id),
    enabledCommunityChestCards: COMMUNITY_CHEST_CARDS.map(c => c.id),
    quizEnabled: true,
    quizDiscountPct: 20,
    quizTimeoutSec: 10,
  };
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      const raw = process.env.FRONTEND_URL ?? '*';
      if (raw.trim() === '*') return cb(null, true);
      const allowed = raw.split(',').map(s => s.trim());
      if (allowed.includes(origin)) return cb(null, true);
      if (/^https:\/\/my-board-game(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
        return cb(null, true);
      }
      cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private roomPlayers  = new Map<string, Map<string, string>>();  // roomId → {userId → username}
  private roomSettings = new Map<string, GameSettings>();          // roomId → settings
  private socketByUser = new Map<string, string>();                // userId → socketId
  private quizTimers   = new Map<string, NodeJS.Timeout>();        // roomId → timer

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomsService: RoomsService,
    private readonly monopolyService: MonopolyService,
    private readonly quizService: QuizService,
    private readonly werewolfService: WerewolfService,
  ) {}

  // ─── connection ──────────────────────────────────────────────────────────────

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.userId = payload.sub;
      client.username = payload.username ?? payload.email;
      this.socketByUser.set(client.userId, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.socketByUser.delete(client.userId);
    for (const [roomId, players] of this.roomPlayers) {
      if (players.has(client.userId)) {
        players.delete(client.userId);
        this.server.to(`room:${roomId}`).emit('room:user_left', {
          userId: client.userId, username: client.username,
        });
      }
    }
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────

  private emitWerewolfState(roomId: string, state: WerewolfState): void {
    const players = this.roomPlayers.get(roomId);
    if (!players) return;
    for (const [userId] of players) {
      const socketId = this.socketByUser.get(userId);
      if (socketId) {
        const clientState = this.werewolfService.getClientState(state, userId);
        this.server.to(socketId).emit('werewolf:state_sync', clientState);
      }
    }
  }

  // ─── room ─────────────────────────────────────────────────────────────────────

  @SubscribeMessage('room:join')
  handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    client.join(`room:${roomId}`);

    if (!this.roomPlayers.has(roomId)) this.roomPlayers.set(roomId, new Map());
    this.roomPlayers.get(roomId)!.set(client.userId, client.username);

    this.server.to(`room:${roomId}`).emit('room:user_joined', {
      userId: client.userId, username: client.username,
    });

    const playerList = Array.from(this.roomPlayers.get(roomId)!.entries()).map(
      ([userId, username]) => ({ userId, username }),
    );
    client.emit('room:player_list', playerList);

    const settings = this.roomSettings.get(roomId) ?? defaultSettings();
    client.emit('game:settings_updated', settings);

    // Sync active game state
    const monopolyState = this.monopolyService.getState(roomId);
    if (monopolyState) client.emit('game:state_sync', monopolyState);

    const werewolfState = this.werewolfService.getState(roomId);
    if (werewolfState) {
      const clientState = this.werewolfService.getClientState(werewolfState, client.userId);
      client.emit('werewolf:state_sync', clientState);
    }
  }

  @SubscribeMessage('room:leave')
  handleLeaveRoom(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    client.leave(`room:${roomId}`);
    this.roomPlayers.get(roomId)?.delete(client.userId);
    this.server.to(`room:${roomId}`).emit('room:user_left', {
      userId: client.userId, username: client.username,
    });
  }

  // ─── chat ─────────────────────────────────────────────────────────────────────

  @SubscribeMessage('chat:send')
  handleChat(@MessageBody() data: { roomId: string; message: string }, @ConnectedSocket() client: AuthSocket) {
    this.server.to(`room:${data.roomId}`).emit('chat:message', {
      userId: client.userId, username: client.username,
      message: data.message, timestamp: new Date().toISOString(),
    });
  }

  // ─── settings ─────────────────────────────────────────────────────────────────

  @SubscribeMessage('game:update_settings')
  async handleUpdateSettings(
    @MessageBody() payload: { roomId: string; settings: GameSettings },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const room = await this.roomsService.findOne(payload.roomId);
    if (room.host.id !== client.userId) {
      client.emit('game:error', { message: 'เฉพาะโฮสต์เท่านั้นที่เปลี่ยนตั้งค่าได้' });
      return;
    }
    this.roomSettings.set(payload.roomId, payload.settings);
    this.server.to(`room:${payload.roomId}`).emit('game:settings_updated', payload.settings);
  }

  // ─── game lifecycle ───────────────────────────────────────────────────────────

  @SubscribeMessage('game:start')
  async handleGameStart(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    const room = await this.roomsService.findOne(roomId);
    if (room.host.id !== client.userId) {
      client.emit('game:error', { message: 'เฉพาะโฮสต์เท่านั้นที่เริ่มเกมได้' });
      return;
    }
    if (room.status !== RoomStatus.WAITING) {
      client.emit('game:error', { message: 'ห้องนี้เริ่มเกมไปแล้ว' });
      return;
    }

    const playerMap = this.roomPlayers.get(roomId) ?? new Map<string, string>();
    const players = Array.from(playerMap.entries()).map(([id, username]) => ({ id, username }));

    if (room.gameType === GameType.WEREWOLF) {
      if (players.length < 4) {
        client.emit('game:error', { message: 'หมาป่าต้องมีผู้เล่นอย่างน้อย 4 คน' });
        return;
      }
      const state = this.werewolfService.initGame(roomId, players);
      await this.roomsService.updateStatus(roomId, RoomStatus.PLAYING);
      this.server.to(`room:${roomId}`).emit('game:started', { roomId });
      this.emitWerewolfState(roomId, state);
    } else {
      if (players.length < 2) {
        client.emit('game:error', { message: 'ต้องมีผู้เล่นอย่างน้อย 2 คน' });
        return;
      }
      const settings = this.roomSettings.get(roomId) ?? defaultSettings();
      const gameState = this.monopolyService.initGame(roomId, players, settings);
      await this.roomsService.updateStatus(roomId, RoomStatus.PLAYING);
      this.server.to(`room:${roomId}`).emit('game:started', { roomId });
      this.server.to(`room:${roomId}`).emit('game:state_sync', gameState);
    }
  }

  // ─── monopoly actions ─────────────────────────────────────────────────────────

  @SubscribeMessage('game:roll')
  async handleRoll(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    const settings = this.roomSettings.get(roomId) ?? defaultSettings();
    const state = this.monopolyService.rollDice(roomId, client.userId, settings);
    if (!state) {
      client.emit('game:error', { message: 'ไม่ใช่เทิร์นของคุณหรือยังทอยไม่ได้' });
      return;
    }
    this.server.to(`room:${roomId}`).emit('game:state_sync', state);

    // If rolled into quizzing phase, generate question async then attach + start timer
    if (state.phase === 'quizzing' && state.pendingQuiz && state.pendingQuiz.question === null) {
      this.kickoffQuiz(roomId, settings);
    }

    if (state.phase === 'ended') {
      const winner = state.players.find(p => p.id === state.winner);
      this.server.to(`room:${roomId}`).emit('game:ended', {
        winnerId: state.winner, winnerName: winner?.username ?? '?',
      });
    }
  }

  @SubscribeMessage('game:buy')
  handleBuy(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    const state = this.monopolyService.buyProperty(roomId, client.userId);
    if (!state) { client.emit('game:error', { message: 'ไม่สามารถซื้อที่ดินได้ตอนนี้' }); return; }
    this.server.to(`room:${roomId}`).emit('game:state_sync', state);
  }

  @SubscribeMessage('game:decline')
  handleDecline(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    const state = this.monopolyService.declineProperty(roomId, client.userId);
    if (!state) { client.emit('game:error', { message: 'ไม่สามารถดำเนินการได้ตอนนี้' }); return; }
    this.server.to(`room:${roomId}`).emit('game:state_sync', state);
  }

  @SubscribeMessage('game:sell')
  handleSell(
    @MessageBody() payload: { roomId: string; position: number },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const state = this.monopolyService.sellProperty(payload.roomId, client.userId, payload.position);
    if (!state) { client.emit('game:error', { message: 'ขายไม่ได้ตอนนี้' }); return; }
    this.server.to(`room:${payload.roomId}`).emit('game:state_sync', state);
    if (state.phase === 'ended') {
      const winner = state.players.find(p => p.id === state.winner);
      this.server.to(`room:${payload.roomId}`).emit('game:ended', {
        winnerId: state.winner, winnerName: winner?.username ?? '?',
      });
    }
  }

  @SubscribeMessage('game:build_house')
  handleBuildHouse(
    @MessageBody() payload: { roomId: string; position: number },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const state = this.monopolyService.buildHouse(payload.roomId, client.userId, payload.position);
    if (!state) { client.emit('game:error', { message: 'สร้างบ้านไม่ได้ตอนนี้' }); return; }
    this.server.to(`room:${payload.roomId}`).emit('game:state_sync', state);
  }

  @SubscribeMessage('game:sell_house')
  handleSellHouse(
    @MessageBody() payload: { roomId: string; position: number },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const state = this.monopolyService.sellHouse(payload.roomId, client.userId, payload.position);
    if (!state) { client.emit('game:error', { message: 'ขายบ้านไม่ได้ตอนนี้' }); return; }
    this.server.to(`room:${payload.roomId}`).emit('game:state_sync', state);
  }

  @SubscribeMessage('game:give_up')
  handleGiveUp(@MessageBody() roomId: string, @ConnectedSocket() client: AuthSocket) {
    const state = this.monopolyService.giveUp(roomId, client.userId);
    if (!state) { client.emit('game:error', { message: 'ยอมแพ้ไม่ได้ตอนนี้' }); return; }
    this.server.to(`room:${roomId}`).emit('game:state_sync', state);
    if (state.phase === 'ended') {
      const winner = state.players.find(p => p.id === state.winner);
      this.server.to(`room:${roomId}`).emit('game:ended', {
        winnerId: state.winner, winnerName: winner?.username ?? '?',
      });
    }
  }

  // ─── quiz ─────────────────────────────────────────────────────────────────────

  /** Async: generate question, attach to state, start expiration timer */
  private async kickoffQuiz(roomId: string, settings: GameSettings) {
    const q = await this.quizService.generate();
    const state = this.monopolyService.attachQuiz(roomId, q.question, q.choices, q.correctIndex, settings.quizTimeoutSec);
    if (!state) return; // game state changed before quiz arrived (e.g. disconnect)
    this.server.to(`room:${roomId}`).emit('game:state_sync', state);

    // Set timeout to auto-expire
    const existing = this.quizTimers.get(roomId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.quizTimers.delete(roomId);
      const expired = this.monopolyService.expireQuiz(roomId, settings.quizDiscountPct);
      if (!expired) return;
      this.server.to(`room:${roomId}`).emit('game:state_sync', expired);
      this.scheduleFinalize(roomId);
    }, settings.quizTimeoutSec * 1000);
    this.quizTimers.set(roomId, timer);
  }

  /** Show result for ~2s, then advance turn */
  private scheduleFinalize(roomId: string) {
    setTimeout(() => {
      const finalState = this.monopolyService.finalizeQuiz(roomId);
      if (!finalState) return;
      this.server.to(`room:${roomId}`).emit('game:state_sync', finalState);
      if (finalState.phase === 'ended') {
        const winner = finalState.players.find(p => p.id === finalState.winner);
        this.server.to(`room:${roomId}`).emit('game:ended', {
          winnerId: finalState.winner, winnerName: winner?.username ?? '?',
        });
      }
    }, 2000);
  }

  @SubscribeMessage('game:answer_quiz')
  handleAnswerQuiz(
    @MessageBody() payload: { roomId: string; answer: number },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const settings = this.roomSettings.get(payload.roomId) ?? defaultSettings();
    const state = this.monopolyService.answerQuiz(payload.roomId, client.userId, payload.answer, settings.quizDiscountPct);
    if (!state) { client.emit('game:error', { message: 'ตอบคำถามไม่ได้ตอนนี้' }); return; }

    // Cancel pending expire timer
    const timer = this.quizTimers.get(payload.roomId);
    if (timer) { clearTimeout(timer); this.quizTimers.delete(payload.roomId); }

    this.server.to(`room:${payload.roomId}`).emit('game:state_sync', state);
    this.scheduleFinalize(payload.roomId);
  }

  // ─── werewolf actions ─────────────────────────────────────────────────────────

  @SubscribeMessage('werewolf:night_action')
  handleWerewolfNightAction(
    @MessageBody() data: { roomId: string; targetId: string | null },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const state = this.werewolfService.submitNightAction(data.roomId, client.userId, data.targetId);
    if (!state) {
      client.emit('game:error', { message: 'ไม่สามารถส่งคำสั่งกลางคืนได้' });
      return;
    }
    this.emitWerewolfState(data.roomId, state);
    if (state.phase === 'ended') {
      const teamName = state.winner === 'werewolf' ? 'ฝ่ายหมาป่า' : 'ฝ่ายชาวบ้าน';
      this.server.to(`room:${data.roomId}`).emit('game:ended', { winnerId: null, winnerName: teamName });
    }
  }

  @SubscribeMessage('werewolf:day_vote')
  handleWerewolfDayVote(
    @MessageBody() data: { roomId: string; targetId: string | null },
    @ConnectedSocket() client: AuthSocket,
  ) {
    const state = this.werewolfService.submitDayVote(data.roomId, client.userId, data.targetId);
    if (!state) {
      client.emit('game:error', { message: 'ไม่สามารถโหวตได้ตอนนี้' });
      return;
    }
    this.emitWerewolfState(data.roomId, state);
    if (state.phase === 'ended') {
      const teamName = state.winner === 'werewolf' ? 'ฝ่ายหมาป่า' : 'ฝ่ายชาวบ้าน';
      this.server.to(`room:${data.roomId}`).emit('game:ended', { winnerId: null, winnerName: teamName });
    }
  }
}
