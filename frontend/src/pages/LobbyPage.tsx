import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import type { Room } from '../types';

const GAME_LABELS: Record<string, string> = {
  monopoly: 'เกมเศรษฐี',
  werewolf: 'หมาป่า',
};

export default function LobbyPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [gameType, setGameType] = useState<'monopoly' | 'werewolf'>('monopoly');
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRooms() {
    try {
      const { data } = await api.get('/rooms');
      setRooms(data);
    } catch {}
  }

  function handleGameTypeChange(type: 'monopoly' | 'werewolf') {
    setGameType(type);
    setMaxPlayers(type === 'werewolf' ? 6 : 4);
  }

  const createRoom = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/rooms', { name: roomName, gameType, maxPlayers });
      navigate(`/room/${data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to create room');
    }
  };

  const monopolyOptions = [2, 3, 4, 5, 6];
  const werewolfOptions = [4, 5, 6, 7, 8, 9, 10];
  const playerOptions = gameType === 'werewolf' ? werewolfOptions : monopolyOptions;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Board Game Lobby</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">สวัสดี, {user?.username}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">ห้องที่เปิดอยู่</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition"
          >
            + สร้างห้องใหม่
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-gray-400 text-center py-16">ยังไม่มีห้อง — สร้างห้องแรกเลย!</p>
        ) : (
          <div className="grid gap-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-4 flex items-center justify-between cursor-pointer transition hover:border-indigo-500"
              >
                <div>
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-sm text-gray-400">
                    โฮสต์: {room.host.username} · {GAME_LABELS[room.gameType] ?? room.gameType}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-green-600/20 text-green-400 text-xs px-2 py-1 rounded-full">
                    รอผู้เล่น
                  </span>
                  <p className="text-sm text-gray-400 mt-1">สูงสุด {room.maxPlayers} คน</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">สร้างห้องใหม่</h3>
            <form onSubmit={createRoom} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">ชื่อห้อง</label>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">เกม</label>
                <select
                  value={gameType}
                  onChange={(e) => handleGameTypeChange(e.target.value as 'monopoly' | 'werewolf')}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="monopoly">เกมเศรษฐี</option>
                  <option value="werewolf">หมาป่า (Werewolf)</option>
                </select>
                {gameType === 'werewolf' && (
                  <p className="text-xs text-gray-500 mt-1">ต้องการอย่างน้อย 4 คน</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">จำนวนผู้เล่นสูงสุด</label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {playerOptions.map((n) => (
                    <option key={n} value={n}>{n} คน</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-2.5 rounded-lg font-medium transition"
                >
                  สร้างห้อง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
