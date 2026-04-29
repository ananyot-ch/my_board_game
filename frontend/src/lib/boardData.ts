import type { BoardSpace, PropertyGroup } from '../types/game';

const HOUSE_COST: Record<PropertyGroup, number> = {
  brown:      500,
  light_blue: 800,
  pink:       1000,
  orange:     1200,
  red:        1500,
  yellow:     1800,
  green:      2000,
  dark_blue:  2500,
};

function rentArr(price: number): number[] {
  const r = (x: number) => Math.round(x / 10) * 10;
  return [r(price * 0.04), r(price * 0.20), r(price * 0.60), r(price * 1.50), r(price * 2.50), r(price * 3.50)];
}

function prop(id: number, name: string, group: PropertyGroup, price: number): BoardSpace {
  return { id, name, type: 'property', group, price, rent: rentArr(price), houseCost: HOUSE_COST[group] };
}

const RAIL_RENT = [250, 500, 750, 1000];

export const BOARD: BoardSpace[] = [
  { id: 0,  name: 'จุดเริ่มต้น',      type: 'go' },
  prop(1,   'ลำปาง',                  'brown',      600),
  prop(2,   'นครสวรรค์',              'brown',      700),
  { id: 3,  name: 'กองทุนชุมชน',      type: 'community_chest' },
  prop(4,   'หัวหิน',                 'brown',      1000),
  prop(5,   'ชะอำ',                   'brown',      1100),
  { id: 6,  name: 'ภาษีเงินได้',      type: 'tax', amount: 500 },
  prop(7,   'พัทยา',                  'brown',      1200),
  prop(8,   'ตราด',                   'light_blue', 1300),
  { id: 9,  name: 'รถไฟสายเหนือ',     type: 'railroad', price: 2000, rent: RAIL_RENT },
  prop(10,  'ระยอง',                  'light_blue', 1400),
  prop(11,  'ชลบุรี',                 'light_blue', 1500),
  { id: 12, name: 'โชค',              type: 'chance' },
  prop(13,  'บางแสน',                 'light_blue', 1600),
  prop(14,  'ศรีราชา',                'light_blue', 1700),
  { id: 15, name: 'คุก',              type: 'jail' },
  prop(16,  'ภูเก็ต',                 'pink',       1800),
  prop(17,  'กระบี่',                 'pink',       1900),
  prop(18,  'เกาะสมุย',               'pink',       2000),
  { id: 19, name: 'บ.ไฟฟ้า',          type: 'utility', price: 1500 },
  prop(20,  'อยุธยา',                 'pink',       2200),
  prop(21,  'ราชบุรี',                'pink',       2300),
  prop(22,  'กาญจนบุรี',              'orange',     2400),
  { id: 23, name: 'รถไฟสายใต้',       type: 'railroad', price: 2000, rent: RAIL_RENT },
  prop(24,  'หาดใหญ่',                'orange',     2500),
  prop(25,  'ตรัง',                   'orange',     2600),
  prop(26,  'สุราษฎร์ฯ',              'orange',     2700),
  { id: 27, name: 'กองทุนชุมชน',      type: 'community_chest' },
  prop(28,  'นครศรีฯ',                'orange',     2800),
  prop(29,  'สงขลา',                  'orange',     2900),
  { id: 30, name: 'จอดพัก',           type: 'free_parking' },
  prop(31,  'ขอนแก่น',                'red',        3000),
  prop(32,  'อุบลฯ',                  'red',        3100),
  prop(33,  'โคราช',                  'red',        3200),
  { id: 34, name: 'โชค',              type: 'chance' },
  prop(35,  'เชียงใหม่',              'red',        3400),
  prop(36,  'เชียงราย',               'red',        3500),
  prop(37,  'สุโขทัย',                'yellow',     3600),
  { id: 38, name: 'รถไฟสายอีสาน',     type: 'railroad', price: 2000, rent: RAIL_RENT },
  prop(39,  'แม่ฮ่องสอน',             'yellow',     3700),
  prop(40,  'น่าน',                   'yellow',     3800),
  prop(41,  'แพร่',                   'yellow',     3900),
  { id: 42, name: 'บ.ประปา',          type: 'utility', price: 1500 },
  prop(43,  'ลำพูน',                  'yellow',     4000),
  prop(44,  'พะเยา',                  'yellow',     4100),
  { id: 45, name: 'ไปคุก',            type: 'go_to_jail' },
  prop(46,  'นิมมาน',                 'green',      4200),
  prop(47,  'นครราชสีมา',             'green',      4300),
  { id: 48, name: 'กองทุนชุมชน',      type: 'community_chest' },
  prop(49,  'อุดรธานี',               'green',      4400),
  { id: 50, name: 'รถไฟสายกลาง',      type: 'railroad', price: 2000, rent: RAIL_RENT },
  prop(51,  'สีลม',                   'green',      4600),
  prop(52,  'สุขุมวิท',               'green',      4700),
  { id: 53, name: 'โชค',              type: 'chance' },
  prop(54,  'เอกมัย',                 'dark_blue',  4800),
  prop(55,  'ทองหล่อ',                'dark_blue',  4900),
  { id: 56, name: 'ภาษีทรัพย์สิน',    type: 'tax', amount: 2000 },
  prop(57,  'เพลินจิต',               'dark_blue',  5000),
  prop(58,  'ราชประสงค์',             'dark_blue',  5200),
  prop(59,  'ชิดลม',                  'dark_blue',  5500),
];

export const GROUP_COLORS: Record<string, string> = {
  brown:      '#92400e',
  light_blue: '#38bdf8',
  pink:       '#f472b6',
  orange:     '#fb923c',
  red:        '#ef4444',
  yellow:     '#facc15',
  green:      '#22c55e',
  dark_blue:  '#3b82f6',
};

export const SPACE_ICONS: Record<string, string> = {
  go:              '↗',
  jail:            '🔒',
  free_parking:    'P',
  go_to_jail:      '👮',
  community_chest: '📦',
  chance:          '?',
  railroad:        '🚂',
  utility:         '⚡',
  tax:             '💸',
};

/** Returns CSS grid column and row (1-indexed) for a space id on a 16×16 board (60 spaces) */
export function getGridPos(id: number): { col: number; row: number } {
  if (id === 0)             return { col: 16,      row: 16 };
  if (id <= 14)             return { col: 16 - id, row: 16 };       // bottom row, right→left
  if (id === 15)            return { col: 1,       row: 16 };
  if (id <= 29)             return { col: 1,       row: 31 - id };  // left col, bottom→top
  if (id === 30)            return { col: 1,       row: 1  };
  if (id <= 44)             return { col: id - 29, row: 1  };       // top row, left→right
  if (id === 45)            return { col: 16,      row: 1  };
  return                            { col: 16,      row: id - 44 }; // right col, top→bottom
}
