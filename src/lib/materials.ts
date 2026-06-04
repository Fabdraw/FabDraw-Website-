import type { MaterialDef, MaterialType } from '../types';

export const SHEET_GAUGES: { gauge: string; mild: number; stainless: number; aluminum: number }[] = [
  { gauge: '30ga', mild: 0.0120, stainless: 0.0125, aluminum: 0.0100 },
  { gauge: '28ga', mild: 0.0149, stainless: 0.0156, aluminum: 0.0126 },
  { gauge: '26ga', mild: 0.0179, stainless: 0.0187, aluminum: 0.0159 },
  { gauge: '24ga', mild: 0.0239, stainless: 0.0250, aluminum: 0.0201 },
  { gauge: '22ga', mild: 0.0299, stainless: 0.0312, aluminum: 0.0253 },
  { gauge: '20ga', mild: 0.0359, stainless: 0.0375, aluminum: 0.0320 },
  { gauge: '19ga', mild: 0.0418, stainless: 0.0437, aluminum: 0.0359 },
  { gauge: '18ga', mild: 0.0478, stainless: 0.0500, aluminum: 0.0403 },
  { gauge: '17ga', mild: 0.0538, stainless: 0.0562, aluminum: 0.0453 },
  { gauge: '16ga', mild: 0.0598, stainless: 0.0625, aluminum: 0.0508 },
  { gauge: '15ga', mild: 0.0673, stainless: 0.0703, aluminum: 0.0571 },
  { gauge: '14ga', mild: 0.0747, stainless: 0.0781, aluminum: 0.0641 },
  { gauge: '13ga', mild: 0.0897, stainless: 0.0937, aluminum: 0.0720 },
  { gauge: '12ga', mild: 0.1046, stainless: 0.1093, aluminum: 0.0808 },
  { gauge: '11ga', mild: 0.1196, stainless: 0.1250, aluminum: 0.0907 },
  { gauge: '10ga', mild: 0.1345, stainless: 0.1406, aluminum: 0.1019 },
  { gauge: '9ga',  mild: 0.1495, stainless: 0.1562, aluminum: 0.1144 },
  { gauge: '8ga',  mild: 0.1644, stainless: 0.1718, aluminum: 0.1285 },
  { gauge: '7ga',  mild: 0.1793, stainless: 0.1875, aluminum: 0.1443 },
];

export const SHEET_PRESETS = ['36x48','36x96','48x48','48x96','48x120','48x144','60x120','72x96','72x144','Custom'];

export const MATERIALS: Record<MaterialType, MaterialDef> = {
  square_tube: {
    type: 'square_tube',
    label: 'Square Tube',
    sizes: ['1x1', '1.5x1.5', '2x2', '2.5x2.5', '3x3', '4x4', '5x5', '6x6'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#4a90d9',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="32" height="18" rx="0.5" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
      <rect x="6" y="5" width="24" height="12" rx="0.5" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  round_tube: {
    type: 'round_tube',
    label: 'Round Tube',
    sizes: ['0.75', '1', '1.25', '1.5', '2', '2.5', '3', '4'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#7c6fcd',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="11" r="9" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
      <circle cx="18" cy="11" r="5.5" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  rect_tube: {
    type: 'rect_tube',
    label: 'Rect Tube',
    sizes: ['1x2', '1x3', '1.5x3', '2x3', '2x4', '2x6', '3x4', '3x6'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#5aadad',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="34" height="14" rx="0.5" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
      <rect x="5" y="7" width="26" height="8" rx="0.5" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  pipe: {
    type: 'pipe',
    label: 'Pipe',
    sizes: ['0.5"NPS', '0.75"NPS', '1"NPS', '1.25"NPS', '1.5"NPS', '2"NPS', '3"NPS', '4"NPS'],
    walls: [0.109, 0.113, 0.133, 0.140, 0.145, 0.154, 0.216, 0.237],
    color: '#a0796f',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="11" r="9" stroke="rgba(148,163,184,0.8)" stroke-width="3" fill="none"/>
      <circle cx="18" cy="11" r="4" stroke="rgba(148,163,184,0.8)" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  angle: {
    type: 'angle',
    label: 'Angle Iron',
    sizes: ['1x1', '1.25x1.25', '1.5x1.5', '2x2', '2.5x2.5', '3x3', '4x4', '3x2', '4x3'],
    walls: [0.125, 0.188, 0.250, 0.375],
    color: '#d4a843',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 4 18 L 4 4 L 8 4 L 8 14 L 32 14 L 32 18 Z" fill="rgba(212,168,67,0.3)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
    </svg>`,
  },
  channel: {
    type: 'channel',
    label: 'C-Channel',
    sizes: ['C3x4.1', 'C4x5.4', 'C5x6.7', 'C6x8.2', 'C8x11.5', 'C10x15.3', 'C12x20.7'],
    walls: [0.170, 0.180, 0.190, 0.200, 0.220, 0.240, 0.280],
    color: '#7aad6f',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="4" height="14" fill="rgba(122,173,111,0.3)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <rect x="4" y="4" width="24" height="4" fill="rgba(122,173,111,0.3)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <rect x="4" y="14" width="24" height="4" fill="rgba(122,173,111,0.3)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
    </svg>`,
  },
  ibeam: {
    type: 'ibeam',
    label: 'I-Beam',
    sizes: ['W4x13', 'W5x16', 'W6x20', 'W8x24', 'W10x33', 'W12x40', 'W14x48', 'W16x57'],
    walls: [0.230, 0.240, 0.250, 0.245, 0.290, 0.295, 0.285, 0.295],
    color: '#e07070',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="32" height="4" fill="rgba(224,112,112,0.5)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <rect x="15" y="7" width="6" height="8" fill="rgba(224,112,112,0.5)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <rect x="2" y="15" width="32" height="4" fill="rgba(224,112,112,0.5)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
    </svg>`,
  },
  flat_bar: {
    type: 'flat_bar',
    label: 'Flat Bar',
    sizes: ['1/4x1', '1/4x1.5', '1/4x2', '3/8x2', '1/2x2', '1/2x3', '1/2x4', '1x2', '1x4'],
    walls: [0.25, 0.375, 0.5],
    color: '#94a3b8',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="8" width="32" height="6" rx="0.5" fill="rgba(148,163,184,0.4)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
    </svg>`,
  },
  sheet: {
    type: 'sheet',
    label: 'Sheet Metal',
    sizes: ['12x24', '24x24', '24x48', '36x48', '48x48', '48x96'],
    walls: [0.036, 0.048, 0.060, 0.075, 0.090, 0.105, 0.120],
    color: '#60a0e0',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="9" width="32" height="3" fill="rgba(96,160,224,0.5)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <line x1="8" y1="7" x2="8" y2="14" stroke="rgba(148,163,184,0.8)" stroke-width="1"/>
      <line x1="14" y1="7" x2="14" y2="14" stroke="rgba(148,163,184,0.8)" stroke-width="1"/>
      <line x1="20" y1="7" x2="20" y2="14" stroke="rgba(148,163,184,0.8)" stroke-width="1"/>
      <line x1="26" y1="7" x2="26" y2="14" stroke="rgba(148,163,184,0.8)" stroke-width="1"/>
    </svg>`,
  },
  plate: {
    type: 'plate',
    label: 'Plate',
    sizes: ['6x6', '6x12', '12x12', '12x24', '24x24', '24x48'],
    walls: [0.125, 0.188, 0.250, 0.375, 0.500, 0.750, 1.0],
    color: '#708090',
    svgIcon: `<svg width="36" height="22" viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="32" height="8" fill="rgba(112,128,144,0.6)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
    </svg>`,
  },
};

export const parseSizeString = (type: MaterialType, sizeStr: string): { width: number; height: number } => {
  if (type === 'square_tube') {
    const v = parseFloat(sizeStr);
    return { width: v, height: v };
  }
  if (type === 'round_tube' || type === 'pipe') {
    const v = parseFloat(sizeStr);
    return { width: v, height: v };
  }
  if (type === 'rect_tube' || type === 'sheet' || type === 'plate') {
    const parts = sizeStr.split('x');
    return { width: parseFloat(parts[0]), height: parseFloat(parts[1]) };
  }
  if (type === 'angle') {
    const parts = sizeStr.split('x');
    const v = parseFloat(parts[0]);
    return { width: v, height: v };
  }
  if (type === 'channel') {
    const match = sizeStr.match(/C(\d+)/);
    const d = match ? parseFloat(match[1]) : 4;
    return { width: d * 0.6, height: d };
  }
  if (type === 'ibeam') {
    const match = sizeStr.match(/W(\d+)/);
    const d = match ? parseFloat(match[1]) : 6;
    return { width: d * 0.6, height: d };
  }
  if (type === 'flat_bar') {
    const parts = sizeStr.split('x');
    const wStr = parts[0];
    let w = 0;
    if (wStr.includes('/')) {
      const frac = wStr.split('/');
      w = parseFloat(frac[0]) / parseFloat(frac[1]);
    } else {
      w = parseFloat(wStr);
    }
    return { width: parseFloat(parts[1]), height: w };
  }
  return { width: 2, height: 2 };
};
