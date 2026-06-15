import type { Member, Grade } from '../types';

const DENSITY: Record<Grade, number> = {
  mild: 0.2833,
  stainless: 0.2890,
  aluminum: 0.0975,
};

export function calcWeight(member: Member): number {
  const d = DENSITY[member.grade];
  const { type, size, wallThickness, length } = member;
  const wall = parseFloat(wallThickness) || 0.125;
  const { width, height } = parseMemberSize(type, size);
  let area = 0;

  switch (type) {
    case 'square_tube': {
      const outer = width * height;
      const inner = (width - 2 * wall) * (height - 2 * wall);
      area = outer - Math.max(0, inner);
      break;
    }
    case 'round_tube':
    case 'pipe': {
      const outerR = width / 2;
      const innerR = outerR - wall;
      area = Math.PI * (outerR * outerR - Math.max(0, innerR * innerR));
      break;
    }
    case 'rect_tube': {
      const outer = width * height;
      const inner = (width - 2 * wall) * (height - 2 * wall);
      area = outer - Math.max(0, inner);
      break;
    }
    case 'angle': {
      area = 2 * width * wall - wall * wall;
      break;
    }
    case 'channel': {
      area = width * wall * 2 + (height - 2 * wall) * wall;
      break;
    }
    case 'i_beam': {
      area = width * wall * 2 + (height - 2 * wall) * wall;
      break;
    }
    case 'flat_bar': {
      area = width * height;
      break;
    }
    case 'sheet':
    case 'plate': {
      area = width * wall;
      break;
    }
    default:
      area = width * height;
  }

  return area * length * d;
}

function parseMemberSize(type: string, sizeStr: string): { width: number; height: number } {
  if (type === 'square_tube') {
    const parts = sizeStr.split('x');
    if (parts.length === 2) return { width: parseFloat(parts[0]), height: parseFloat(parts[1]) };
    const v = parseFloat(sizeStr);
    return { width: v, height: v };
  }
  if (type === 'round_tube' || type === 'pipe') {
    const v = parseFloat(sizeStr);
    return { width: v, height: v };
  }
  if (type === 'rect_tube' || type === 'sheet' || type === 'plate') {
    const parts = sizeStr.split('x');
    return { width: parseFloat(parts[0] || '2'), height: parseFloat(parts[1] || '2') };
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
  if (type === 'i_beam') {
    const match = sizeStr.match(/W(\d+)/);
    const d = match ? parseFloat(match[1]) : 6;
    return { width: d * 0.6, height: d };
  }
  if (type === 'flat_bar') {
    const parts = sizeStr.split('x');
    const wStr = parts[0];
    let w = 0;
    if (wStr && wStr.includes('/')) {
      const frac = wStr.split('/');
      w = parseFloat(frac[0]) / parseFloat(frac[1]);
    } else {
      w = parseFloat(wStr || '1');
    }
    return { width: parseFloat(parts[1] || '2'), height: w };
  }
  return { width: 2, height: 2 };
}

export function formatWeight(lbs: number): string {
  if (lbs < 0.1) return '< 0.1 lbs';
  return `${lbs.toFixed(2)} lbs`;
}

export function totalWeight(members: Member[]): number {
  return members.reduce((sum, m) => sum + calcWeight(m), 0);
}
