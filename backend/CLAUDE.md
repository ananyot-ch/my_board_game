# Backend — NestJS + Fastify + Socket.io

## Traps & gotchas

- **`rollDice` takes full `settings: GameSettings`**, not just `goBonus` — pass the whole object
- **`expiresIn` needs a type cast** in `auth.module.ts`: `` as `${number}${'s'|'m'|'h'|'d'}` ``
- **`jwt.strategy.ts`** needs non-null assertion: `secretOrKey: config.get<string>('JWT_SECRET')!`
- **All real-time logic lives in `chat.gateway.ts`** — there is no separate game gateway
- **`defaultSettings()`** is defined at the top of `chat.gateway.ts` — this is the authoritative default; frontend mirrors it in `RoomPage.tsx`

## ChatGateway in-memory state

```typescript
roomPlayers: Map<roomId, Map<userId, username>>
roomSettings: Map<roomId, GameSettings>
```
No Redis wiring yet — state is lost on restart.

## MonopolyService key rules

- `games: Map<roomId, GameState>` — all game state in memory
- `board` in GameState is the **resolved** board (custom overrides already applied); never read from static `BOARD` after `initGame`
- `calcRent` dynamically scans `state.board` — no hardcoded board indices anywhere
- `ownedProperties` is a `Map` internally, serialized to `Record<string, OwnedProperty>` for JSON (`serialize()`)
- Monopoly doubling: owns all spaces with same `space.group` → base rent × 2 (houses not implemented yet)
- `goBankrupt` releases all owned properties back to unowned

## Adding a new game action

1. `@SubscribeMessage('game:new_action')` in `chat.gateway.ts`
2. Business logic in `monopoly.service.ts`
3. Emit `game:state_sync` with full state to room: `this.server.to(roomId).emit('game:state_sync', state)`
4. Mirror type changes in `monopoly.types.ts` AND `frontend/src/types/game.ts`
