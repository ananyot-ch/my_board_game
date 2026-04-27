import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { connectSocket, getSocket } from '../lib/socket';
import { api } from '../lib/api';
import { BOARD } from '../lib/boardData';
import type { Room, ChatMessage } from '../types';
import type { GameState, GameSettings } from '../types/game';
import type { WerewolfClientState } from '../types/werewolf';
import MonopolyBoard from '../components/game/MonopolyBoard';
import GamePanel from '../components/game/GamePanel';
import SettingsPanel from '../components/game/SettingsPanel';
import QuizModal from '../components/game/QuizModal';
import RulesModal from '../components/game/RulesModal';
import WerewolfView from '../components/game/WerewolfView';

function defaultSettings(): GameSettings {
  return {
    startingMoney: 15000,
    goBonus: 2000,
    customBoard: BOARD.map(s => ({ originalId: s.id, name: s.name, price: s.price })),
    enabledChanceCards: ['c01','c02','c03','c04','c05','c06','c07','c08','c09','c10','c11','c12','c13','c14','c15','c16','c17'],
    enabledCommunityChestCards: ['cc01','cc02','cc03','cc04','cc05','cc06','cc07','cc08','cc09','cc10','cc11','cc12'],
    quizEnabled: true,
    quizDiscountPct: 20,
    quizTimeoutSec: 10,
  };
}

const GAME_LABELS: Record<string, string> = {
  monopoly: 'เกมเศรษฐี',
  werewolf: 'หมาป่า',
};

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { gameState, setGameState, clearGame } = useGameStore();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameError, setGameError] = useState('');
  const [settings, setSettings] = useState<GameSettings>(defaultSettings());
  const [werewolfState, setWerewolfState] = useState<WerewolfClientState | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    clearGame();
    api
      .get(`/rooms/${id}`)
      .then(({ data }) => {
        setRoom(data);
        if (data.status === 'playing') setGameStarted(true);
      })
      .catch(() => navigate('/lobby'));

    connectSocket();
    const socket = getSocket();

    const joinRoom = () => socket.emit('room:join', id);
    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();

    socket.on('chat:message', (msg: ChatMessage) =>
      setMessages(prev => [...prev, msg]),
    );
    socket.on('room:player_list', (players: { userId: string; username: string }[]) => {
      setOnlineUsers(players.map(p => p.username));
    });
    socket.on('room:user_joined', ({ username }: { username: string }) =>
      setOnlineUsers(prev => [...new Set([...prev, username])]),
    );
    socket.on('room:user_left', ({ username }: { username: string }) =>
      setOnlineUsers(prev => prev.filter(u => u !== username)),
    );
    socket.on('game:settings_updated', (s: GameSettings) => {
      setSettings(s);
    });
    socket.on('game:started', () => {
      setGameStarted(true);
      setGameError('');
    });
    socket.on('game:state_sync', (state: GameState) => {
      setGameState(state);
      setGameStarted(true);
    });
    socket.on('werewolf:state_sync', (state: WerewolfClientState) => {
      setWerewolfState(state);
      setGameStarted(true);
    });
    socket.on('game:ended', ({ winnerName }: { winnerName: string }) => {
      setMessages(prev => [
        ...prev,
        { userId: 'system', username: 'ระบบ', message: `🏆 ${winnerName} ชนะเกม!`, timestamp: new Date().toISOString() },
      ]);
    });
    socket.on('game:error', ({ message }: { message: string }) => {
      setGameError(message);
      setTimeout(() => setGameError(''), 3000);
    });

    return () => {
      socket.emit('room:leave', id);
      socket.off('connect', joinRoom);
      ['chat:message', 'room:player_list', 'room:user_joined', 'room:user_left',
       'game:settings_updated', 'game:started', 'game:state_sync', 'werewolf:state_sync',
       'game:ended', 'game:error'].forEach(e => socket.off(e));
    };
  }, [id]);

  const handleSettingsChange = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    getSocket().emit('game:update_settings', { roomId: id, settings: newSettings });
  }, [id]);

  const sendChat = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    getSocket().emit('chat:send', { roomId: id, message: chatInput.trim() });
    setChatInput('');
  };

  const startGame = () => {
    setGameError('');
    getSocket().emit('game:start', id);
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        กำลังโหลด...
      </div>
    );
  }

  const isHost = user?.id === room.host.id;
  const isWerewolf = room.gameType === 'werewolf';
  const minPlayers = isWerewolf ? 4 : 2;

  // ── Werewolf game view ─────────────────────────────────────────────────────
  if (gameStarted && isWerewolf && werewolfState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-bold">{room.name}</h1>
            <span className="bg-red-600/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-600/30">
              หมาป่า
            </span>
          </div>
          <button onClick={() => navigate('/lobby')} className="text-sm text-gray-400 hover:text-white transition">
            ← ออก
          </button>
        </header>
        <div className="flex-1 flex overflow-hidden p-3 min-h-0">
          <WerewolfView
            state={werewolfState}
            myId={user?.id ?? ''}
            roomId={id!}
            messages={messages}
            chatInput={chatInput}
            onChatChange={setChatInput}
            onChatSend={sendChat}
          />
        </div>
      </div>
    );
  }

  // ── Monopoly game view ─────────────────────────────────────────────────────
  if (gameStarted && !isWerewolf && gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-bold">{room.name}</h1>
            <span className="bg-green-600/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-600/30">
              กำลังเล่น
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRules(true)}
              title="คู่มือเกม"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>
            <button onClick={() => navigate('/lobby')} className="text-sm text-gray-400 hover:text-white transition">
              ← ออก
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
          <div className="flex-1 flex items-center justify-center overflow-auto">
            <MonopolyBoard gameState={gameState} myId={user?.id ?? ''} />
          </div>
          <div className="w-72 overflow-y-auto shrink-0">
            <GamePanel
              gameState={gameState}
              myId={user?.id ?? ''}
              roomId={id!}
              messages={messages}
              chatInput={chatInput}
              onChatChange={setChatInput}
              onChatSend={sendChat}
            />
          </div>
        </div>

        {gameState.phase === 'quizzing' && gameState.pendingQuiz && (
          <QuizModal
            quiz={gameState.pendingQuiz}
            space={gameState.board[gameState.pendingQuiz.position]}
            ownerName={gameState.players.find(p => p.id === gameState.pendingQuiz!.ownerId)?.username ?? '?'}
            isMyTurn={gameState.players[gameState.currentPlayerIndex]?.id === user?.id}
            roomId={id!}
            discountPct={settings.quizDiscountPct}
          />
        )}
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  // ── Waiting room view ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{room.name}</h1>
          <p className="text-sm text-gray-400">
            {GAME_LABELS[room.gameType] ?? room.gameType} · โฮสต์: {room.host.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isWerewolf && (
            <button
              onClick={() => setShowRules(true)}
              title="คู่มือเกม"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>
          )}
          <button onClick={() => navigate('/lobby')} className="text-sm text-gray-400 hover:text-white transition">
            ← ออกจากห้อง
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-w-6xl mx-auto w-full px-4 py-4 gap-4 min-h-0">
        {/* Left panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          {isWerewolf ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="font-semibold text-gray-200 mb-2">หมาป่า (Werewolf)</p>
              <p className="text-sm text-gray-400 mb-3">
                เกมสังคมแห่งการหลอกลวง — ค้นหาและกำจัดหมาป่าก่อนที่มันจะยึดครองหมู่บ้าน
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-2">
                  <p className="text-red-400 font-semibold">🐺 หมาป่า</p>
                  <p className="text-gray-400">เลือกเหยื่อทุกคืน</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-2">
                  <p className="text-purple-400 font-semibold">🔮 หมอดู</p>
                  <p className="text-gray-400">ดูดวงทุกคืน</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-2">
                  <p className="text-blue-400 font-semibold">💊 หมอ</p>
                  <p className="text-gray-400">ปกป้องทุกคืน</p>
                </div>
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-2">
                  <p className="text-green-400 font-semibold">🏘️ ชาวบ้าน</p>
                  <p className="text-gray-400">โหวตขับไล่กลางวัน</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-300 mb-2">
                ตั้งค่าเกม {!isHost && <span className="text-gray-500 font-normal">(อ่านอย่างเดียว)</span>}
              </p>
              <div className="flex-1 min-h-0">
                <SettingsPanel settings={settings} isHost={isHost} onChange={handleSettingsChange} />
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-3 shrink-0">
          {/* Players */}
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-300 mb-2">
              ผู้เล่นในห้อง ({onlineUsers.length})
            </p>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-gray-500">ยังไม่มีผู้เล่น</p>
            ) : (
              onlineUsers.map(u => (
                <div key={u} className="flex items-center gap-2 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-sm">{u}</span>
                  {u === room.host.username && (
                    <span className="text-xs text-yellow-500">👑</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Start game */}
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            {gameError && (
              <p className="mb-2 text-red-400 text-sm bg-red-900/20 px-3 py-1.5 rounded-lg">
                {gameError}
              </p>
            )}
            {isHost ? (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  ต้องการอย่างน้อย {minPlayers} คน ({onlineUsers.length} คนในห้อง)
                </p>
                <button
                  onClick={startGame}
                  disabled={onlineUsers.length < minPlayers}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-semibold transition"
                >
                  🎮 เริ่มเกม
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">รอโฮสต์เริ่มเกม...</p>
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 bg-gray-800 rounded-xl flex flex-col overflow-hidden min-h-0">
            <p className="text-sm font-semibold text-gray-300 px-3 py-2 border-b border-gray-700 shrink-0">
              แชท
            </p>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: '300px' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  <span className="text-xs font-semibold text-indigo-400">{msg.username}: </span>
                  <span className="text-sm text-gray-200">{msg.message}</span>
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} className="p-2 border-t border-gray-700 flex gap-2 shrink-0">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-sm transition">
                ส่ง
              </button>
            </form>
          </div>
        </div>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
