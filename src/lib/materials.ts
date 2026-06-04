import type { MaterialDef, MaterialType } from '../types';

export const MATERIALS: Record<MaterialType, MaterialDef> = {
  square_tube: {
    type: 'square_tube',
    label: 'Square Tube',
    sizes: ['1x1', '1.5x1.5', '2x2', '2.5x2.5', '3x3', '4x4', '5x5', '6x6'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#4a90d9',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="28" rx="1" stroke="#94a3b8" stroke-width="2.5" fill="none"/>
      <rect x="7" y="7" width="18" height="18" rx="0.5" stroke="#64748b" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  round_tube: {
    type: 'round_tube',
    label: 'Round Tube',
    sizes: ['0.75', '1', '1.25', '1.5', '2', '2.5', '3', '4'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#7c6fcd',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="13" stroke="#94a3b8" stroke-width="2.5" fill="none"/>
      <circle cx="16" cy="16" r="8" stroke="#64748b" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  rect_tube: {
    type: 'rect_tube',
    label: 'Rect Tube',
    sizes: ['1x2', '1x3', '1.5x3', '2x3', '2x4', '2x6', '3x4', '3x6'],
    walls: [0.065, 0.083, 0.095, 0.120, 0.125, 0.188, 0.250],
    color: '#5aadad',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="28" height="18" rx="1" stroke="#94a3b8" stroke-width="2.5" fill="none"/>
      <rect x="7" y="12" width="18" height="8" rx="0.5" stroke="#64748b" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  pipe: {
    type: 'pipe',
    label: 'Pipe',
    sizes: ['0.5"NPS', '0.75"NPS', '1"NPS', '1.25"NPS', '1.5"NPS', '2"NPS', '3"NPS', '4"NPS'],
    walls: [0.109, 0.113, 0.133, 0.140, 0.145, 0.154, 0.216, 0.237],
    color: '#a0796f',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="13" stroke="#94a3b8" stroke-width="3.5" fill="none"/>
      <circle cx="16" cy="16" r="7" stroke="#64748b" stroke-width="1" fill="none"/>
    </svg>`,
  },
  angle: {
    type: 'angle',
    label: 'Angle Iron',
    sizes: ['1x1', '1.25x1.25', '1.5x1.5', '2x2', '2.5x2.5', '3x3', '4x4', '3x2', '4x3'],
    walls: [0.125, 0.188, 0.250, 0.375],
    color: '#d4a843',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="4,4 4,28 28,28" stroke="#94a3b8" stroke-width="5" fill="none" stroke-linecap="square"/>
      <polyline points="8,4 8,24 28,24" stroke="#64748b" stroke-width="1" fill="none"/>
    </svg>`,
  },
  channel: {
    type: 'channel',
    label: 'C-Channel',
    sizes: ['C3x4.1', 'C4x5.4', 'C5x6.7', 'C6x8.2', 'C8x11.5', 'C10x15.3', 'C12x20.7'],
    walls: [0.170, 0.180, 0.190, 0.200, 0.220, 0.240, 0.280],
    color: '#7aad6f',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="28,4 4,4 4,28 28,28" stroke="#94a3b8" stroke-width="4" fill="none" stroke-linecap="square"/>
      <polyline points="26,8 8,8 8,24 26,24" stroke="#64748b" stroke-width="1" fill="none"/>
    </svg>`,
  },
  ibeam: {
    type: 'ibeam',
    label: 'I-Beam',
    sizes: ['W4x13', 'W5x16', 'W6x20', 'W8x24', 'W10x33', 'W12x40', 'W14x48', 'W16x57'],
    walls: [0.230, 0.240, 0.250, 0.245, 0.290, 0.295, 0.285, 0.295],
    color: '#e07070',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="5" fill="#94a3b8"/>
      <rect x="2" y="25" width="28" height="5" fill="#94a3b8"/>
      <rect x="13" y="7" width="6" height="18" fill="#94a3b8"/>
    </svg>`,
  },
  flat_bar: {
    type: 'flat_bar',
    label: 'Flat Bar',
    sizes: ['1/4x1', '1/4x1.5', '1/4x2', '3/8x2', '1/2x2', '1/2x3', '1/2x4', '1x2', '1x4'],
    walls: [0.25, 0.375, 0.5],
    color: '#94a3b8',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="11" width="28" height="10" rx="1" fill="#64748b" stroke="#94a3b8" stroke-width="1.5"/>
    </svg>`,
  },
  sheet: {
    type: 'sheet',
    label: 'Sheet Metal',
    sizes: ['12x24', '24x24', '24x48', '36x48', '48x48', '48x96'],
    walls: [0.036, 0.048, 0.060, 0.075, 0.090, 0.105, 0.120],
    color: '#60a0e0',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="28" rx="1" fill="rgba(96,160,224,0.2)" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="2" y1="8" x2="8" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="8" y1="8" x2="14" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="14" y1="8" x2="20" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="20" y1="8" x2="26" y2="2" stroke="#64748b" stroke-width="1"/>
    </svg>`,
  },
  plate: {
    type: 'plate',
    label: 'Plate',
    sizes: ['6x6', '6x12', '12x12', '12x24', '24x24', '24x48'],
    walls: [0.125, 0.188, 0.250, 0.375, 0.500, 0.750, 1.0],
    color: '#708090',
    svgIcon: `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="28" height="28" rx="1" fill="#4a5568" stroke="#94a3b8" stroke-width="1.5"/>
      <line x1="2" y1="10" x2="10" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="2" y1="18" x2="18" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="2" y1="26" x2="26" y2="2" stroke="#64748b" stroke-width="1"/>
      <line x1="10" y1="30" x2="30" y2="10" stroke="#64748b" stroke-width="1"/>
      <line x1="18" y1="30" x2="30" y2="18" stroke="#64748b" stroke-width="1"/>
      <line x1="26" y1="30" x2="30" y2="26" stroke="#64748b" stroke-width="1"/>
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
