import type { Piece } from '../types'

const DENSITY: Record<string, number> = {
  mild_steel: 0.2833,
  stainless: 0.2890,
  aluminum: 0.0975,
}

export function calcWeight(piece: Piece, sizeValue: number | number[], wall: number): number {
  const d = DENSITY[piece.material] ?? 0.2833
  const len = piece.length
  const t = wall

  switch (piece.type) {
    case 'square_tube': {
      const s = sizeValue as number
      return ((s * s) - (s - 2 * t) * (s - 2 * t)) * len * d
    }
    case 'round_tube':
    case 'pipe': {
      const od = sizeValue as number
      const r = od / 2, ri = r - t
      return Math.PI * (r * r - ri * ri) * len * d
    }
    case 'rect_tube': {
      const [w, h] = sizeValue as number[]
      return (w * h - (w - 2 * t) * (h - 2 * t)) * len * d
    }
    case 'angle': {
      const s = sizeValue as number
      return (2 * s * t - t * t) * len * d
    }
    case 'flat_bar': {
      const s = sizeValue as number
      return s * t * len * d
    }
    case 'channel': {
      const s = sizeValue as number
      return s * t * 2.5 * len * d
    }
    case 'ibeam': {
      const s = sizeValue as number
      return s * t * 3.0 * len * d
    }
    case 'sheet':
    case 'plate': {
      return piece.customW * piece.customH * t * d
    }
    default: return 0
  }
}
