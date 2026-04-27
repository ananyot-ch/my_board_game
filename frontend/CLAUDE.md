# Frontend — React + Vite + TypeScript + Tailwind CSS

## Traps & gotchas

- **Always `import type { ... }`** for interfaces/types — bare `import { SomeInterface }` causes runtime errors (interfaces don't exist at runtime)
- **Tailwind v4** — config is in `vite.config.ts` (plugin), NOT in `tailwind.config.js`. Use `@import "tailwindcss"` in `index.css`
- **Form handlers** typed as `(e: { preventDefault(): void }) => void` — avoids React 19 deprecation
- **`defaultSettings()` in `RoomPage.tsx`** must stay in sync with `defaultSettings()` in `backend/src/chat/chat.gateway.ts`

## gameStore — animation architecture (non-obvious)

```typescript
gameState: GameState | null        // authoritative state from server
displayPositions: Record<string, number>  // animated token positions (userId → boardPos)
isRolling: boolean
isAnimating: boolean
rollingStartTime: number | null    // enforces MIN_ROLL_MS = 1200ms minimum spin
```

- **`MonopolyBoard` reads `displayPositions`**, not `gameState.players[i].position` — writing to the wrong one breaks animation silently
- `setGameState` steps `displayPositions` forward 1 space per 180ms via module-level `animInterval`
- `setIsRolling(true)` records `rollingStartTime`; `setGameState` delays processing if < 1200ms elapsed

## Board space data source

- **In-game**: always read from `gameState.board[id]` — this is the resolved board with custom overrides applied
- **`BOARD` constant** (`lib/boardData.ts`) is only for the settings panel to look up original type/rent data; never use it for rendering game state

## Socket singleton (`src/lib/socket.ts`)

- Call `connectSocket()` once in `RoomPage` useEffect
- Always `socket.off(eventName)` in cleanup — missing cleanup causes duplicate handlers on re-render
- Auth token is read from `localStorage` at socket creation time

## Adding a new feature

1. New socket event → handler in `RoomPage.tsx` useEffect + add to cleanup `.off()` array
2. New game state field → update `types/game.ts` AND `backend/src/games/monopoly/monopoly.types.ts`
3. New settings field → update `GameSettings` in both type files + `defaultSettings()` in `RoomPage.tsx` + `defaultSettings()` in `backend/src/chat/chat.gateway.ts`
4. TypeScript check: `npx tsc --noEmit` from `frontend/`
