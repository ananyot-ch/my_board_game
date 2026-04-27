export type WerewolfRole = 'werewolf' | 'villager' | 'seer' | 'doctor';
export type WerewolfTeam = 'werewolf' | 'villager';
export type WerewolfPhase = 'night' | 'day' | 'ended';

export interface WerewolfPlayer {
  id: string;
  username: string;
  role: WerewolfRole;
  isAlive: boolean;
  color: string;
}

export interface WerewolfState {
  roomId: string;
  players: WerewolfPlayer[];
  phase: WerewolfPhase;
  dayNumber: number;
  nightActions: Record<string, string | null>; // submitterId → targetId | null
  dayVotes: Record<string, string | null>;     // voterId → targetId | null
  eliminatedLastNight: string | null;           // playerId
  eliminatedLastDay: string | null;             // playerId
  seerResults: { targetId: string; isWerewolf: boolean }[];
  lastEvent: string;
  winner: WerewolfTeam | null;
}

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
  werewolfKillVotes: Record<string, string | null>; // ally id → their chosen target (werewolves only)
  seerResults: { targetId: string; targetUsername: string; isWerewolf: boolean }[];
  eliminatedLastNight: string | null; // username
  eliminatedLastDay: string | null;   // username
  lastEvent: string;
  winner: WerewolfTeam | null;
  allRoles?: Record<string, { username: string; role: WerewolfRole }>;
}
