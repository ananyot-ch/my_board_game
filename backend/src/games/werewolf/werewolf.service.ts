import { Injectable } from '@nestjs/common';
import type { WerewolfRole, WerewolfState, WerewolfClientState } from './werewolf.types';

const ROLE_TABLE: Record<number, WerewolfRole[]> = {
  4:  ['werewolf', 'seer', 'villager', 'villager'],
  5:  ['werewolf', 'seer', 'doctor', 'villager', 'villager'],
  6:  ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager'],
  7:  ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager'],
  8:  ['werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager', 'villager'],
  9:  ['werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager', 'villager'],
  10: ['werewolf', 'werewolf', 'werewolf', 'seer', 'doctor', 'villager', 'villager', 'villager', 'villager', 'villager'],
};

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime', 'rose'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRoles(n: number): WerewolfRole[] {
  if (ROLE_TABLE[n]) return ROLE_TABLE[n];
  const werewolves = Math.floor(n / 3);
  const roles: WerewolfRole[] = Array(werewolves).fill('werewolf');
  roles.push('seer', 'doctor');
  roles.push(...Array(n - werewolves - 2).fill('villager'));
  return roles;
}

@Injectable()
export class WerewolfService {
  private games = new Map<string, WerewolfState>();

  initGame(roomId: string, players: { id: string; username: string }[]): WerewolfState {
    const roleList = shuffle(getRoles(players.length));
    const gamePlayers = players.map((p, i) => ({
      id: p.id,
      username: p.username,
      role: roleList[i],
      isAlive: true,
      color: COLORS[i % COLORS.length],
    }));

    const state: WerewolfState = {
      roomId,
      players: gamePlayers,
      phase: 'night',
      dayNumber: 1,
      nightActions: {},
      dayVotes: {},
      eliminatedLastNight: null,
      eliminatedLastDay: null,
      seerResults: [],
      lastEvent: 'เกมเริ่มต้น — กลางคืน คืนที่ 1 หมาป่าเลือกเหยื่อ...',
      winner: null,
    };

    this.games.set(roomId, state);
    return state;
  }

  getState(roomId: string): WerewolfState | null {
    return this.games.get(roomId) ?? null;
  }

  getClientState(state: WerewolfState, viewerId: string): WerewolfClientState {
    const viewer = state.players.find(p => p.id === viewerId);
    const isEnded = state.phase === 'ended';

    const players = state.players.map(p => ({
      id: p.id,
      username: p.username,
      isAlive: p.isAlive,
      color: p.color,
      role: (p.id === viewerId || isEnded) ? p.role : undefined,
    }));

    const alivePlayers = state.players.filter(p => p.isAlive);
    const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf');
    const aliveSeer = alivePlayers.find(p => p.role === 'seer');
    const aliveDoctor = alivePlayers.find(p => p.role === 'doctor');

    const nightActionsTotal =
      aliveWerewolves.length + (aliveSeer ? 1 : 0) + (aliveDoctor ? 1 : 0);
    const nightActionsSubmitted = Object.keys(state.nightActions).length;

    const dayVotesTotal = alivePlayers.length;
    const dayVotesSubmitted = Object.keys(state.dayVotes).length;

    const dayVoteTally: Record<string, number> = {};
    for (const targetId of Object.values(state.dayVotes)) {
      if (targetId !== null) {
        dayVoteTally[targetId] = (dayVoteTally[targetId] ?? 0) + 1;
      }
    }

    const werewolfAllies = (viewer?.role === 'werewolf' || isEnded)
      ? state.players.filter(p => p.role === 'werewolf' && p.id !== viewerId).map(p => p.id)
      : [];

    const werewolfKillVotes: Record<string, string | null> = {};
    if (viewer?.role === 'werewolf') {
      for (const p of state.players.filter(p => p.role === 'werewolf')) {
        if (p.id in state.nightActions) {
          werewolfKillVotes[p.id] = state.nightActions[p.id];
        }
      }
    }

    const seerResults = (viewer?.role === 'seer' || isEnded)
      ? state.seerResults.map(r => ({
          targetId: r.targetId,
          targetUsername: state.players.find(p => p.id === r.targetId)?.username ?? '?',
          isWerewolf: r.isWerewolf,
        }))
      : [];

    const eliminatedLastNight = state.eliminatedLastNight
      ? state.players.find(p => p.id === state.eliminatedLastNight)?.username ?? null
      : null;
    const eliminatedLastDay = state.eliminatedLastDay
      ? state.players.find(p => p.id === state.eliminatedLastDay)?.username ?? null
      : null;

    let allRoles: Record<string, { username: string; role: WerewolfRole }> | undefined;
    if (isEnded) {
      allRoles = {};
      for (const p of state.players) {
        allRoles[p.id] = { username: p.username, role: p.role };
      }
    }

    return {
      roomId: state.roomId,
      phase: state.phase,
      dayNumber: state.dayNumber,
      players,
      myRole: viewer?.role ?? null,
      myNightActionSubmitted: viewerId in state.nightActions,
      myDayVoteSubmitted: viewerId in state.dayVotes,
      nightActionsSubmitted,
      nightActionsTotal,
      dayVotesSubmitted,
      dayVotesTotal,
      dayVoteTally,
      werewolfAllies,
      werewolfKillVotes,
      seerResults,
      eliminatedLastNight,
      eliminatedLastDay,
      lastEvent: state.lastEvent,
      winner: state.winner,
      allRoles,
    };
  }

  submitNightAction(roomId: string, submitterId: string, targetId: string | null): WerewolfState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'night') return null;

    const submitter = state.players.find(p => p.id === submitterId);
    if (!submitter || !submitter.isAlive) return null;
    if (!(['werewolf', 'seer', 'doctor'] as WerewolfRole[]).includes(submitter.role)) return null;
    if (submitterId in state.nightActions) return null;

    if (targetId !== null) {
      const target = state.players.find(p => p.id === targetId && p.isAlive);
      if (!target) return null;
      if (submitter.role === 'werewolf' && target.role === 'werewolf') return null;
    }

    state.nightActions[submitterId] = targetId;

    const alivePlayers = state.players.filter(p => p.isAlive);
    const needsAction = alivePlayers.filter(p =>
      (['werewolf', 'seer', 'doctor'] as WerewolfRole[]).includes(p.role),
    );
    const allSubmitted = needsAction.every(p => p.id in state.nightActions);

    if (allSubmitted) {
      this.resolveNight(state);
    } else {
      state.lastEvent = `${submitter.username} ส่งคำสั่งกลางคืนแล้ว (${Object.keys(state.nightActions).length}/${needsAction.length})`;
    }

    return state;
  }

  submitDayVote(roomId: string, voterId: string, targetId: string | null): WerewolfState | null {
    const state = this.games.get(roomId);
    if (!state || state.phase !== 'day') return null;

    const voter = state.players.find(p => p.id === voterId);
    if (!voter || !voter.isAlive) return null;
    if (voterId in state.dayVotes) return null;

    if (targetId !== null) {
      const target = state.players.find(p => p.id === targetId && p.isAlive);
      if (!target) return null;
    }

    state.dayVotes[voterId] = targetId;

    const alivePlayers = state.players.filter(p => p.isAlive);
    const allVoted = alivePlayers.every(p => p.id in state.dayVotes);

    if (allVoted) {
      this.resolveDay(state);
    } else {
      state.lastEvent = `${voter.username} โหวตแล้ว (${Object.keys(state.dayVotes).length}/${alivePlayers.length})`;
    }

    return state;
  }

  private resolveNight(state: WerewolfState): void {
    // Count werewolf kill votes
    const killVoteTally: Record<string, number> = {};
    for (const [submitterId, targetId] of Object.entries(state.nightActions)) {
      const submitter = state.players.find(p => p.id === submitterId);
      if (submitter?.role === 'werewolf' && targetId !== null) {
        killVoteTally[targetId] = (killVoteTally[targetId] ?? 0) + 1;
      }
    }

    let killTargetId: string | null = null;
    let maxVotes = 0;
    for (const [targetId, votes] of Object.entries(killVoteTally)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        killTargetId = targetId;
      }
    }

    // Doctor protection
    const doctor = state.players.find(p => p.role === 'doctor' && p.isAlive);
    const doctorProtectedId = (doctor && doctor.id in state.nightActions)
      ? state.nightActions[doctor.id]
      : null;

    // Seer result
    const seer = state.players.find(p => p.role === 'seer' && p.isAlive);
    if (seer && seer.id in state.nightActions) {
      const seerTargetId = state.nightActions[seer.id];
      if (seerTargetId) {
        const seerTarget = state.players.find(p => p.id === seerTargetId);
        state.seerResults.push({ targetId: seerTargetId, isWerewolf: seerTarget?.role === 'werewolf' });
      }
    }

    // Resolve kill
    state.eliminatedLastNight = null;
    if (killTargetId && killTargetId !== doctorProtectedId) {
      const victim = state.players.find(p => p.id === killTargetId);
      if (victim) {
        victim.isAlive = false;
        state.eliminatedLastNight = killTargetId;
        state.lastEvent = `${victim.username} ถูกหมาป่าฆ่าในคืนนี้!`;
      }
    } else if (killTargetId && killTargetId === doctorProtectedId) {
      state.lastEvent = 'คืนนี้ไม่มีผู้เสียชีวิต — หมอปกป้องได้ทัน!';
    } else {
      state.lastEvent = 'คืนนี้ไม่มีผู้เสียชีวิต';
    }

    if (!this.checkWinCondition(state)) {
      state.phase = 'day';
      state.nightActions = {};
    }
  }

  private resolveDay(state: WerewolfState): void {
    const voteTally: Record<string, number> = {};
    for (const targetId of Object.values(state.dayVotes)) {
      if (targetId !== null) {
        voteTally[targetId] = (voteTally[targetId] ?? 0) + 1;
      }
    }

    let eliminateId: string | null = null;
    let maxVotes = 0;
    let tied = false;
    for (const [targetId, votes] of Object.entries(voteTally)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        eliminateId = targetId;
        tied = false;
      } else if (votes === maxVotes) {
        tied = true;
      }
    }

    state.eliminatedLastDay = null;
    if (eliminateId && !tied) {
      const victim = state.players.find(p => p.id === eliminateId);
      if (victim) {
        victim.isAlive = false;
        state.eliminatedLastDay = eliminateId;
        state.lastEvent = `${victim.username} ถูกชาวบ้านโหวตขับไล่!`;
      }
    } else if (tied) {
      state.lastEvent = 'คะแนนเสมอ — ไม่มีผู้ถูกขับไล่วันนี้';
    } else {
      state.lastEvent = 'ไม่มีใครโหวต — ไม่มีผู้ถูกขับไล่วันนี้';
    }

    if (!this.checkWinCondition(state)) {
      state.phase = 'night';
      state.dayNumber++;
      state.dayVotes = {};
      state.lastEvent += ` — คืนที่ ${state.dayNumber} เริ่มต้น`;
    }
  }

  private checkWinCondition(state: WerewolfState): boolean {
    const alive = state.players.filter(p => p.isAlive);
    const aliveWerewolves = alive.filter(p => p.role === 'werewolf');
    const aliveVillagers = alive.filter(p => p.role !== 'werewolf');

    if (aliveWerewolves.length === 0) {
      state.winner = 'villager';
      state.phase = 'ended';
      state.lastEvent += ' — ชาวบ้านชนะ! หมาป่าถูกกำจัดหมดแล้ว';
      return true;
    }
    if (aliveWerewolves.length >= aliveVillagers.length) {
      state.winner = 'werewolf';
      state.phase = 'ended';
      state.lastEvent += ' — หมาป่าชนะ! ยึดครองหมู่บ้านแล้ว';
      return true;
    }
    return false;
  }
}
