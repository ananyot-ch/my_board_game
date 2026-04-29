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
  originalId: number;            // which BoardSpace's properties to use
  name: string;                  // display name (may differ from original)
  price?: number;                // override price (undefined = use original)
  group?: PropertyGroup | null;  // override group: null = no group, undefined = use original
}

export type ChanceEffect =
  | { type: 'collect'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'collect_each'; amount: number }
  | { type: 'pay_each'; amount: number }
  | { type: 'move_to'; position: number }
  | { type: 'move_steps'; steps: number }
  | { type: 'go_to_jail' }
  | { type: 'nearest_railroad' }
  | { type: 'nearest_utility' };

export interface ChanceCard {
  id: string;
  text: string;
  effect: ChanceEffect;
}

export interface GameSettings {
  startingMoney: number;
  goBonus: number;
  customBoard: CustomSpace[]; // 40 items — index = board position
  enabledChanceCards: string[];
  enabledCommunityChestCards: string[];
  quizEnabled: boolean;        // ask trivia before paying rent
  quizDiscountPct: number;     // 0-100 rent discount on correct answer
  quizTimeoutSec: number;      // seconds to answer
  landmarkPrice: number;       // cost to build a landmark (requires hotel)
  landmarkVisitFee: number;    // fee paid by other players landing on a landmark space
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
  landmark?: string; // id from LANDMARKS — only set after hotel built
}

export interface PendingDebt {
  amount: number;
  creditorId: string | null; // null = bank (tax/fine)
}

/** Quiz state (server-side has correctIndex; client gets it stripped) */
export interface PendingQuiz {
  rentAmount: number;
  /** Landmark visit fee — paid in full regardless of quiz answer */
  landmarkFee: number;
  ownerId: string;
  position: number;
  question: string | null;   // null = still generating
  choices: string[];
  deadlineMs: number | null; // unix ms; null while generating
  resolved: boolean;
  /** Player's submitted answer (revealed after resolution) */
  submittedAnswer: number | null;
  /** Correct answer index — populated only AFTER resolution (so clients can highlight) */
  correctIndex: number | null;
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
  ownedProperties: Map<number, OwnedProperty>;
  winner: string | null;
  pendingSpace: number | null;
  pendingDebt: PendingDebt | null;
  pendingQuiz: PendingQuiz | null;
  lastEvent: string;
}

export interface SerializableGameState {
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
