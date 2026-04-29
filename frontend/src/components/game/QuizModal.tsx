import { useEffect, useState } from 'react';
import type { PendingQuiz, BoardSpace } from '../../types/game';
import { getSocket } from '../../lib/socket';

interface Props {
  quiz: PendingQuiz;
  space: BoardSpace | undefined;
  ownerName: string;
  isMyTurn: boolean;
  roomId: string;
  discountPct: number;
}

export default function QuizModal({ quiz, space, ownerName, isMyTurn, roomId, discountPct }: Props) {
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<number | null>(null);

  // Tick every 100ms for smooth countdown
  useEffect(() => {
    if (quiz.resolved || !quiz.deadlineMs) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [quiz.resolved, quiz.deadlineMs]);

  // Reset picked when a new quiz starts
  useEffect(() => {
    setPicked(null);
  }, [quiz.question]);

  function answer(idx: number) {
    if (quiz.resolved || picked !== null || !isMyTurn) return;
    setPicked(idx);
    getSocket().emit('game:answer_quiz', { roomId, answer: idx });
  }

  const remainingSec = quiz.deadlineMs ? Math.max(0, (quiz.deadlineMs - now) / 1000) : 0;
  const remainingPct = quiz.deadlineMs && quiz.question
    ? Math.max(0, Math.min(100, (remainingSec * 1000 / (quiz.deadlineMs - (quiz.deadlineMs - 10000))) * 100))
    : 100;

  // Loading state
  if (!quiz.question) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-96 text-center shadow-2xl">
          <div className="text-yellow-300 text-xs mb-2">ค่าเช่า ฿{quiz.rentAmount.toLocaleString()} ให้ {ownerName}</div>
          <div className="text-white font-bold text-lg mb-3">กำลังสุ่มคำถาม...</div>
          <div className="text-gray-400 text-xs">ตอบถูกในเวลา ลด {discountPct}%</div>
          <div className="mt-4 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-[28rem] max-w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400">
              {space?.name ?? 'ที่ดิน'} · ค่าเช่า ฿{quiz.rentAmount.toLocaleString()}
              {quiz.landmarkFee > 0 && (
                <span className="text-purple-300"> + 🏛️ ค่าเข้าชม ฿{quiz.landmarkFee.toLocaleString()}</span>
              )}
            </div>
            <div className="text-xs text-yellow-300 mt-0.5">
              ตอบถูกลดค่าเช่า {discountPct}% (เหลือ ฿{(Math.floor(quiz.rentAmount * (100 - discountPct) / 100) + quiz.landmarkFee).toLocaleString()})
            </div>
          </div>
          {!quiz.resolved && quiz.deadlineMs && (
            <div className="text-right">
              <div className={`font-bold text-2xl ${remainingSec <= 3 ? 'text-red-400' : 'text-white'}`}>
                {remainingSec.toFixed(1)}s
              </div>
            </div>
          )}
        </div>

        {/* Timer bar */}
        {!quiz.resolved && (
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all ${remainingSec <= 3 ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
        )}

        {/* Question */}
        <div className="text-white text-base font-medium mb-4 leading-snug">{quiz.question}</div>

        {/* Choices */}
        <div className="space-y-2">
          {quiz.choices.map((choice, idx) => {
            const isPicked = picked === idx || quiz.submittedAnswer === idx;
            const isCorrect = quiz.resolved && quiz.correctIndex === idx;
            const isWrongPick = quiz.resolved && isPicked && !isCorrect;

            let style = 'bg-gray-700 hover:bg-gray-600 text-gray-100';
            if (quiz.resolved) {
              if (isCorrect) style = 'bg-green-600/80 text-white ring-2 ring-green-400';
              else if (isWrongPick) style = 'bg-red-600/80 text-white ring-2 ring-red-400';
              else style = 'bg-gray-700/40 text-gray-500';
            } else if (isPicked) {
              style = 'bg-indigo-600 text-white ring-2 ring-indigo-300';
            } else if (!isMyTurn) {
              style = 'bg-gray-700/60 text-gray-400 cursor-not-allowed';
            }

            return (
              <button
                key={idx}
                onClick={() => answer(idx)}
                disabled={quiz.resolved || picked !== null || !isMyTurn}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition text-sm flex items-center gap-3 ${style}`}
              >
                <span className="font-bold w-5">{['ก','ข','ค','ง','จ'][idx]}.</span>
                <span className="flex-1">{choice}</span>
                {quiz.resolved && isCorrect && <span className="text-lg">✓</span>}
                {quiz.resolved && isWrongPick && <span className="text-lg">✗</span>}
              </button>
            );
          })}
        </div>

        {/* Result banner */}
        {quiz.resolved && (
          <div className={`mt-4 p-3 rounded-lg text-center ${quiz.wasCorrect ? 'bg-green-900/40 border border-green-600/50' : 'bg-red-900/40 border border-red-600/50'}`}>
            <div className={`font-bold text-base ${quiz.wasCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {quiz.wasCorrect ? '🎉 ตอบถูก!' : quiz.submittedAnswer === null ? '⏰ หมดเวลา' : '❌ ตอบผิด'}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              จ่ายค่าเช่า ฿{quiz.finalRent?.toLocaleString()} ให้ {ownerName}
            </div>
          </div>
        )}

        {!isMyTurn && !quiz.resolved && (
          <div className="mt-3 text-xs text-gray-400 text-center">รอผู้เล่นตอบ...</div>
        )}
      </div>
    </div>
  );
}
