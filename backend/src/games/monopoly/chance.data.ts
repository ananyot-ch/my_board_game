import type { ChanceCard } from './monopoly.types';

export const CHANCE_CARDS: ChanceCard[] = [
  { id: 'c01', text: 'กลับไปจุดเริ่มต้น รับเงินผ่าน GO',             effect: { type: 'move_to', position: 0 } },
  { id: 'c02', text: 'ไปคุกทันที ไม่ผ่าน GO',                        effect: { type: 'go_to_jail' } },
  { id: 'c03', text: 'ธนาคารจ่ายเงินปันผล รับ ฿500',                 effect: { type: 'collect', amount: 500 } },
  { id: 'c04', text: 'รางวัลชนะเลิศ รับ ฿1,000',                     effect: { type: 'collect', amount: 1000 } },
  { id: 'c05', text: 'คืนภาษีอากร รับ ฿1,500',                       effect: { type: 'collect', amount: 1500 } },
  { id: 'c06', text: 'รับค่าสินไหมประกัน รับ ฿2,000',                effect: { type: 'collect', amount: 2000 } },
  { id: 'c07', text: 'โบนัสพิเศษจากรัฐบาล รับ ฿3,000',              effect: { type: 'collect', amount: 3000 } },
  { id: 'c08', text: 'จ่ายค่าธรรมเนียมศาล ฿500',                    effect: { type: 'pay', amount: 500 } },
  { id: 'c09', text: 'จ่ายภาษีทรัพย์สิน ฿1,000',                    effect: { type: 'pay', amount: 1000 } },
  { id: 'c10', text: 'ค่าซ่อมแซมที่พัก ฿800',                        effect: { type: 'pay', amount: 800 } },
  { id: 'c11', text: 'ค่าเล่าเรียนบุตร ฿1,200',                      effect: { type: 'pay', amount: 1200 } },
  { id: 'c12', text: 'คุณเป็นประธาน — จ่ายให้ทุกคนคนละ ฿500',       effect: { type: 'pay_each', amount: 500 } },
  { id: 'c13', text: 'วันเกิดคุณ — รับจากทุกคนคนละ ฿300',            effect: { type: 'collect_each', amount: 300 } },
  { id: 'c14', text: 'เดินหน้า 3 ช่อง',                              effect: { type: 'move_steps', steps: 3 } },
  { id: 'c15', text: 'ถอยหลัง 3 ช่อง',                               effect: { type: 'move_steps', steps: -3 } },
  { id: 'c16', text: 'ไปสถานีรถไฟที่ใกล้ที่สุด',                    effect: { type: 'nearest_railroad' } },
  { id: 'c17', text: 'ไปสาธารณูปโภคที่ใกล้ที่สุด',                  effect: { type: 'nearest_utility' } },
];
