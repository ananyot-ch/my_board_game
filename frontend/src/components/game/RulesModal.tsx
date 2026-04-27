interface Props {
  onClose: () => void;
}

export default function RulesModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📖 คู่มือเกมเศรษฐี
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 text-sm text-gray-200">

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🎯 เป้าหมาย</h3>
            <p className="text-gray-300 leading-relaxed">
              เป็นผู้เล่นคนสุดท้ายที่ไม่ล้มละลาย ใครเงินหมด + ทรัพย์สินหมด = แพ้
            </p>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🎲 การเล่น</h3>
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside leading-relaxed">
              <li>ทอย <b className="text-white">ลูกเต๋า 3 ลูก</b> เดินตามผลรวม (3-18 ช่อง)</li>
              <li>เริ่มต้นคนละ <b className="text-white">฿15,000</b> · ผ่าน GO รับ <b className="text-white">฿2,000</b></li>
              <li>ตกช่องที่ดินว่าง → เลือก <b className="text-green-300">ซื้อ</b> หรือ <b className="text-gray-300">ปฏิเสธ</b></li>
              <li>ตกช่องที่ดินคนอื่น → จ่ายค่าเช่า</li>
              <li>เงินไม่พอจ่าย → เข้าโหมด <b className="text-yellow-300">ขายทรัพย์สิน</b> (ครึ่งราคา) หรือยอมแพ้</li>
            </ul>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">💰 ค่าเช่า</h3>
            <div className="bg-gray-900/50 rounded-lg p-3 space-y-2 text-gray-300">
              <p><b className="text-white">ที่ดิน:</b> 4% ของราคาที่ดิน · ครองครบกลุ่มสีเดียว = ค่าเช่า ×2</p>
              <p><b className="text-white">รถไฟ:</b> ครอง 1/2/3/4 สถานี → ฿250 / ฿500 / ฿750 / ฿1,000</p>
              <p><b className="text-white">สาธารณูปโภค:</b> ครอง 1 ช่อง = แต้มลูกเต๋า ×4 · ครอง 2 ช่อง = แต้มลูกเต๋า ×10</p>
            </div>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🚔 คุก</h3>
            <p className="text-gray-300 leading-relaxed">
              ตกช่อง <b className="text-white">"ไปคุก"</b> หรือจั่วการ์ดสั่งเข้าคุก → ย้ายไปช่องคุก ข้ามตาถัดไป 1 รอบ
            </p>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🃏 การ์ด</h3>
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside leading-relaxed">
              <li><b className="text-yellow-300">โชค</b> & <b className="text-blue-300">กองทุนชุมชน</b> — รับ/จ่ายเงิน, เดิน, ไปคุก ฯลฯ</li>
              <li>โฮสต์เลือกเปิด/ปิดการ์ดแต่ละใบในหน้าตั้งค่าได้</li>
            </ul>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🧠 โหมดควิซ (ถ้าเปิด)</h3>
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside leading-relaxed">
              <li>ก่อนจ่ายค่าเช่า ระบบจะสุ่มคำถาม 4 ตัวเลือก</li>
              <li>ตอบถูกภายในเวลาที่กำหนด → <b className="text-green-300">ลดค่าเช่า</b> ตามเปอร์เซ็นต์ที่ตั้งไว้</li>
              <li>ตอบผิดหรือหมดเวลา → จ่ายเต็มจำนวน</li>
            </ul>
          </section>

          <section>
            <h3 className="text-indigo-400 font-semibold mb-2">🏛️ ภาษี & ช่องอื่น</h3>
            <ul className="space-y-1.5 text-gray-300 list-disc list-inside leading-relaxed">
              <li><b className="text-white">ภาษีเงินได้</b> ฿500 · <b className="text-white">ภาษีทรัพย์สิน</b> ฿2,000</li>
              <li><b className="text-white">จอดพัก</b> และ <b className="text-white">เยี่ยมคุก</b> — ไม่มีผลใดๆ</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 shrink-0 text-center">
          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2 rounded-lg transition"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
