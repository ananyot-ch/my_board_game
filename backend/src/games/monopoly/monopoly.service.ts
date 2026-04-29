import { Injectable } from '@nestjs/common';
import { BOARD, PLAYER_COLORS } from './board.data';
import { CHANCE_CARDS } from './chance.data';
import { COMMUNITY_CHEST_CARDS } from './community_chest.data';
import { LANDMARKS } from './landmark.data';
import {
  BoardSpace, ChanceCard, GameSettings, GameState,
  OwnedProperty, PlayerState, SerializableGameState,
} from './monopoly.types';

@Injectable()
export class MonopolyService {
  private games = new Map<string, GameState>();

  // ─── public API ──────────────────────────────────────────────────────────────

  initGame(
    roomId: string,
    players: { id: string; username: string }[],
    settings: GameSettings,
  ): SerializableGameState {
    const board: BoardSpace[] = settings.customBoard.map((custom, position) => ({
      ...BOARD[custom.originalId],
      id: position,
      name: custom.name,
      ...(custom.price !== undefined && { price: custom.price }),
      ...(custom.group !== undefined && {
        group: custom.group === null ? undefined : custom.group,
      }),
    }));

    const state: GameState = {
      roomId,
      board,
      players: players.map((p, i) => ({
        id: p.id,
        username: p.username,
        money: settings.startingMoney,
        position: 0,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        bankrupt: false,
        inJail: false,
      })),
      currentPlayerIndex: 0,
      phase: 'rolling',
      lastDice: null,
      ownedProperties: new Map(),
      winner: null,
      pendingSpace: null,
      pendingDebt: null,
      pendingQuiz: null,
      lastEvent: `เกมเริ่มต้น! ${players[0]?.username} เริ่มก่อน`,
    };

    this.games.set(roomId, state);
    return this.serialize(state);
  }

  getState(roomId: string): SerializableGameState | null {
    const s = this.games.get(roomId);
    return s ? this.serialize(s) : null;
  }

  rollDice(roomId: string, playerId: string, settings: GameSettings): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'rolling') return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const d3 = Math.ceil(Math.random() * 6);
    state.lastDice = [d1, d2, d3];
    const roll = d1 + d2 + d3;

    const oldPos = current.position;
    const newPos = (oldPos + roll) % state.board.length;
    current.position = newPos;

    let event = `${current.username} ทอยได้ ${d1}+${d2}+${d3}=${roll}`;

    if (newPos < oldPos && !current.inJail) {
      current.money += settings.goBonus;
      event += ` ผ่าน GO รับ ฿${settings.goBonus.toLocaleString()}`;
    }
    current.inJail = false;

    const space = state.board[newPos];
    event += ` → ${space.name}`;

    if (space.type === 'go_to_jail') {
      const jailPos = state.board.findIndex(s => s.type === 'jail');
      current.position = jailPos >= 0 ? jailPos : 0;
      current.inJail = true;
      event += ' (ไปคุก!)';
      state.lastEvent = event;
      this.nextPlayer(state);
    } else if (space.type === 'tax') {
      const owed = space.amount ?? 0;
      const r = this.chargePlayer(state, current, owed, null, true);
      if (r.pending) {
        event += ` ค้างภาษี ฿${owed.toLocaleString()} — ต้องขายทรัพย์สิน`;
        state.lastEvent = event;
      } else {
        event += ` จ่ายภาษี ฿${r.paid.toLocaleString()}`;
        if (r.bankrupt) event += ` — ${current.username} ล้มละลาย!`;
        state.lastEvent = event;
        this.nextPlayer(state);
      }
    } else if (space.type === 'property' || space.type === 'railroad' || space.type === 'utility') {
      const owned = state.ownedProperties.get(newPos);
      if (!owned) {
        state.phase = 'buying';
        state.pendingSpace = newPos;
        event += ` ราคา ฿${space.price?.toLocaleString()} — ซื้อหรือไม่?`;
        state.lastEvent = event;
      } else if (owned.ownerId === current.id) {
        event += ' (ที่ดินของตัวเอง)';
        state.lastEvent = event;
        this.nextPlayer(state);
      } else {
        const owner = state.players.find(p => p.id === owned.ownerId);
        if (owner && !owner.bankrupt) {
          const rent = this.calcRent(state, newPos, owned, d1 + d2 + d3);
          const landmarkFee = owned.landmark ? settings.landmarkVisitFee : 0;
          // Quiz path: defer payment until answered/timeout. Quiz only discounts rent;
          // landmark fee is always paid in full.
          if (settings.quizEnabled) {
            state.phase = 'quizzing';
            state.pendingQuiz = {
              rentAmount: rent,
              landmarkFee,
              ownerId: owner.id,
              position: newPos,
              question: null,
              choices: [],
              deadlineMs: null,
              resolved: false,
              submittedAnswer: null,
              correctIndex: null,
              wasCorrect: null,
              finalRent: null,
            };
            const feeNote = landmarkFee > 0 ? ` + ค่าเข้าชม ฿${landmarkFee.toLocaleString()}` : '';
            event += ` ต้องจ่ายค่าเช่า ฿${rent.toLocaleString()}${feeNote} ให้ ${owner.username} — ตอบคำถามเพื่อรับส่วนลดค่าเช่า ${settings.quizDiscountPct}%`;
            state.lastEvent = event;
            return this.serialize(state);
          }
          // Direct payment (quiz disabled)
          const total = rent + landmarkFee;
          const r = this.chargePlayer(state, current, total, owner, true);
          if (r.pending) {
            event += ` ค้างค่าเช่า ฿${total.toLocaleString()} ให้ ${owner.username} — ต้องขายทรัพย์สิน`;
            state.lastEvent = event;
            return this.serialize(state);
          }
          const feeNote = landmarkFee > 0 ? ` (รวมค่าเข้าชม ฿${landmarkFee.toLocaleString()})` : '';
          event += ` จ่าย ฿${r.paid.toLocaleString()}${feeNote} ให้ ${owner.username}`;
          if (r.bankrupt) {
            event += ` — ${current.username} ล้มละลาย! โอนทรัพย์สินให้ ${owner.username}`;
          }
        }
        state.lastEvent = event;
        this.nextPlayer(state);
      }
    } else if (space.type === 'chance') {
      event += ` 🃏 ${this.drawCard(state, current, settings, settings.enabledChanceCards, CHANCE_CARDS, 'ไม่มีการ์ดโชคในเกมนี้')}`;
      state.lastEvent = event;
      if ((state.phase as string) !== 'selling') this.nextPlayer(state);
    } else if (space.type === 'community_chest') {
      event += ` 🏦 ${this.drawCard(state, current, settings, settings.enabledCommunityChestCards, COMMUNITY_CHEST_CARDS, 'ไม่มีการ์ดกองทุนในเกมนี้')}`;
      state.lastEvent = event;
      if ((state.phase as string) !== 'selling') this.nextPlayer(state);
    } else {
      // GO, Jail visit, Free Parking — no action
      state.lastEvent = event;
      this.nextPlayer(state);
    }

    this.checkWinner(state);
    return this.serialize(state);
  }

  buyProperty(roomId: string, playerId: string): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'buying' || state.pendingSpace === null) return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const space = state.board[state.pendingSpace];
    const price = space.price ?? 0;

    if (current.money < price) {
      state.lastEvent = `${current.username} ไม่มีเงินพอซื้อ ${space.name}`;
      state.pendingSpace = null;
      this.nextPlayer(state);
      return this.serialize(state);
    }

    current.money -= price;
    state.ownedProperties.set(state.pendingSpace, { ownerId: playerId, houses: 0, hotel: false });
    state.lastEvent = `${current.username} ซื้อ ${space.name} ราคา ฿${price.toLocaleString()}`;
    state.pendingSpace = null;
    this.nextPlayer(state);
    return this.serialize(state);
  }

  declineProperty(roomId: string, playerId: string): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'buying' || state.pendingSpace === null) return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    state.lastEvent = `${current.username} ปฏิเสธซื้อ ${state.board[state.pendingSpace].name}`;
    state.pendingSpace = null;
    this.nextPlayer(state);
    return this.serialize(state);
  }

  sellProperty(roomId: string, playerId: string, position: number): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'selling') return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const owned = state.ownedProperties.get(position);
    if (!owned || owned.ownerId !== playerId) return null;

    const space = state.board[position];
    const sellPrice = Math.floor((space.price ?? 0) / 2);
    current.money += sellPrice;
    state.ownedProperties.delete(position);
    state.lastEvent = `${current.username} ขาย ${space.name} ได้ ฿${sellPrice.toLocaleString()}`;

    // Settle if able; else check if anything left to sell
    if (state.pendingDebt && current.money >= state.pendingDebt.amount) {
      this.settleDebt(state, current);
    } else {
      const hasMore = [...state.ownedProperties.values()].some(p => p.ownerId === playerId);
      if (!hasMore) this.bankruptFromDebt(state, current, ` — หมดทรัพย์สิน ล้มละลาย!`);
    }

    this.checkWinner(state);
    return this.serialize(state);
  }

  /** Called by gateway after quiz is generated. Stores question + starts timer (deadlineMs). */
  attachQuiz(
    roomId: string,
    question: string,
    choices: string[],
    correctIndex: number,
    timeoutSec: number,
  ): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'quizzing' || !state.pendingQuiz) return null;
    state.pendingQuiz.question = question;
    state.pendingQuiz.choices = choices;
    state.pendingQuiz.deadlineMs = Date.now() + timeoutSec * 1000;
    // correctIndex stored on pendingQuiz but stripped out by serialize() until resolved
    state.pendingQuiz.correctIndex = correctIndex;
    return this.serialize(state);
  }

  answerQuiz(roomId: string, playerId: string, answerIndex: number, discountPct: number): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'quizzing' || !state.pendingQuiz) return null;
    if (state.pendingQuiz.resolved || state.pendingQuiz.question === null) return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    state.pendingQuiz.submittedAnswer = answerIndex;
    this.resolveQuiz(state, discountPct);
    this.checkWinner(state);
    return this.serialize(state);
  }

  /** Called when quiz timer expires without answer */
  expireQuiz(roomId: string, discountPct: number): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'quizzing' || !state.pendingQuiz) return null;
    if (state.pendingQuiz.resolved) return null;

    this.resolveQuiz(state, discountPct);
    this.checkWinner(state);
    return this.serialize(state);
  }

  /**
   * Buy a house (or hotel after 4 houses) on a property.
   * Requirements:
   *  - phase = 'rolling' (player's own turn, before/after roll)
   *  - player owns ALL properties in the group (monopoly)
   *  - "even building" — can't build if another property in the group has fewer houses
   *  - houses cap at 4; 5th purchase converts to hotel
   *  - player has enough money
   */
  buildHouse(roomId: string, playerId: string, position: number): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'rolling') return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const space = state.board[position];
    if (!space || space.type !== 'property' || !space.group) return null;

    const owned = state.ownedProperties.get(position);
    if (!owned || owned.ownerId !== playerId) return null;
    if (owned.hotel) return null; // already maxed

    // Must own all properties in the group
    const groupPositions = state.board.reduce<number[]>((acc, s, i) => {
      if (s.group === space.group && s.type === 'property') acc.push(i);
      return acc;
    }, []);
    const ownsAll = groupPositions.every(p => state.ownedProperties.get(p)?.ownerId === playerId);
    if (!ownsAll) return null;

    // Even building rule — current level must be the lowest in the group
    const currentLevel = owned.houses + (owned.hotel ? 5 : 0);
    const minLevel = Math.min(
      ...groupPositions.map(p => {
        const o = state.ownedProperties.get(p);
        return (o?.houses ?? 0) + (o?.hotel ? 5 : 0);
      }),
    );
    if (currentLevel !== minLevel) return null;

    const cost = space.houseCost ?? 0;
    if (current.money < cost) return null;

    // Apply
    current.money -= cost;
    if (owned.houses === 4) {
      owned.houses = 0;
      owned.hotel = true;
      state.lastEvent = `${current.username} สร้างโรงแรมที่ ${space.name} (-฿${cost.toLocaleString()})`;
    } else {
      owned.houses += 1;
      state.lastEvent = `${current.username} สร้างบ้านหลังที่ ${owned.houses} ที่ ${space.name} (-฿${cost.toLocaleString()})`;
    }

    return this.serialize(state);
  }

  /**
   * Sell a house/hotel back to the bank for half price.
   * Same even-building constraint in reverse — can only sell if it's the highest
   * (or tied for highest) in the group.
   */
  sellHouse(roomId: string, playerId: string, position: number): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'rolling') return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const space = state.board[position];
    if (!space || space.type !== 'property' || !space.group) return null;

    const owned = state.ownedProperties.get(position);
    if (!owned || owned.ownerId !== playerId) return null;
    if (owned.houses === 0 && !owned.hotel) return null;

    // Even-building reverse: must be the max (or tied) in the group
    const groupPositions = state.board.reduce<number[]>((acc, s, i) => {
      if (s.group === space.group && s.type === 'property') acc.push(i);
      return acc;
    }, []);
    const currentLevel = owned.houses + (owned.hotel ? 5 : 0);
    const maxLevel = Math.max(
      ...groupPositions.map(p => {
        const o = state.ownedProperties.get(p);
        return (o?.houses ?? 0) + (o?.hotel ? 5 : 0);
      }),
    );
    if (currentLevel !== maxLevel) return null;

    const refund = Math.floor((space.houseCost ?? 0) / 2);
    current.money += refund;
    if (owned.hotel) {
      owned.hotel = false;
      owned.houses = 4;
      state.lastEvent = `${current.username} ขายโรงแรมที่ ${space.name} (+฿${refund.toLocaleString()})`;
    } else {
      owned.houses -= 1;
      state.lastEvent = `${current.username} ขายบ้านที่ ${space.name} (+฿${refund.toLocaleString()})`;
    }

    return this.serialize(state);
  }

  /**
   * Build a landmark (wonder) on a property that already has a hotel.
   * - Each landmark id may only be used once per game
   * - One landmark per property
   * - Costs `settings.landmarkPrice`
   * - Cannot be sold back; effect is a permanent visit fee on visitors
   */
  buildLandmark(
    roomId: string,
    playerId: string,
    position: number,
    landmarkId: string,
    settings: GameSettings,
  ): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'rolling') return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    const space = state.board[position];
    if (!space || space.type !== 'property') return null;

    const owned = state.ownedProperties.get(position);
    if (!owned || owned.ownerId !== playerId) return null;
    if (!owned.hotel) return null;       // requires hotel
    if (owned.landmark) return null;      // already has one

    if (!LANDMARKS.some(l => l.id === landmarkId)) return null;
    // Globally unique — no other property may already have this landmark
    for (const p of state.ownedProperties.values()) {
      if (p.landmark === landmarkId) return null;
    }

    const cost = settings.landmarkPrice;
    if (current.money < cost) return null;

    current.money -= cost;
    owned.landmark = landmarkId;
    const landmark = LANDMARKS.find(l => l.id === landmarkId)!;
    state.lastEvent = `${current.username} สร้าง ${landmark.icon} ${landmark.name} ที่ ${space.name} (-฿${cost.toLocaleString()})`;
    return this.serialize(state);
  }

  giveUp(roomId: string, playerId: string): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'selling' || !state.pendingDebt) return null;

    const current = state.players[state.currentPlayerIndex];
    if (current.id !== playerId) return null;

    this.bankruptFromDebt(state, current, `${current.username} ยอมแพ้ — ล้มละลาย!`);
    this.checkWinner(state);
    return this.serialize(state);
  }

  // ─── private helpers ─────────────────────────────────────────────────────────

  private drawCard(
    state: GameState,
    player: PlayerState,
    settings: GameSettings,
    enabledIds: string[],
    pool: ChanceCard[],
    emptyMsg: string,
  ): string {
    const { goBonus } = settings;
    if (enabledIds.length === 0) return `(${emptyMsg})`;

    const cardId = enabledIds[Math.floor(Math.random() * enabledIds.length)];
    const card = pool.find(c => c.id === cardId);
    if (!card) return '(การ์ดไม่ถูกต้อง)';

    const active = state.players.filter(p => !p.bankrupt && p.id !== player.id);
    const { effect } = card;
    let suffix = '';

    switch (effect.type) {
      case 'collect':
        player.money += effect.amount;
        suffix = `รับ ฿${effect.amount.toLocaleString()}`;
        break;

      case 'pay': {
        const r = this.chargePlayer(state, player, effect.amount, null, true);
        if (r.pending) { suffix = `ค้าง ฿${effect.amount.toLocaleString()} — ต้องขายทรัพย์สิน`; break; }
        suffix = `จ่าย ฿${r.paid.toLocaleString()}`;
        if (r.bankrupt) suffix += ' — ล้มละลาย!';
        break;
      }

      case 'collect_each':
        for (const p of active) {
          this.chargePlayer(state, p, effect.amount, player);
        }
        suffix = `รับจากทุกคนคนละ ฿${effect.amount.toLocaleString()}`;
        break;

      case 'pay_each':
        for (const p of active) {
          const r = this.chargePlayer(state, player, effect.amount, p);
          if (r.bankrupt) break;
        }
        suffix = `จ่ายให้ทุกคนคนละ ฿${effect.amount.toLocaleString()}`;
        if (player.bankrupt) suffix += ' — ล้มละลาย!';
        break;

      case 'move_to': {
        const from = player.position;
        player.position = effect.position;
        suffix = `ย้ายไปช่อง ${state.board[effect.position]?.name ?? effect.position}`;
        if (effect.position < from) {
          player.money += goBonus;
          suffix += ` (ผ่าน GO รับ ฿${goBonus.toLocaleString()})`;
        }
        break;
      }

      case 'move_steps': {
        const from = player.position;
        const N = state.board.length;
        const dest = ((from + effect.steps) % N + N) % N;
        player.position = dest;
        const dir = effect.steps > 0 ? 'เดินหน้า' : 'ถอยหลัง';
        suffix = `${dir} ${Math.abs(effect.steps)} ช่อง → ${state.board[dest]?.name ?? dest}`;
        if (effect.steps > 0 && dest < from) {
          player.money += goBonus;
          suffix += ` (ผ่าน GO รับ ฿${goBonus.toLocaleString()})`;
        }
        break;
      }

      case 'go_to_jail': {
        const jailPos = state.board.findIndex(s => s.type === 'jail');
        player.position = jailPos >= 0 ? jailPos : 0;
        player.inJail = true;
        suffix = 'ไปคุกทันที!';
        break;
      }

      case 'nearest_railroad': {
        const rails = state.board.reduce<number[]>((acc, s, i) => {
          if (s.type === 'railroad') acc.push(i);
          return acc;
        }, []);
        if (rails.length === 0) { suffix = '(ไม่มีสถานีรถไฟ)'; break; }
        const from = player.position;
        const N = state.board.length;
        const nearest = rails.reduce((b, p) =>
          (p - from + N) % N < (b - from + N) % N ? p : b,
        );
        if (nearest < from) player.money += goBonus;
        player.position = nearest;
        suffix = `ไปสถานีรถไฟ ${state.board[nearest]?.name ?? nearest}`;
        break;
      }

      case 'nearest_utility': {
        const utils = state.board.reduce<number[]>((acc, s, i) => {
          if (s.type === 'utility') acc.push(i);
          return acc;
        }, []);
        if (utils.length === 0) { suffix = '(ไม่มีสาธารณูปโภค)'; break; }
        const from = player.position;
        const N = state.board.length;
        const nearest = utils.reduce((b, p) =>
          (p - from + N) % N < (b - from + N) % N ? p : b,
        );
        if (nearest < from) player.money += goBonus;
        player.position = nearest;
        suffix = `ไปสาธารณูปโภค ${state.board[nearest]?.name ?? nearest}`;
        break;
      }
    }

    return `[${card.text}] ${suffix}`;
  }

  private calcRent(state: GameState, position: number, owned: OwnedProperty, diceTotal: number): number {
    const space = state.board[position];

    if (space.type === 'railroad') {
      const railPositions = state.board.reduce<number[]>((acc, s, i) => {
        if (s.type === 'railroad') acc.push(i);
        return acc;
      }, []);
      const count = railPositions.filter(p => state.ownedProperties.get(p)?.ownerId === owned.ownerId).length;
      return space.rent?.[count - 1] ?? 250;
    }

    if (space.type === 'utility') {
      const utilPositions = state.board.reduce<number[]>((acc, s, i) => {
        if (s.type === 'utility') acc.push(i);
        return acc;
      }, []);
      const count = utilPositions.filter(p => state.ownedProperties.get(p)?.ownerId === owned.ownerId).length;
      return diceTotal * (count >= 2 ? 10 : 4);
    }

    const baseRent = space.rent?.[owned.houses + (owned.hotel ? 5 : 0)] ?? 0;
    if (owned.houses === 0 && !owned.hotel && space.group) {
      const groupPositions = state.board.reduce<number[]>((acc, s, i) => {
        if (s.group === space.group) acc.push(i);
        return acc;
      }, []);
      const monopoly = groupPositions.every(p => state.ownedProperties.get(p)?.ownerId === owned.ownerId);
      return monopoly ? baseRent * 2 : baseRent;
    }
    return baseRent;
  }

  /**
   * Charge a player. If they can't pay and `allowSelling` is true and they own
   * properties, enter 'selling' phase (turn does not advance). Otherwise pay
   * everything they have and go bankrupt — properties transfer to creditor
   * (or release to bank if null).
   */
  private chargePlayer(
    state: GameState,
    payer: PlayerState,
    amount: number,
    creditor: PlayerState | null,
    allowSelling = false,
  ): { paid: number; bankrupt: boolean; pending: boolean } {
    if (payer.money >= amount) {
      payer.money -= amount;
      if (creditor) creditor.money += amount;
      return { paid: amount, bankrupt: false, pending: false };
    }
    if (allowSelling) {
      const hasProps = [...state.ownedProperties.values()].some(p => p.ownerId === payer.id);
      if (hasProps) {
        state.phase = 'selling';
        state.pendingDebt = { amount, creditorId: creditor?.id ?? null };
        return { paid: 0, bankrupt: false, pending: true };
      }
    }
    const paid = payer.money;
    if (creditor) creditor.money += paid;
    this.goBankrupt(state, payer, creditor);
    return { paid, bankrupt: true, pending: false };
  }

  private settleDebt(state: GameState, payer: PlayerState) {
    if (!state.pendingDebt) return;
    const { amount, creditorId } = state.pendingDebt;
    payer.money -= amount;
    if (creditorId) {
      const creditor = state.players.find(p => p.id === creditorId);
      if (creditor) creditor.money += amount;
    }
    state.lastEvent += ` · ชำระหนี้ ฿${amount.toLocaleString()}`;
    state.pendingDebt = null;
    state.pendingQuiz = null; // clear any leftover quiz from rent path
    state.phase = 'rolling';
    this.nextPlayer(state);
  }

  private bankruptFromDebt(state: GameState, player: PlayerState, message: string) {
    if (!state.pendingDebt) return;
    const { creditorId } = state.pendingDebt;
    const creditor = creditorId ? state.players.find(p => p.id === creditorId) ?? null : null;
    const paid = player.money;
    if (creditor) creditor.money += paid;
    this.goBankrupt(state, player, creditor);
    state.lastEvent = message + (creditor ? ` โอนทรัพย์ให้ ${creditor.username}` : '');
    state.pendingDebt = null;
    state.pendingQuiz = null;
    state.phase = 'rolling';
    this.nextPlayer(state);
  }

  /** Apply quiz result + charge rent. Does NOT advance turn — call finalizeQuiz after delay. */
  private resolveQuiz(state: GameState, discountPct: number) {
    const quiz = state.pendingQuiz;
    if (!quiz || quiz.resolved || quiz.correctIndex === null) return;

    const current = state.players[state.currentPlayerIndex];
    const owner = state.players.find(p => p.id === quiz.ownerId) ?? null;
    const correct = quiz.submittedAnswer === quiz.correctIndex;
    const discountedRent = correct
      ? Math.floor(quiz.rentAmount * (100 - discountPct) / 100)
      : quiz.rentAmount;
    // Landmark fee always paid in full (not affected by quiz)
    const finalTotal = discountedRent + quiz.landmarkFee;

    quiz.resolved = true;
    quiz.wasCorrect = correct;
    quiz.finalRent = finalTotal;

    const feeNote = quiz.landmarkFee > 0 ? ` + ค่าเข้าชม ฿${quiz.landmarkFee.toLocaleString()}` : '';
    let msg = correct
      ? `${current.username} ตอบถูก! ค่าเช่าลด ${discountPct}% (฿${discountedRent.toLocaleString()})${feeNote} = รวม ฿${finalTotal.toLocaleString()}`
      : quiz.submittedAnswer === null
        ? `${current.username} ตอบไม่ทัน — จ่ายเต็ม ฿${finalTotal.toLocaleString()}`
        : `${current.username} ตอบผิด — จ่ายเต็ม ฿${finalTotal.toLocaleString()}`;

    if (owner && !owner.bankrupt) {
      const r = this.chargePlayer(state, current, finalTotal, owner, true);
      if (r.pending) msg += ` · ต้องขายทรัพย์สิน`;
      else if (r.bankrupt) msg += ` — ล้มละลาย! โอนทรัพย์สินให้ ${owner.username}`;
    }
    state.lastEvent = msg;
  }

  /** Clear resolved quiz and advance turn. No-op if in selling phase. */
  finalizeQuiz(roomId: string): SerializableGameState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'quizzing' || !state.pendingQuiz?.resolved) return null;
    state.pendingQuiz = null;
    this.nextPlayer(state);
    this.checkWinner(state);
    return this.serialize(state);
  }

  private goBankrupt(state: GameState, player: PlayerState, creditor: PlayerState | null = null) {
    player.bankrupt = true;
    player.money = 0;
    for (const [id, prop] of state.ownedProperties) {
      if (prop.ownerId === player.id) {
        if (creditor) prop.ownerId = creditor.id;
        else state.ownedProperties.delete(id);
      }
    }
  }

  private nextPlayer(state: GameState) {
    const active = state.players.filter(p => !p.bankrupt);
    if (active.length <= 1) { this.checkWinner(state); return; }
    let next = (state.currentPlayerIndex + 1) % state.players.length;
    while (state.players[next].bankrupt) next = (next + 1) % state.players.length;
    state.currentPlayerIndex = next;
    state.phase = 'rolling';

    // Skip turn if player is in jail (clear flag, advance again)
    const np = state.players[next];
    if (np.inJail) {
      np.inJail = false;
      state.lastEvent += ` · ${np.username} ติดคุก ข้ามตา`;
      this.nextPlayer(state);
    }
  }

  private checkWinner(state: GameState) {
    const active = state.players.filter(p => !p.bankrupt);
    if (active.length === 1) { state.phase = 'ended'; state.winner = active[0].id; }
  }

  private serialize(state: GameState): SerializableGameState {
    // Strip correctIndex from pendingQuiz unless quiz is already resolved
    const pendingQuiz = state.pendingQuiz
      ? { ...state.pendingQuiz, correctIndex: state.pendingQuiz.resolved ? state.pendingQuiz.correctIndex : null }
      : null;
    return {
      ...state,
      pendingQuiz,
      ownedProperties: Object.fromEntries(
        Array.from(state.ownedProperties.entries()).map(([k, v]) => [String(k), v]),
      ),
    };
  }
}
