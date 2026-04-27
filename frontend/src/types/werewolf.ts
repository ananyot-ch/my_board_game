export type WerewolfRole = 'werewolf' | 'villager' | 'seer' | 'doctor';
export type WerewolfTeam = 'werewolf' | 'villager';
export type WerewolfPhase = 'night' | 'day' | 'ended';

export interface WerewolfClientState {
  roomId: string;
  phase: WerewolfPhase;
  dayNumber: number;
  players: {
    id: string;
    username: string;
    isAlive: boolean;
    color: string;
    role?: WerewolfRole;
  }[];
  myRole: WerewolfRole | null;
  myNightActionSubmitted: boolean;
  myDayVoteSubmitted: boolean;
  nightActionsSubmitted: number;
  nightActionsTotal: number;
  dayVotesSubmitted: number;
  dayVotesTotal: number;
  dayVoteTally: Record<string, number>;
  werewolfAllies: string[];
  werewolfKillVotes: Record<string, string | null>;
  seerResults: { targetId: string; targetUsername: string; isWerewolf: boolean }[];
  eliminatedLastNight: string | null;
  eliminatedLastDay: string | null;
  lastEvent: string;
  winner: WerewolfTeam | null;
  allRoles?: Record<string, { username: string; role: WerewolfRole }>;
}
