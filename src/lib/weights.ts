import type { Piece, MaterialGrade } from '../types'
import { getOD, getHeight, getWall } from './materials'

const DENSITY: Record<MaterialGrade, number> = {
  mild_steel: 0.2833,
  stainless: 0.2890,
  aluminum: 0.0975,
}

export function calcWeight(piece: Piece): number {
  const d = DENSITY[piece.material]
  const { type, sizeIdx, thkIdx, length, customW, customH } = piece
  const t = getWall(type, thkIdx)
  const od = getOD(type, sizeIdx)
  const h = getHeight(type, sizeIdx)
  let area = 0

  switch (type) {
    case 'square_tube': { const s=od; area=(s*s)-((s-2*t)*(s-2*t)); break }
    case 'round_tube': case 'pipe': { const r=od/2; area=Math.PI*(r*r-(r-t)*(r-t)); break }
    case 'rect_tube': { const w2=od; area=(w2*h)-((w2-2*t)*(h-2*t)); break }
    case 'angle': { area=2*od*t-t*t; break }
    case 'flat_bar': { area=od*t; break }
    case 'channel': { area=od*t*2.5; break }
    case 'ibeam': { area=od*t*3.0; break }
    case 'sheet': case 'plate': { return (customW??48)*(customH??48)*t*d }
    default: area=od*t
  }
  return area * length * d
}

export function formatWeight(lbs: number): string {
  if (lbs < 0.01) return '< 0.01 lbs'
  return `${lbs.toFixed(2)} lbs`
}

export function totalWeight(pieces: Piece[]): number {
  return pieces.reduce((s,p) => s+calcWeight(p), 0)
}
