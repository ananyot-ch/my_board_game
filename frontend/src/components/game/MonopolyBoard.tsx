import { useState } from 'react';
import type { GameState, PlayerState, OwnedProperty } from '../../types/game';
import { GROUP_COLORS, SPACE_ICONS, getGridPos } from '../../lib/boardData';
import { useGameStore } from '../../store/gameStore';

interface Props {
  gameState: GameState;
  myId: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  go: 'GO',
  property: 'ที่ดิน',
  railroad: 'รถไฟ',
  utility: 'สาธารณูปโภค',
  tax: 'ภาษี',
  community_chest: 'กองทุน',
  chance: 'การ์ดโชค',
  jail: 'คุก',
  free_parking: 'จอดพัก',
  go_to_jail: 'ไปคุก',
};

const GROUP_LABELS: Record<string, string> = {
  brown: 'น้ำตาล',
  light_blue: 'ฟ้า',
  pink: 'ชมพู',
  orange: 'ส้ม',
  red: 'แดง',
  yellow: 'เหลือง',
  green: 'เขียว',
  dark_blue: 'น้ำเงิน',
};

const RENT_LABELS = ['ไม่มีบ้าน', '🏠 1 หลัง', '🏠 2 หลัง', '🏠 3 หลัง', '🏠 4 หลัง', '🏨 โรงแรม'];
const RAILROAD_LABELS = ['ถือ 1 สถานี', 'ถือ 2 สถานี', 'ถือ 3 สถานี', 'ถือ 4 สถานี'];

// ─── helpers ──────────────────────────────────────────────────────────────────

function playersOnSpace(
  players: PlayerState[],
  spaceId: number,
  displayPositions: Record<string, number>,
) {
  return players.filter(p => !p.bankrupt && (displayPositions[p.id] ?? p.position) === spaceId);
}

function spaceColorBar(group: string | undefined, side: 'top' | 'bottom' | 'left' | 'right') {
  if (!group) return null;
  const color = GROUP_COLORS[group];
  const style: React.CSSProperties = {
    backgroundColor: color,
    position: 'absolute',
    ...(side === 'top'    && { top: 0,    left: 0, right: 0,  height: 10 }),
    ...(side === 'bottom' && { bottom: 0, left: 0, right: 0,  height: 10 }),
    ...(side === 'left'   && { left: 0,   top: 0,  bottom: 0, width: 10  }),
    ...(side === 'right'  && { right: 0,  top: 0,  bottom: 0, width: 10  }),
  };
  return <div style={style} />;
}

function ownedDot(owned: OwnedProperty | undefined, players: PlayerState[]) {
  if (!owned) return null;
  const owner = players.find(p => p.id === owned.ownerId);
  if (!owner) return null;
  return (
    <div
      style={{ backgroundColor: owner.color }}
      className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white/60 shadow"
    />
  );
}

// ─── space detail modal ───────────────────────────────────────────────────────

function SpaceDetailModal({
  spaceId,
  gameState,
  onClose,
}: {
  spaceId: number;
  gameState: GameState;
  onClose: () => void;
}) {
  const space = gameState.board[spaceId];
  if (!space) return null;

  const owned = gameState.ownedProperties[String(spaceId)] as OwnedProperty | undefined;
  const owner = owned ? gameState.players.find(p => p.id === owned.ownerId) : null;
  const groupColor = space.group ? GROUP_COLORS[space.group] : null;
  const currentLevel = owned ? (owned.hotel ? 5 : owned.houses) : -1;

  const hasBuyable = space.type === 'property' || space.type === 'railroad' || space.type === 'utility';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl w-72 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3"
          style={groupColor ? { borderTop: `6px solid ${groupColor}` } : { borderTop: '6px solid transparent' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{space.name}</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                {TYPE_LABEL[space.type] ?? space.type}
                {space.group && ` · ${GROUP_LABELS[space.group] ?? space.group}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition text-xl leading-none ml-3 mt-0.5"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pb-4 space-y-3">
          {/* Purchase price */}
          {space.price !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">ราคาซื้อ</span>
              <span className="text-white font-semibold">฿{space.price.toLocaleString()}</span>
            </div>
          )}

          {/* Tax */}
          {space.type === 'tax' && space.amount !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">ค่าภาษี</span>
              <span className="text-red-400 font-semibold">฿{space.amount.toLocaleString()}</span>
            </div>
          )}

          {/* Rent — property */}
          {space.type === 'property' && space.rent && space.rent.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-1.5">ค่าเช่า</p>
              <div className="space-y-0.5">
                {space.rent.map((r, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center text-sm px-2 py-1 rounded-lg transition ${
                      currentLevel === i
                        ? 'bg-indigo-900/60 ring-1 ring-indigo-500'
                        : 'hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-gray-300">{RENT_LABELS[i]}</span>
                    <span className={`font-medium ${currentLevel === i ? 'text-indigo-300' : 'text-white'}`}>
                      ฿{r.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rent — railroad */}
          {space.type === 'railroad' && space.rent && space.rent.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-1.5">ค่าเช่า (ตามจำนวนสถานีที่ถือ)</p>
              <div className="space-y-0.5">
                {space.rent.map((r, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm px-2 py-1 rounded-lg hover:bg-gray-700/50"
                  >
                    <span className="text-gray-300">{RAILROAD_LABELS[i] ?? `${i + 1} สถานี`}</span>
                    <span className="text-white font-medium">฿{r.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rent — utility */}
          {space.type === 'utility' && (
            <div>
              <p className="text-gray-400 text-xs mb-1.5">ค่าเช่า (× แต้มลูกเต๋า)</p>
              <div className="space-y-0.5">
                {[['ถือ 1 อย่าง', '4×'], ['ถือ 2 อย่าง', '10×']].map(([label, mult]) => (
                  <div key={label} className="flex justify-between items-center text-sm px-2 py-1 rounded-lg hover:bg-gray-700/50">
                    <span className="text-gray-300">{label}</span>
                    <span className="text-white font-medium">{mult} แต้ม</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* House cost */}
          {space.type === 'property' && space.houseCost !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">ราคาบ้าน / โรงแรม</span>
              <span className="text-white">฿{space.houseCost.toLocaleString()}</span>
            </div>
          )}

          {/* Owner */}
          {owner && (
            <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: owner.color }} />
                <span className="text-white text-sm font-medium">{owner.username}</span>
              </div>
              <span className="text-gray-400 text-xs">
                {owned?.hotel ? '🏨 โรงแรม' : owned && owned.houses > 0 ? `🏠 ${owned.houses} หลัง` : 'ที่ดินเปล่า'}
              </span>
            </div>
          )}

          {/* No owner */}
          {!owner && hasBuyable && (
            <div className="border-t border-gray-700 pt-3">
              <span className="text-gray-500 text-xs">ยังไม่มีเจ้าของ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── single space ─────────────────────────────────────────────────────────────

function SpaceCell({
  id,
  gameState,
  displayPositions,
  colorBarSide,
  onSelect,
}: {
  id: number;
  gameState: GameState;
  displayPositions: Record<string, number>;
  colorBarSide: 'top' | 'bottom' | 'left' | 'right';
  onSelect: (id: number) => void;
}) {
  const space = gameState.board[id];
  if (!space) return null;

  const owned = gameState.ownedProperties[String(id)] as OwnedProperty | undefined;
  const onSpace = playersOnSpace(gameState.players, id, displayPositions);
  const isPending = gameState.pendingSpace === id;

  const icon = SPACE_ICONS[space.type];
  const showIcon = !space.group;

  const paddingClass =
    colorBarSide === 'top'    ? 'pt-3' :
    colorBarSide === 'bottom' ? 'pb-3' :
    colorBarSide === 'left'   ? 'pl-3' :
    colorBarSide === 'right'  ? 'pr-3' : '';

  return (
    <div
      style={{ gridColumn: getGridPos(id).col, gridRow: getGridPos(id).row }}
      onClick={() => onSelect(id)}
      className={`relative border border-gray-600 bg-white flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors ${
        isPending ? 'ring-2 ring-yellow-400 ring-inset' : ''
      }`}
    >
      {spaceColorBar(space.group, colorBarSide)}
      {ownedDot(owned, gameState.players)}

      <div className={`flex flex-col items-center justify-center gap-0.5 px-0.5 w-full h-full ${paddingClass}`}>
        {showIcon && (
          <span style={{ fontSize: '11px' }} className="leading-none">{icon}</span>
        )}
        <span
          className="text-gray-800 font-medium leading-tight text-center break-words w-full"
          style={{ fontSize: '8px' }}
        >
          {space.name}
        </span>
        {space.price && (
          <span className="text-gray-500 leading-none" style={{ fontSize: '6px' }}>
            ฿{(space.price / 1000).toFixed(1)}K
          </span>
        )}
        {space.amount && (
          <span className="text-red-500 leading-none" style={{ fontSize: '6px' }}>
            ฿{space.amount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Player tokens */}
      {onSpace.length > 0 && (
        <div className="absolute bottom-0 left-0 flex flex-wrap gap-0.5 p-0.5 z-10">
          {onSpace.map(p => (
            <div
              key={p.id}
              title={p.username}
              style={{ backgroundColor: p.color }}
              className="w-3 h-3 rounded-full border-2 border-white shadow-md transition-all duration-150"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── center panel ─────────────────────────────────────────────────────────────

function BoardCenter({ gameState, myId }: { gameState: GameState; myId: string }) {
  const current = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = current?.id === myId;

  return (
    <div
      style={{ gridColumn: '2 / 16', gridRow: '2 / 16' }}
      className="bg-emerald-800 flex flex-col items-center justify-center gap-4 p-6"
    >
      <h2 className="text-white font-bold text-2xl tracking-widest">เศรษฐี</h2>
      <div className="w-20 h-px bg-white/30" />

      <div className="text-center">
        {gameState.phase === 'ended' ? (
          <p className="text-yellow-300 font-bold text-xl">
            🏆 {gameState.players.find(p => p.id === gameState.winner)?.username} ชนะ!
          </p>
        ) : (
          <>
            <p className="text-emerald-200 text-sm">ตาของ</p>
            <p className="font-bold text-lg" style={{ color: current?.color }}>
              {current?.username}
            </p>
            {isMyTurn && (
              <span className="text-yellow-300 text-sm">(คุณ)</span>
            )}
          </>
        )}
      </div>

      {gameState.lastDice && (
        <div className="flex gap-3">
          {gameState.lastDice.map((d, i) => (
            <div
              key={i}
              className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-800 text-lg shadow-md"
            >
              {d}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-[200px] text-center">
        <p className="text-emerald-100 text-sm leading-snug">{gameState.lastEvent}</p>
      </div>
    </div>
  );
}

// ─── board ────────────────────────────────────────────────────────────────────

export default function MonopolyBoard({ gameState, myId }: Props) {
  const { displayPositions } = useGameStore();
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);

  function colorBarSide(id: number): 'top' | 'bottom' | 'left' | 'right' {
    if (id >= 1  && id <= 14) return 'top';     // bottom row
    if (id >= 16 && id <= 29) return 'right';   // left col
    if (id >= 31 && id <= 44) return 'bottom';  // top row
    if (id >= 46 && id <= 59) return 'left';    // right col
    return 'top';
  }

  return (
    <>
      <div className="w-full aspect-square" style={{ maxWidth: '880px', maxHeight: '880px' }}>
        <div
          className="w-full h-full border-2 border-gray-600"
          style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(14, 1fr) 60px',
            gridTemplateRows: '60px repeat(14, 1fr) 60px',
          }}
        >
          {gameState.board.map(space => (
            <SpaceCell
              key={space.id}
              id={space.id}
              gameState={gameState}
              displayPositions={displayPositions}
              colorBarSide={colorBarSide(space.id)}
              onSelect={setSelectedSpace}
            />
          ))}
          <BoardCenter gameState={gameState} myId={myId} />
        </div>
      </div>

      {selectedSpace !== null && (
        <SpaceDetailModal
          spaceId={selectedSpace}
          gameState={gameState}
          onClose={() => setSelectedSpace(null)}
        />
      )}
    </>
  );
}
