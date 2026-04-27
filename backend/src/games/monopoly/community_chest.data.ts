import type { ChanceCard } from './monopoly.types';

export const COMMUNITY_CHEST_CARDS: ChanceCard[] = [
  { id: 'cc01', text: 'รับเงินประกันชีวิต ฿1,000',          effect: { type: 'collect',      amount: 1000 } },
  { id: 'cc02', text: 'จ่ายค่ารักษาพยาบาล ฿500',           effect: { type: 'pay',          amount: 500  } },
  { id: 'cc03', text: 'รับเงินปันผลหุ้น ฿500',              effect: { type: 'collect',      amount: 500  } },
  { id: 'cc04', text: 'ถูกปรับจอดรถผิดที่ ฿200',            effect: { type: 'pay',          amount: 200  } },
  { id: 'cc05', text: 'รับรางวัลประกวด ฿1,500',             effect: { type: 'collect',      amount: 1500 } },
  { id: 'cc06', text: 'จ่ายค่าซ่อมบ้าน ฿800',              effect: { type: 'pay',          amount: 800  } },
  { id: 'cc07', text: 'รับภาษีคืนจากรัฐ ฿2,000',           effect: { type: 'collect',      amount: 2000 } },
  { id: 'cc08', text: 'จ่ายค่าธรรมเนียมโรงเรียน ฿1,000',  effect: { type: 'pay',          amount: 1000 } },
  { id: 'cc09', text: 'ทุกคนจ่ายให้คุณคนละ ฿200',          effect: { type: 'collect_each', amount: 200  } },
  { id: 'cc10', text: 'จ่ายให้ทุกคนคนละ ฿150',             effect: { type: 'pay_each',     amount: 150  } },
  { id: 'cc11', text: 'กลับไป GO รับเงินผ่าน GO',           effect: { type: 'move_to',      position: 0  } },
  { id: 'cc12', text: 'ไปคุกทันที ไม่ผ่าน GO',              effect: { type: 'go_to_jail'                 } },
];
