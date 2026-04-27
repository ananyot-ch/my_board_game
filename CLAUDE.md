# Board Game Project

Online multiplayer Thai Monopoly. NestJS backend + React frontend, real-time via Socket.io.

## Traps & non-obvious decisions

- **Types are duplicated** — no shared package. Mirror every type change in both `frontend/src/types/game.ts` AND `backend/src/games/monopoly/monopoly.types.ts`
- **`defaultSettings()` exists in two places** — `chat.gateway.ts` AND `RoomPage.tsx`. Both must stay in sync when adding a new settings field.
- **JWT payload must include `username`** — `{ sub, email, username }`. The WS gateway reads username from the token; omitting it breaks socket auth silently.
- **`synchronize: true`** in TypeORM — fine for dev, must disable for prod.

## Socket event names (string literals — grep won't catch typos)

```
room:join / room:leave / room:user_joined / room:user_left / room:player_list
chat:send / chat:message
game:update_settings / game:settings_updated
game:start / game:started / game:roll / game:buy / game:decline
game:state_sync / game:error / game:ended
```

- `room:player_list` → full player snapshot, sent only to the newcomer (not broadcast)
- `game:state_sync` → always carries full `SerializableGameState`

## CustomSpace.group semantics

```typescript
group?: PropertyGroup | null
// undefined = don't override, use original BOARD data
// null      = explicitly remove group (no monopoly set, no color bar)
// 'red'     = override to that group
```
In `initGame`: `custom.group === null ? undefined : custom.group` maps null → absent group on resolved BoardSpace.

## GameSettings shape

```typescript
interface GameSettings {
  startingMoney: number;       // default 15000
  goBonus: number;             // default 2000
  customBoard: CustomSpace[];  // 40 items; index = board position after drag-reorder
  enabledChanceCards: string[]; // card IDs; empty = no chance cards this game
}
```
