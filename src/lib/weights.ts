import type { Piece, MaterialGrade } from '../types';

const DENSITY: Record<MaterialGrade, number> = {
  mild_steel: 0.2833,
  stainless: 0.2890,
  aluminum: 0.0975,
};

export function calcWeight(piece: Piece): number {
  const d = DENSITY[piece.grade];
  const { type, width, height, wall, length } = piece;
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
    case 'ibeam': {
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

export function formatWeight(lbs: number): string {
  if (lbs < 0.1) return '< 0.1 lbs';
  return `${lbs.toFixed(2)} lbs`;
}

export function totalWeight(pieces: Piece[]): number {
  return pieces.reduce((sum, p) => sum + calcWeight(p), 0);
}
