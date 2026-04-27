import { create } from 'zustand';
import type { GameState } from '../types/game';

let animInterval: ReturnType<typeof setInterval> | null = null;
const MIN_ROLL_MS = 1200;

interface GameStore {
  gameState: GameState | null;
  displayPositions: Record<string, number>;
  isRolling: boolean;
  isAnimating: boolean;
  rollingStartTime: number | null;
  setGameState: (s: GameState) => void;
  setIsRolling: (v: boolean) => void;
  clearGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  displayPositions: {},
  isRolling: false,
  isAnimating: false,
  rollingStartTime: null,

  setIsRolling: (isRolling) => set({
    isRolling,
    rollingStartTime: isRolling ? Date.now() : null,
  }),

  clearGame: () => {
    if (animInterval !== null) { clearInterval(animInterval); animInterval = null; }
    set({ gameState: null, displayPositions: {}, isRolling: false, isAnimating: false, rollingStartTime: null });
  },

  setGameState: (newState) => {
    const { isRolling, rollingStartTime } = get();

    // Enforce minimum spin duration so the dice animation is visible
    if (isRolling && rollingStartTime !== null) {
      const remaining = MIN_ROLL_MS - (Date.now() - rollingStartTime);
      if (remaining > 0) {
        setTimeout(() => get().setGameState(newState), remaining);
        return;
      }
    }

    if (animInterval !== null) { clearInterval(animInterval); animInterval = null; }

    const { displayPositions: prev } = get();
    set({ isRolling: false, rollingStartTime: null });

    // First sync: initialize display positions without animation
    if (Object.keys(prev).length === 0) {
      const initial: Record<string, number> = {};
      for (const p of newState.players) initial[p.id] = p.position;
      set({ gameState: newState, displayPositions: initial });
      return;
    }

    // Build animation paths for players who moved
    const BOARD_SIZE = 40;
    const paths: Record<string, number[]> = {};
    let maxLen = 0;

    for (const p of newState.players) {
      if (p.bankrupt) continue;
      const from = prev[p.id] ?? p.position;
      const to = p.position;
      if (from === to) continue;
      const path: number[] = [];
      let pos = from;
      while (pos !== to) {
        pos = (pos + 1) % BOARD_SIZE;
        path.push(pos);
      }
      paths[p.id] = path;
      if (path.length > maxLen) maxLen = path.length;
    }

    // Non-movers and bankrupt players jump to their final position immediately
    const displayPos: Record<string, number> = {};
    for (const p of newState.players) {
      displayPos[p.id] = paths[p.id] ? (prev[p.id] ?? p.position) : p.position;
    }

    if (maxLen === 0) {
      set({ gameState: newState, displayPositions: displayPos });
      return;
    }

    set({ gameState: newState, displayPositions: { ...displayPos }, isAnimating: true });

    let step = 0;
    animInterval = setInterval(() => {
      for (const [id, path] of Object.entries(paths)) {
        if (step < path.length) displayPos[id] = path[step];
      }
      set({ displayPositions: { ...displayPos } });
      step++;
      if (step >= maxLen) {
        clearInterval(animInterval!);
        animInterval = null;
        set({ isAnimating: false });
      }
    }, 180);
  },
}));
