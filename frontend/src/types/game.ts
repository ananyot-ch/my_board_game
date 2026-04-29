export type SpaceType =
  | 'go' | 'property' | 'railroad' | 'utility'
  | 'tax' | 'community_chest' | 'chance'
  | 'jail' | 'free_parking' | 'go_to_jail';

export type PropertyGroup =
  | 'brown' | 'light_blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue';

export interface BoardSpace {
  id: number;
  name: string;
  type: SpaceType;
  group?: PropertyGroup;
  price?: number;
  rent?: number[];
  houseCost?: number;
  amount?: number;
}

export interface CustomSpace {
  originalId: number;
  name: string;
  price?: number;
  group?: PropertyGroup | null; // null = remove group, undefined = use original
}

export interface GameSettings {
  startingMoney: number;
  goBonus: number;
  customBoard: CustomSpace[];
  enabledChanceCards: string[];
  enabledCommunityChestCards: string[];
  quizEnabled: boolean;
  quizDiscountPct: number;
  quizTimeoutSec: number;
  landmarkPrice: number;
  landmarkVisitFee: number;
}

export interface PlayerState {
  id: string;
  username: string;
  money: number;
  position: number;
  color: string;
  bankrupt: boolean;
  inJail: boolean;
}

export interface OwnedProperty {
  ownerId: string;
  houses: number;
  hotel: boolean;
  landmark?: string;
}

export interface PendingDebt {
  amount: number;
  creditorId: string | null;
}

export interface PendingQuiz {
  rentAmount: number;
  landmarkFee: number;
  ownerId: string;
  position: number;
  question: string | null;
  choices: string[];
  deadlineMs: number | null;
  resolved: boolean;
  submittedAnswer: number | null;
  correctIndex: number | null;  // null until resolved
  wasCorrect: boolean | null;
  finalRent: number | null;
}

export type GamePhase = 'rolling' | 'buying' | 'selling' | 'quizzing' | 'ended';

export interface GameState {
  roomId: string;
  board: BoardSpace[];
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: GamePhase;
  lastDice: [number, number, number] | null;
  ownedProperties: Record<string, OwnedProperty>;
  winner: string | null;
  pendingSpace: number | null;
  pendingDebt: PendingDebt | null;
  pendingQuiz: PendingQuiz | null;
  lastEvent: string;
}
