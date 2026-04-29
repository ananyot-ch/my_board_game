import { useMemo } from 'react';
import type { GameState } from '../../types/game';
import { LANDMARKS, ERA_LABELS, type LandmarkEra } from '../../lib/landmarkData';

interface Props {
  gameState: GameState;
  position: number;
  price: number;
  myMoney: number;
  onPick: (landmarkId: string) => void;
  onClose: () => void;
}

export default function LandmarkPickerModal({
  gameState, position, price, myMoney, onPick, onClose,
}: Props) {
  const space = gameState.board[position];

  // Landmarks already used elsewhere on the board
  const usedIds = useMemo(() => {
    const set = new Set<string>();
    for (const owned of Object.values(gameState.ownedProperties)) {
      if (owned.landmark) set.add(owned.landmark);
    }
    return set;
  }, [gameState.ownedProperties]);

  const canAfford = myMoney >= price;

  // Group by era
  const byEra: Record<LandmarkEra, typeof LANDMARKS> = {
    ancient: [], new: [], modern: [],
  };
  LANDMARKS.forEach(l => byEra[l.era].push(l));

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg">🏛️ เลือกสิ่งมหัศจรรย์ที่จะสร้าง</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              บน <span className="text-white font-medium">{space?.name}</span> · ราคา{' '}
              <span className={canAfford ? 'text-yellow-300' : 'text-red-400'}>
                ฿{price.toLocaleString()}
              </span>
              {!canAfford && <span className="text-red-400"> (เงินไม่พอ)</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {(Object.keys(byEra) as LandmarkEra[]).map(era => (
            <section key={era}>
              <h4 className="text-indigo-400 font-semibold text-sm mb-2">{ERA_LABELS[era]}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {byEra[era].map(l => {
                  const used = usedIds.has(l.id);
                  const disabled = used || !canAfford;
                  return (
                    <button
                      key={l.id}
                      disabled={disabled}
                      onClick={() => onPick(l.id)}
                      title={used ? 'ถูกสร้างไปแล้วในเกมนี้' : !canAfford ? 'เงินไม่พอ' : ''}
                      className={`p-3 rounded-lg border text-left transition ${
                        used
                          ? 'bg-gray-900/40 border-gray-700 opacity-40 cursor-not-allowed'
                          : !canAfford
                          ? 'bg-gray-700/40 border-gray-700 cursor-not-allowed'
                          : 'bg-gray-700 border-gray-600 hover:bg-indigo-700 hover:border-indigo-400 active:scale-95'
                      }`}
                    >
                      <div className="text-2xl mb-1">{l.icon}</div>
                      <div className="text-xs text-white font-medium leading-tight">{l.name}</div>
                      {used && <div className="text-[10px] text-red-400 mt-1">✗ สร้างไปแล้ว</div>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
