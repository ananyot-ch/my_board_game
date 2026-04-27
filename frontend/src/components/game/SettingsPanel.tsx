import { useState, useRef } from 'react';
import type { GameSettings, CustomSpace, PropertyGroup } from '../../types/game';
import { BOARD, GROUP_COLORS } from '../../lib/boardData';
import { CHANCE_CARDS } from '../../lib/chanceData';
import { COMMUNITY_CHEST_CARDS } from '../../lib/communityChestData';

interface Props {
  settings: GameSettings;
  isHost: boolean;
  onChange: (s: GameSettings) => void;
}

const TYPE_LABEL: Record<string, string> = {
  go: 'GO',
  property: 'ที่ดิน',
  railroad: 'รถไฟ',
  utility: 'สาธารณูปโภค',
  tax: 'ภาษี',
  community_chest: 'กองทุน',
  chance: 'โชค',
  jail: 'คุก',
  free_parking: 'จอดพัก',
  go_to_jail: 'ไปคุก',
};

const GROUP_LABELS: Record<string, string> = {
  brown:      'น้ำตาล',
  light_blue: 'ฟ้า',
  pink:       'ชมพู',
  orange:     'ส้ม',
  red:        'แดง',
  yellow:     'เหลือง',
  green:      'เขียว',
  dark_blue:  'น้ำเงิน',
};

type Tab = 'general' | 'board' | 'chance' | 'community';

export default function SettingsPanel({ settings, isHost, onChange }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [openGroupPicker, setOpenGroupPicker] = useState<number | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function update(partial: Partial<GameSettings>) {
    onChange({ ...settings, ...partial });
  }

  function updateSpace(index: number, patch: Partial<CustomSpace>) {
    const newBoard = settings.customBoard.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    update({ customBoard: newBoard });
  }

  function swapSpaces(a: number, b: number) {
    const newBoard = [...settings.customBoard];
    [newBoard[a], newBoard[b]] = [newBoard[b], newBoard[a]];
    update({ customBoard: newBoard });
  }

  function toggleCard(id: string, enabled: boolean) {
    const next = enabled
      ? [...(settings.enabledChanceCards ?? []), id]
      : (settings.enabledChanceCards ?? []).filter(x => x !== id);
    update({ enabledChanceCards: next });
  }

  const enabledChanceSet = new Set(settings.enabledChanceCards ?? []);
  const allChanceEnabled = CHANCE_CARDS.every(c => enabledChanceSet.has(c.id));

  const enabledCCSet = new Set(settings.enabledCommunityChestCards ?? []);
  const allCCEnabled = COMMUNITY_CHEST_CARDS.every(c => enabledCCSet.has(c.id));

  function toggleCC(id: string, enabled: boolean) {
    const next = enabled
      ? [...(settings.enabledCommunityChestCards ?? []), id]
      : (settings.enabledCommunityChestCards ?? []).filter(x => x !== id);
    update({ enabledCommunityChestCards: next });
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'general',   label: '⚙ ทั่วไป' },
    { key: 'board',     label: '🗺 กระดาน' },
    { key: 'chance',    label: '🃏 โชค' },
    { key: 'community', label: '🏦 กองทุน' },
  ];

  return (
    <div
      className="bg-gray-800 rounded-xl overflow-hidden flex flex-col h-full"
      onClick={() => setOpenGroupPicker(null)}
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-700 shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── General ── */}
      {tab === 'general' && (
        <div className="p-5 space-y-5 overflow-y-auto">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">เงินตั้งต้น (฿)</label>
            <input
              type="number"
              value={settings.startingMoney}
              disabled={!isHost}
              min={1000}
              step={1000}
              onChange={e => update({ startingMoney: Number(e.target.value) })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">โบนัสผ่าน GO (฿)</label>
            <input
              type="number"
              value={settings.goBonus}
              disabled={!isHost}
              min={0}
              step={500}
              onChange={e => update({ goBonus: Number(e.target.value) })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          {/* Quiz toggle + discount + timeout */}
          <div className="border-t border-gray-700 pt-4 space-y-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-xs text-gray-300">🧠 ถามคำถามก่อนจ่ายค่าเช่า (AI)</span>
              <input
                type="checkbox"
                checked={settings.quizEnabled}
                disabled={!isHost}
                onChange={e => update({ quizEnabled: e.target.checked })}
                className="accent-indigo-500"
              />
            </label>
            {settings.quizEnabled && (
              <>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">ส่วนลดถ้าตอบถูก (%)</label>
                  <input
                    type="number"
                    value={settings.quizDiscountPct}
                    disabled={!isHost}
                    min={0}
                    max={100}
                    step={5}
                    onChange={e => update({ quizDiscountPct: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1.5">เวลาตอบ (วินาที)</label>
                  <input
                    type="number"
                    value={settings.quizTimeoutSec}
                    disabled={!isHost}
                    min={5}
                    max={60}
                    step={1}
                    onChange={e => update({ quizTimeoutSec: Number(e.target.value) })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </div>
              </>
            )}
          </div>

          {!isHost && (
            <p className="text-xs text-gray-500 text-center">เฉพาะโฮสต์เท่านั้นที่แก้ไขได้</p>
          )}
        </div>
      )}

      {/* ── Board ── */}
      {tab === 'board' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {isHost && (
            <p className="text-xs text-gray-500 px-3 py-2 border-b border-gray-700 shrink-0">
              ลากแถวสลับตำแหน่ง · แก้ชื่อ/ราคา · คลิกจุดสีเพื่อเปลี่ยนกลุ่ม · 🔒 มุมล็อก
            </p>
          )}
          <div className="overflow-y-auto flex-1">
            {settings.customBoard.map((space, index) => {
              const original = BOARD[space.originalId];
              const isProperty = original?.type === 'property';
              const isCorner = original ? ['go', 'jail', 'free_parking', 'go_to_jail'].includes(original.type) : false;
              const canDrag = isHost && !isCorner;

              // Effective group: custom override > original
              const effectiveGroup: PropertyGroup | null | undefined =
                space.group !== undefined ? space.group : original?.group;
              const groupColor: string | undefined =
                effectiveGroup ? GROUP_COLORS[effectiveGroup] : undefined;

              return (
                <div
                  key={index}
                  draggable={canDrag}
                  onDragStart={() => { if (canDrag) dragIndex.current = index; }}
                  onDragOver={e => {
                    if (isCorner) return;
                    e.preventDefault();
                    setDragOver(index);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => {
                    if (isCorner) return;
                    if (dragIndex.current !== null && dragIndex.current !== index) {
                      swapSpaces(dragIndex.current, index);
                    }
                    dragIndex.current = null;
                    setDragOver(null);
                  }}
                  onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
                  className={`relative flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/50 transition ${
                    dragOver === index ? 'bg-indigo-900/40' : ''
                  } ${isCorner ? 'bg-gray-800/40' : ''}`}
                >
                  {isHost && (
                    isCorner ? (
                      <span className="text-gray-600 text-sm select-none shrink-0" title="มุมล็อกตำแหน่ง">🔒</span>
                    ) : (
                      <span className="text-gray-500 text-sm cursor-grab select-none shrink-0">⠿</span>
                    )
                  )}
                  <span className="text-xs text-gray-500 w-5 shrink-0 text-right">{index}</span>
                  <span className="text-xs text-gray-500 w-14 shrink-0 truncate">
                    {TYPE_LABEL[original?.type ?? ''] ?? ''}
                  </span>

                  {/* Group color dot (property spaces only) */}
                  {isProperty && (
                    <div
                      className="relative shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          if (!isHost) return;
                          setOpenGroupPicker(openGroupPicker === index ? null : index);
                        }}
                        style={{ backgroundColor: groupColor ?? '#4b5563' }}
                        className={`w-4 h-4 rounded-full border border-gray-400/40 shrink-0 ${
                          isHost ? 'cursor-pointer hover:scale-125 transition-transform' : 'cursor-default'
                        }`}
                        title={effectiveGroup ? GROUP_LABELS[effectiveGroup] : 'ไม่มีกลุ่ม'}
                      />

                      {/* Color picker popup */}
                      {openGroupPicker === index && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-6 bg-gray-700 border border-gray-600 rounded-xl p-2 shadow-2xl z-30 flex gap-1.5 flex-wrap"
                          style={{ width: '116px' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {/* No group */}
                          <button
                            onClick={() => { updateSpace(index, { group: null }); setOpenGroupPicker(null); }}
                            className={`w-6 h-6 rounded-full bg-gray-500 border-2 hover:scale-110 transition-transform ${
                              effectiveGroup == null ? 'border-white' : 'border-transparent'
                            }`}
                            title="ไม่มีกลุ่ม"
                          />
                          {/* 8 group colors */}
                          {(Object.entries(GROUP_COLORS) as [PropertyGroup, string][]).map(([g, color]) => (
                            <button
                              key={g}
                              onClick={() => { updateSpace(index, { group: g }); setOpenGroupPicker(null); }}
                              style={{ backgroundColor: color }}
                              className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${
                                effectiveGroup === g ? 'border-white' : 'border-transparent'
                              }`}
                              title={GROUP_LABELS[g]}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spacer for non-property rows to align name inputs */}
                  {!isProperty && <div className="w-4 shrink-0" />}

                  <input
                    type="text"
                    value={space.name}
                    disabled={!isHost}
                    onChange={e => updateSpace(index, { name: e.target.value })}
                    className="flex-1 bg-transparent text-white text-xs outline-none focus:bg-gray-700 px-1.5 py-0.5 rounded disabled:opacity-60 min-w-0"
                  />

                  {original?.price !== undefined && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-600">฿</span>
                      <input
                        type="number"
                        value={space.price ?? original.price}
                        disabled={!isHost}
                        min={0}
                        step={100}
                        onChange={e => updateSpace(index, { price: Number(e.target.value) })}
                        className="w-20 bg-gray-700 text-white text-xs rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-right"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Chance Cards ── */}
      {tab === 'chance' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
            <p className="text-xs text-gray-400">
              เลือกการ์ดที่จะใช้ ({enabledChanceSet.size}/{CHANCE_CARDS.length})
            </p>
            {isHost && (
              <button
                onClick={() => update({
                  enabledChanceCards: allChanceEnabled ? [] : CHANCE_CARDS.map(c => c.id),
                })}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                {allChanceEnabled ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
            {CHANCE_CARDS.map(card => {
              const checked = enabledChanceSet.has(card.id);
              return (
                <label
                  key={card.id}
                  className={`flex items-start gap-2.5 p-2 rounded-lg transition ${
                    isHost ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default'
                  } ${checked ? '' : 'opacity-40'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!isHost}
                    onChange={e => toggleCard(card.id, e.target.checked)}
                    className="mt-0.5 accent-indigo-500 shrink-0"
                  />
                  <span className="text-xs text-white leading-snug">{card.text}</span>
                </label>
              );
            })}
          </div>
          {!isHost && (
            <p className="text-xs text-gray-500 text-center py-2 shrink-0">
              เฉพาะโฮสต์เท่านั้นที่แก้ไขได้
            </p>
          )}
        </div>
      )}

      {/* ── Community Chest ── */}
      {tab === 'community' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
            <p className="text-xs text-gray-400">
              เลือกการ์ดที่จะใช้ ({enabledCCSet.size}/{COMMUNITY_CHEST_CARDS.length})
            </p>
            {isHost && (
              <button
                onClick={() => update({
                  enabledCommunityChestCards: allCCEnabled ? [] : COMMUNITY_CHEST_CARDS.map(c => c.id),
                })}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition"
              >
                {allCCEnabled ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
            {COMMUNITY_CHEST_CARDS.map(card => {
              const checked = enabledCCSet.has(card.id);
              return (
                <label
                  key={card.id}
                  className={`flex items-start gap-2.5 p-2 rounded-lg transition ${
                    isHost ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default'
                  } ${checked ? '' : 'opacity-40'}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!isHost}
                    onChange={e => toggleCC(card.id, e.target.checked)}
                    className="mt-0.5 accent-indigo-500 shrink-0"
                  />
                  <span className="text-xs text-white leading-snug">{card.text}</span>
                </label>
              );
            })}
          </div>
          {!isHost && (
            <p className="text-xs text-gray-500 text-center py-2 shrink-0">
              เฉพาะโฮสต์เท่านั้นที่แก้ไขได้
            </p>
          )}
        </div>
      )}
    </div>
  );
}
