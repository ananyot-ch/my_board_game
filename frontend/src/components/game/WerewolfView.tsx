import { useState } from 'react';
import { getSocket } from '../../lib/socket';
import type { WerewolfClientState, WerewolfRole } from '../../types/werewolf';
import type { ChatMessage } from '../../types';

const ROLE_TH: Record<WerewolfRole, string> = {
  werewolf: 'หมาป่า',
  villager: 'ชาวบ้าน',
  seer: 'หมอดู',
  doctor: 'หมอ',
};

const ROLE_DESC: Record<WerewolfRole, string> = {
  werewolf: 'คุณคือหมาป่า — เลือกเหยื่อในตอนกลางคืน',
  villager: 'คุณคือชาวบ้าน — โหวตขับไล่หมาป่าในตอนกลางวัน',
  seer: 'คุณคือหมอดู — ดูดวงผู้เล่นในตอนกลางคืน',
  doctor: 'คุณคือหมอ — ปกป้องผู้เล่นในตอนกลางคืน',
};

const ROLE_COLOR: Record<WerewolfRole, string> = {
  werewolf: 'text-red-400 bg-red-900/30 border-red-700',
  villager: 'text-green-400 bg-green-900/30 border-green-700',
  seer: 'text-purple-400 bg-purple-900/30 border-purple-700',
  doctor: 'text-blue-400 bg-blue-900/30 border-blue-700',
};

const AVATAR_COLOR: Record<string, string> = {
  red: 'bg-red-500', blue: 'bg-blue-500', green: 'bg-green-500',
  yellow: 'bg-yellow-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  pink: 'bg-pink-500', cyan: 'bg-cyan-500', lime: 'bg-lime-500', rose: 'bg-rose-500',
};

interface Props {
  state: WerewolfClientState;
  myId: string;
  roomId: string;
  messages: ChatMessage[];
  chatInput: string;
  onChatChange: (v: string) => void;
  onChatSend: (e: { preventDefault(): void }) => void;
}

export default function WerewolfView({ state, myId, roomId, messages, chatInput, onChatChange, onChatSend }: Props) {
  const [nightTarget, setNightTarget] = useState('');
  const [dayVoteTarget, setDayVoteTarget] = useState('');

  const me = state.players.find(p => p.id === myId);
  const alivePlayers = state.players.filter(p => p.isAlive);
  const deadPlayers = state.players.filter(p => !p.isAlive);

  function submitNightAction() {
    getSocket().emit('werewolf:night_action', { roomId, targetId: nightTarget || null });
    setNightTarget('');
  }

  function submitDayVote() {
    getSocket().emit('werewolf:day_vote', { roomId, targetId: dayVoteTarget || null });
    setDayVoteTarget('');
  }

  const hasNightRole = me?.role === 'werewolf' || me?.role === 'seer' || me?.role === 'doctor';

  // Night-phase target options
  const nightTargetOptions = () => {
    if (me?.role === 'werewolf') {
      return alivePlayers.filter(p => p.id !== myId && p.role !== 'werewolf');
    }
    return alivePlayers.filter(p => p.id !== myId);
  };

  const phaseLabel = state.phase === 'night'
    ? `กลางคืน คืนที่ ${state.dayNumber}`
    : state.phase === 'day'
    ? `กลางวัน วันที่ ${state.dayNumber}`
    : 'จบเกม';

  const phaseIcon = state.phase === 'night' ? '🌙' : state.phase === 'day' ? '☀️' : '🏁';

  return (
    <div className="flex flex-1 overflow-hidden gap-3 min-h-0">
      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">

        {/* Phase banner */}
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
          state.phase === 'night' ? 'bg-indigo-900/50 border border-indigo-700' :
          state.phase === 'day'  ? 'bg-amber-900/40 border border-amber-700' :
                                   'bg-gray-800 border border-gray-600'
        }`}>
          <div>
            <p className="text-lg font-bold">{phaseIcon} {phaseLabel}</p>
            <p className="text-sm text-gray-300 mt-0.5">{state.lastEvent}</p>
          </div>
          {state.phase === 'night' && (
            <div className="text-right text-xs text-gray-400">
              ส่งคำสั่งแล้ว {state.nightActionsSubmitted}/{state.nightActionsTotal}
            </div>
          )}
          {state.phase === 'day' && (
            <div className="text-right text-xs text-gray-400">
              โหวตแล้ว {state.dayVotesSubmitted}/{state.dayVotesTotal}
            </div>
          )}
        </div>

        {/* My role card */}
        {me?.role && (
          <div className={`rounded-xl px-4 py-3 border text-sm ${ROLE_COLOR[me.role]}`}>
            <span className="font-bold">บทบาทของคุณ: {ROLE_TH[me.role]}</span>
            <span className="ml-2 text-gray-400">— {ROLE_DESC[me.role]}</span>
          </div>
        )}

        {/* Elimination announcements */}
        {state.phase === 'day' && state.eliminatedLastNight !== null && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
            🐺 คืนที่แล้ว: <strong>{state.eliminatedLastNight}</strong> ถูกหมาป่าฆ่า
          </div>
        )}
        {state.phase === 'day' && state.eliminatedLastNight === null && state.dayNumber > 1 && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl px-4 py-3 text-sm text-green-300">
            คืนที่แล้วไม่มีผู้เสียชีวิต
          </div>
        )}
        {state.phase === 'night' && state.eliminatedLastDay !== null && (
          <div className="bg-orange-900/30 border border-orange-700 rounded-xl px-4 py-3 text-sm text-orange-300">
            🗳️ วันที่แล้ว: <strong>{state.eliminatedLastDay}</strong> ถูกขับไล่
          </div>
        )}

        {/* Werewolf allies */}
        {me?.role === 'werewolf' && state.werewolfAllies.length > 0 && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-2 text-sm">
            <span className="text-red-400 font-semibold">พวกหมาป่า: </span>
            {state.werewolfAllies.map(allyId => {
              const ally = state.players.find(p => p.id === allyId);
              const voted = state.werewolfKillVotes[allyId];
              const votedName = voted ? state.players.find(p => p.id === voted)?.username : null;
              return (
                <span key={allyId} className="text-red-300 mr-3">
                  {ally?.username}
                  {voted !== undefined ? (
                    <span className="text-gray-500 text-xs ml-1">
                      ({votedName ? `→ ${votedName}` : 'ยังไม่โหวต'})
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        )}

        {/* Seer results history */}
        {me?.role === 'seer' && state.seerResults.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-800 rounded-xl px-4 py-2 text-sm">
            <p className="text-purple-400 font-semibold mb-1">ผลการดูดวง:</p>
            {state.seerResults.map((r, i) => (
              <p key={i} className={r.isWerewolf ? 'text-red-400' : 'text-green-400'}>
                {r.targetUsername}: {r.isWerewolf ? '🐺 หมาป่า' : '✅ ชาวบ้าน'}
              </p>
            ))}
          </div>
        )}

        {/* Night action panel */}
        {state.phase === 'night' && me?.isAlive && hasNightRole && !state.myNightActionSubmitted && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-gray-200 mb-2">
              {me.role === 'werewolf' ? '🐺 เลือกเหยื่อ' :
               me.role === 'seer'    ? '🔮 เลือกดูดวง' :
                                       '💊 เลือกคนที่จะปกป้อง'}
            </p>
            <div className="flex gap-2">
              <select
                value={nightTarget}
                onChange={e => setNightTarget(e.target.value)}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">— เลือกผู้เล่น —</option>
                {nightTargetOptions().map(p => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
              </select>
              <button
                onClick={submitNightAction}
                disabled={!nightTarget}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                ส่ง
              </button>
            </div>
          </div>
        )}
        {state.phase === 'night' && me?.isAlive && hasNightRole && state.myNightActionSubmitted && (
          <div className="bg-gray-800 border border-green-700/50 rounded-xl px-4 py-3 text-sm text-green-400">
            ✓ ส่งคำสั่งแล้ว — รอผู้เล่นอื่น ({state.nightActionsSubmitted}/{state.nightActionsTotal})
          </div>
        )}
        {state.phase === 'night' && me?.isAlive && !hasNightRole && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-400 text-center">
            🌙 รอรุ่งสาง... ({state.nightActionsSubmitted}/{state.nightActionsTotal} ส่งคำสั่งแล้ว)
          </div>
        )}
        {state.phase === 'night' && !me?.isAlive && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
            คุณตายแล้ว — รอดูเกม
          </div>
        )}

        {/* Day vote panel */}
        {state.phase === 'day' && me?.isAlive && !state.myDayVoteSubmitted && (
          <div className="bg-gray-800 border border-amber-700/50 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-gray-200 mb-2">🗳️ โหวตขับไล่</p>
            <div className="flex gap-2">
              <select
                value={dayVoteTarget}
                onChange={e => setDayVoteTarget(e.target.value)}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                <option value="">— งดออกเสียง —</option>
                {alivePlayers.filter(p => p.id !== myId).map(p => {
                  const votes = state.dayVoteTally[p.id] ?? 0;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.username} {votes > 0 ? `(${votes} โหวต)` : ''}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={submitDayVote}
                className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                โหวต
              </button>
            </div>
          </div>
        )}
        {state.phase === 'day' && me?.isAlive && state.myDayVoteSubmitted && (
          <div className="bg-gray-800 border border-amber-700/50 rounded-xl px-4 py-3 text-sm text-amber-400">
            ✓ โหวตแล้ว — รอผู้เล่นอื่น ({state.dayVotesSubmitted}/{state.dayVotesTotal})
          </div>
        )}

        {/* Day vote tally */}
        {state.phase === 'day' && Object.keys(state.dayVoteTally).length > 0 && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 mb-2">คะแนนโหวต</p>
            {Object.entries(state.dayVoteTally)
              .sort((a, b) => b[1] - a[1])
              .map(([targetId, count]) => {
                const target = state.players.find(p => p.id === targetId);
                return (
                  <div key={targetId} className="flex items-center gap-2 mb-1">
                    <div
                      className="h-2 bg-amber-500 rounded"
                      style={{ width: `${(count / state.dayVotesTotal) * 100}%`, minWidth: '4px' }}
                    />
                    <span className="text-sm text-gray-300">{target?.username} — {count} โหวต</span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Game ended */}
        {state.phase === 'ended' && (
          <div className={`rounded-xl px-6 py-5 border text-center ${
            state.winner === 'werewolf'
              ? 'bg-red-900/40 border-red-600'
              : 'bg-green-900/30 border-green-600'
          }`}>
            <p className="text-2xl font-bold mb-1">
              {state.winner === 'werewolf' ? '🐺 หมาป่าชนะ!' : '🏘️ ชาวบ้านชนะ!'}
            </p>
            <p className="text-gray-300 text-sm mb-3">{state.lastEvent}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {state.players.map(p => {
                const roleInfo = state.allRoles?.[p.id];
                return (
                  <div key={p.id} className={`px-3 py-1.5 rounded-lg text-xs border ${
                    roleInfo?.role === 'werewolf' ? 'bg-red-900/30 border-red-700 text-red-300' :
                    roleInfo?.role === 'seer'     ? 'bg-purple-900/30 border-purple-700 text-purple-300' :
                    roleInfo?.role === 'doctor'   ? 'bg-blue-900/30 border-blue-700 text-blue-300' :
                                                    'bg-gray-800 border-gray-700 text-gray-300'
                  }`}>
                    <span className="font-semibold">{p.username}</span>
                    {roleInfo && <span className="ml-1 opacity-75">({ROLE_TH[roleInfo.role]})</span>}
                    {!p.isAlive && <span className="ml-1 opacity-50">†</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Player grid */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            ผู้เล่นที่ยังอยู่ ({alivePlayers.length} คน)
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {alivePlayers.map(p => {
              const votes = state.dayVoteTally[p.id] ?? 0;
              return (
                <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-center">
                  <div className={`w-8 h-8 rounded-full ${AVATAR_COLOR[p.color] ?? 'bg-gray-500'} flex items-center justify-center mx-auto mb-1`}>
                    <span className="text-white font-bold text-sm">{p.username[0].toUpperCase()}</span>
                  </div>
                  <p className="text-xs font-medium truncate">{p.username}</p>
                  {p.id === myId && <p className="text-xs text-indigo-400">คุณ</p>}
                  {p.role && p.id !== myId && state.phase === 'ended' && (
                    <p className="text-xs text-gray-500">{ROLE_TH[p.role]}</p>
                  )}
                  {state.phase === 'day' && votes > 0 && (
                    <p className="text-xs text-amber-400">{votes} โหวต</p>
                  )}
                </div>
              );
            })}
          </div>

          {deadPlayers.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-600 mt-3 mb-2">เสียชีวิต ({deadPlayers.length} คน)</p>
              <div className="flex flex-wrap gap-2">
                {deadPlayers.map(p => (
                  <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1 flex items-center gap-1.5 opacity-60">
                    <div className={`w-5 h-5 rounded-full ${AVATAR_COLOR[p.color] ?? 'bg-gray-600'} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">{p.username[0].toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-gray-500">{p.username}</span>
                    {p.role && <span className="text-xs text-gray-600">({ROLE_TH[p.role]})</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Chat sidebar ── */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl flex flex-col overflow-hidden min-h-0">
          <p className="text-xs font-semibold text-gray-400 px-3 py-2 border-b border-gray-700 shrink-0">แชท</p>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0" style={{ maxHeight: '400px' }}>
            {messages.map((msg, i) => (
              <div key={i}>
                <span className="text-xs font-semibold text-indigo-400">{msg.username}: </span>
                <span className="text-xs text-gray-300">{msg.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={onChatSend} className="p-2 border-t border-gray-700 flex gap-1.5 shrink-0">
            <input
              value={chatInput}
              onChange={e => onChatChange(e.target.value)}
              placeholder="พิมพ์..."
              className="flex-1 bg-gray-700 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-2 py-1.5 rounded-lg text-xs transition">
              ส่ง
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
