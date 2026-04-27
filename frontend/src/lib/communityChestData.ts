export interface CommunityChestCard {
  id: string;
  text: string;
}

export const COMMUNITY_CHEST_CARDS: CommunityChestCard[] = [
  { id: 'cc01', text: 'รับเงินประกันชีวิต ฿1,000' },
  { id: 'cc02', text: 'จ่ายค่ารักษาพยาบาล ฿500' },
  { id: 'cc03', text: 'รับเงินปันผลหุ้น ฿500' },
  { id: 'cc04', text: 'ถูกปรับจอดรถผิดที่ ฿200' },
  { id: 'cc05', text: 'รับรางวัลประกวด ฿1,500' },
  { id: 'cc06', text: 'จ่ายค่าซ่อมบ้าน ฿800' },
  { id: 'cc07', text: 'รับภาษีคืนจากรัฐ ฿2,000' },
  { id: 'cc08', text: 'จ่ายค่าธรรมเนียมโรงเรียน ฿1,000' },
  { id: 'cc09', text: 'ทุกคนจ่ายให้คุณคนละ ฿200' },
  { id: 'cc10', text: 'จ่ายให้ทุกคนคนละ ฿150' },
  { id: 'cc11', text: 'กลับไป GO รับเงินผ่าน GO' },
  { id: 'cc12', text: 'ไปคุกทันที ไม่ผ่าน GO' },
];
