export interface Landmark {
  id: string;
  name: string;
  era: 'ancient' | 'new' | 'modern';
  icon: string;
}

export const LANDMARKS: Landmark[] = [
  // ─── 7 Wonders of the Ancient World ────────────────────────────────────────
  { id: 'pyramid',        name: 'มหาพีระมิดแห่งกีซา',         era: 'ancient', icon: '🔺' },
  { id: 'hanging_gardens',name: 'สวนลอยบาบิโลน',              era: 'ancient', icon: '🌿' },
  { id: 'zeus',           name: 'รูปปั้นซุสที่โอลิมเปีย',     era: 'ancient', icon: '⚡' },
  { id: 'artemis',        name: 'วิหารอาร์เทมิส',             era: 'ancient', icon: '🏛️' },
  { id: 'mausoleum',      name: 'สุสานฮาลิคาร์นัสซัส',        era: 'ancient', icon: '⚱️' },
  { id: 'colossus',       name: 'มหาบุรุษแห่งโรดส์',          era: 'ancient', icon: '🗿' },
  { id: 'lighthouse',     name: 'ประภาคารอเล็กซานเดรีย',      era: 'ancient', icon: '🗼' },

  // ─── New 7 Wonders of the World (2007) ─────────────────────────────────────
  { id: 'great_wall',     name: 'กำแพงเมืองจีน',              era: 'new',     icon: '🧱' },
  { id: 'petra',          name: 'นครเปตรา',                   era: 'new',     icon: '🏜️' },
  { id: 'christ_redeemer',name: 'พระเยซูคริสต์ผู้ไถ่บาป',     era: 'new',     icon: '✝️' },
  { id: 'machu_picchu',   name: 'มาชูปิกชู',                  era: 'new',     icon: '⛰️' },
  { id: 'chichen_itza',   name: 'ชิเชนอิตซา',                 era: 'new',     icon: '🛕' },
  { id: 'colosseum',      name: 'โคลอสเซียม',                 era: 'new',     icon: '🏟️' },
  { id: 'taj_mahal',      name: 'ทัชมาฮาล',                   era: 'new',     icon: '🕌' },

  // ─── Modern Engineering Wonders ────────────────────────────────────────────
  { id: 'panama_canal',   name: 'คลองปานามา',                 era: 'modern',  icon: '🚢' },
  { id: 'hoover_dam',     name: 'เขื่อนฮูเวอร์',              era: 'modern',  icon: '🌊' },
  { id: 'iss',            name: 'สถานีอวกาศนานาชาติ',         era: 'modern',  icon: '🛰️' },
  { id: 'burj_khalifa',   name: 'เบิร์จคาลิฟา',               era: 'modern',  icon: '🏙️' },
  { id: 'eiffel',         name: 'หอไอเฟล',                    era: 'modern',  icon: '🗼' },
  { id: 'golden_gate',    name: 'สะพานโกลเดนเกต',             era: 'modern',  icon: '🌉' },
  { id: 'chunnel',        name: 'อุโมงค์ช่องแคบอังกฤษ',       era: 'modern',  icon: '🚇' },
];

export const ERA_LABELS: Record<Landmark['era'], string> = {
  ancient: 'ยุคโบราณ',
  new:     'ยุคใหม่ (2007)',
  modern:  'ยุควิศวกรรมสมัยใหม่',
};
