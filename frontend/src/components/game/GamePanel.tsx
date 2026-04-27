import { useRef, useEffect, useState } from 'react';
import type { GameState } from '../../types/game';
import type { ChatMessage } from '../../types';
import { getSocket } from '../../lib/socket';
import { useGameStore } from '../../store/gameStore';

interface Props {
  gameState: GameState;
  myId: string;
  roomId: string;
  messages: ChatMessage[];
  chatInput: string;
  onChatChange: (v: string) => void;
  onChatSend: (e: { preventDefault(): void }) => void;
}

// ─── Die face ─────────────────────────────────────────────────────────────────

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function Die({ value, spinning }: { value: number; spinning?: boolean }) {
  return (
    <div
      className={`w-14 h-14 bg-white rounded-xl border-2 border-gray-300 relative shadow-lg ${
        spinning ? 'animate-spin' : ''
      }`}
      style={spinning ? { animation: 'spin 0.15s linear infinite' } : {}}
    >
      {DOT_POSITIONS[value]?.map(([x, y], i) => (
        <div
          key={i}
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
          className="absolute w-2.5 h-2.5 bg-gray-800 rounded-full"
        />
      ))}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function GamePanel({
  gameState, myId, roomId, messages, chatInput, onChatChange, onChatSend,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRolling, isAnimating, setIsRolling } = useGameStore();

  const current = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = current?.id === myId;
  const me = gameState.players.find(p => p.id === myId);
  const pendingSpace = gameState.pendingSpace !== null
    ? gameState.board[gameState.pendingSpace]
    : null;

  // Spinning dice display
  const [spinDice, setSpinDice] = useState<[number, number, number]>([1, 1, 1]);
  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setSpinDice([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
    }, 80);
    return () => clearInterval(interval);
  }, [isRolling]);

  const displayDice = isRolling ? spinDice : gameState.lastDice;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function roll() {
    setIsRolling(true);
    getSocket().emit('game:roll', roomId);
  }
  function buy()     { getSocket().emit('game:buy', roomId); }
  function decline() { getSocket().emit('game:decline', roomId); }
  function sell(position: number) { getSocket().emit('game:sell', { roomId, position }); }
  function giveUp()  { if (confirm('ยอมแพ้และล้มละลาย?')) getSocket().emit('game:give_up', roomId); }

  // Properties owned by me (for selling phase)
  const myProperties = Object.entries(gameState.ownedProperties)
    .filter(([_, owned]) => owned.ownerId === myId)
    .map(([pos]) => parseInt(pos, 10))
    .map(pos => ({
      pos,
      space: gameState.board[pos],
      sellPrice: Math.floor((gameState.board[pos]?.price ?? 0) / 2),
    }))
    .filter(p => p.space);

  const debtCreditor = gameState.pendingDebt?.creditorId
    ? gameState.players.find(p => p.id === gameState.pendingDebt!.creditorId)
    : null;

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* My status */}
      {me && (
        <div className="bg-gray-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40" style={{ backgroundColor: me.color }} />
            <span className="font-semibold text-sm">{me.username}</span>
            {me.bankrupt && <span className="text-red-400 text-xs">(ล้มละลาย)</span>}
          </div>
          <p className="text-green-400 font-bold text-xl">฿{me.money.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            ช่อง {me.position} — {gameState.board[me.position]?.name}
          </p>
        </div>
      )}

      {/* Dice + action */}
      <div className="bg-gray-800 rounded-xl p-3">
        {gameState.phase === 'ended' ? (
          <p className="text-yellow-300 text-center font-bold text-lg">
            🏆 {gameState.players.find(p => p.id === gameState.winner)?.username} ชนะ!
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">
              ตาของ{' '}
              <span className="font-semibold" style={{ color: current?.color }}>
                {current?.username}
              </span>
              {isMyTurn && ' (คุณ)'}
            </p>

            {displayDice && (
              <div className="flex gap-2 mb-3 items-center">
                <Die value={displayDice[0]} spinning={isRolling} />
                <Die value={displayDice[1]} spinning={isRolling} />
                <Die value={displayDice[2]} spinning={isRolling} />
                {!isRolling && (
                  <span className="text-white font-bold text-2xl ml-1">
                    {displayDice[0] + displayDice[1] + displayDice[2]}
                  </span>
                )}
              </div>
            )}

            {isMyTurn && gameState.phase === 'rolling' && !isRolling && !isAnimating && (
              <button
                onClick={roll}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                🎲 ทอยลูกเต๋า
              </button>
            )}

            {(isRolling || isAnimating) && isMyTurn && (
              <div className="text-center text-gray-400 text-sm py-1">
                {isRolling ? 'กำลังทอย...' : 'กำลังเดิน...'}
              </div>
            )}

            {isMyTurn && gameState.phase === 'buying' && pendingSpace && !isAnimating && (
              <div className="space-y-2">
                <p className="text-sm text-yellow-300">
                  ซื้อ <strong>{pendingSpace.name}</strong>{' '}
                  ราคา ฿{pendingSpace.price?.toLocaleString()}?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={buy}
                    className="flex-1 bg-green-600 hover:bg-green-500 active:scale-95 text-white font-semibold py-2 rounded-lg transition"
                  >
                    ซื้อ
                  </button>
                  <button
                    onClick={decline}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 active:scale-95 text-white font-semibold py-2 rounded-lg transition"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            )}

            {gameState.phase === 'selling' && isMyTurn && gameState.pendingDebt && (
              <div className="space-y-2">
                <div className="bg-red-900/40 border border-red-700/50 rounded-lg p-2.5 text-center">
                  <p className="text-red-300 text-xs">ค้างชำระ{debtCreditor ? ` กับ ${debtCreditor.username}` : ''}</p>
                  <p className="text-red-200 font-bold text-lg">฿{gameState.pendingDebt.amount.toLocaleString()}</p>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    มี ฿{me?.money.toLocaleString()} · ขาด ฿{Math.max(0, gameState.pendingDebt.amount - (me?.money ?? 0)).toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-gray-300">เลือกขายทรัพย์สิน (ครึ่งราคา)</p>
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {myProperties.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-1">ไม่มีทรัพย์สินให้ขาย</p>
                  ) : myProperties.map(p => (
                    <button
                      key={p.pos}
                      onClick={() => sell(p.pos)}
                      className="w-full flex items-center justify-between bg-gray-700 hover:bg-gray-600 active:scale-95 px-2.5 py-1.5 rounded-lg transition text-xs"
                    >
                      <span className="text-gray-200 truncate">{p.space.name}</span>
                      <span className="text-green-400 font-semibold shrink-0 ml-2">+฿{p.sellPrice.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={giveUp}
                  className="w-full bg-red-700 hover:bg-red-600 active:scale-95 text-white font-semibold py-2 rounded-lg transition text-sm"
                >
                  ยอมแพ้
                </button>
              </div>
            )}

            {gameState.phase === 'selling' && !isMyTurn && (
              <p className="text-gray-400 text-xs text-center">
                {current?.username} กำลังขายทรัพย์สิน...
              </p>
            )}

            {!isMyTurn && !isRolling && !isAnimating && gameState.phase !== 'selling' && (
              <p className="text-gray-500 text-xs text-center">รอผู้เล่นอื่น...</p>
            )}
          </>
        )}
      </div>

      {/* Event log */}
      <div className="bg-gray-800 rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-1 font-semibold">เหตุการณ์ล่าสุด</p>
        <p className="text-xs text-gray-200 leading-snug">{gameState.lastEvent}</p>
      </div>

      {/* All players */}
      <div className="bg-gray-800 rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-2 font-semibold">ผู้เล่นทั้งหมด</p>
        <div className="space-y-1.5">
          {gameState.players.map(p => (
            <div key={p.id} className={`flex items-center justify-between ${p.bankrupt ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-xs">{p.username}</span>
                {p.id === current?.id && !p.bankrupt && (
                  <span className="text-yellow-400 text-xs">▶</span>
                )}
              </div>
              <span className="text-xs text-green-400">฿{p.money.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-gray-800 rounded-xl flex flex-col overflow-hidden min-h-0">
        <p className="text-xs font-semibold text-gray-300 px-3 py-2 border-b border-gray-700">แชท</p>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0" style={{ maxHeight: '160px' }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <span className="text-xs font-semibold text-indigo-400">{msg.username}: </span>
              <span className="text-xs text-gray-200">{msg.message}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={onChatSend} className="p-2 border-t border-gray-700 flex gap-2">
          <input
            value={chatInput}
            onChange={e => onChatChange(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg text-xs transition">
            ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}
