import type { Piece } from '../types'
import { getMaterial, getSizeValue } from './materials'

export const SCALE = 8
export const SNAP_DIST = 20

export function worldToCanvas(wx: number, wy: number, panX: number, panY: number, zoom: number): [number, number] {
  return [wx * SCALE * zoom + panX, wy * SCALE * zoom + panY]
}

export function canvasToWorld(cx: number, cy: number, panX: number, panY: number, zoom: number): [number, number] {
  return [(cx - panX) / (SCALE * zoom), (cy - panY) / (SCALE * zoom)]
}

export function getOD(type: string, sizeValue: number | number[]): number {
  if (Array.isArray(sizeValue)) return Math.max(sizeValue[0], sizeValue[1])
  return sizeValue as number
}

export function getVisualHeight(type: string, sizeValue: number | number[], customH: number, zoom: number): number {
  if (type === 'sheet' || type === 'plate') return Math.max(16, customH * SCALE * zoom)
  if (type === 'flat_bar') {
    const s = Array.isArray(sizeValue) ? sizeValue[0] : sizeValue
    return Math.max(5, s * SCALE * zoom * 0.25)
  }
  if (type === 'angle') {
    const s = Array.isArray(sizeValue) ? sizeValue[0] : sizeValue
    return Math.max(8, s * SCALE * zoom)
  }
  const od = Array.isArray(sizeValue) ? Math.min(sizeValue[0], sizeValue[1]) : sizeValue
  return Math.max(10, od * SCALE * zoom)
}

export function getWallPx(wall: number, zoom: number): number {
  return Math.max(2, wall * SCALE * zoom)
}

export interface SnapPoint {
  x: number
  y: number
  label: string
  color: string
  pieceId: string
  endpoint: string
}

export function getSnapPoints(piece: Piece, sizeValue: number | number[], panX: number, panY: number, zoom: number): SnapPoint[] {
  const [cx, cy] = worldToCanvas(piece.x, piece.y, panX, panY, zoom)
  if (piece.type === 'sheet' || piece.type === 'plate') {
    const hw = piece.customW / 2 * SCALE * zoom
    const hh = piece.customH / 2 * SCALE * zoom
    const rad = piece.angle * Math.PI / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
    const mids: [number, number][] = [[0, -hh], [hw, 0], [0, hh], [-hw, 0]]
    const pts: SnapPoint[] = []
    corners.forEach(([dx, dy], i) => {
      pts.push({ x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos, label: `Corner ${i + 1}`, color: '#f97316', pieceId: piece.id, endpoint: `corner${i}` })
    })
    mids.forEach(([dx, dy], i) => {
      pts.push({ x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos, label: `Edge ${i + 1}`, color: '#3b82f6', pieceId: piece.id, endpoint: `edge${i}` })
    })
    pts.push({ x: cx, y: cy, label: 'Center', color: '#22c55e', pieceId: piece.id, endpoint: 'center' })
    return pts
  }
  const halfLen = piece.length / 2 * SCALE * zoom
  const rad = piece.angle * Math.PI / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  const offsets = [
    { t: -1, label: 'Start', color: '#f97316', endpoint: 'start' },
    { t: 1, label: 'End', color: '#f97316', endpoint: 'end' },
    { t: 0, label: 'Mid', color: '#22c55e', endpoint: 'mid' },
    { t: -0.5, label: 'Q1', color: '#3b82f6', endpoint: 'q1' },
    { t: 0.5, label: 'Q3', color: '#3b82f6', endpoint: 'q3' },
  ]
  return offsets.map(({ t, label, color, endpoint }) => ({
    x: cx + cos * halfLen * t,
    y: cy + sin * halfLen * t,
    label, color, pieceId: piece.id, endpoint
  }))
}

export interface SnapResult {
  x: number
  y: number
  wx: number
  wy: number
  snapPoint: SnapPoint
  dragEndpoint: string
}

export function findSnap(
  dragging: Piece,
  others: Piece[],
  panX: number, panY: number, zoom: number,
  getSV: (p: Piece) => number | number[]
): SnapResult | null {
  const dragSV = getSV(dragging)
  const dragPoints = getSnapPoints(dragging, dragSV, panX, panY, zoom)
  const checkPoints = dragPoints.filter(p => p.endpoint === 'start' || p.endpoint === 'end' || p.endpoint === 'mid')

  let best: SnapResult | null = null
  let bestDist = SNAP_DIST

  for (const other of others) {
    if (other.id === dragging.id) continue
    const otherSV = getSV(other)
    const otherPts = getSnapPoints(other, otherSV, panX, panY, zoom)
    for (const dp of checkPoints) {
      for (const op of otherPts) {
        const dist = Math.hypot(dp.x - op.x, dp.y - op.y)
        if (dist < bestDist) {
          bestDist = dist
          const offsetX = op.x - dp.x
          const offsetY = op.y - dp.y
          const [wx, wy] = canvasToWorld(
            dragging.x * SCALE * zoom + panX + offsetX,
            dragging.y * SCALE * zoom + panY + offsetY,
            panX, panY, zoom
          )
          best = { x: op.x, y: op.y, wx, wy, snapPoint: op, dragEndpoint: dp.endpoint }
        }
      }
    }
  }
  return best
}

export function toFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12)
  const remaining = Math.round((inches % 12) * 8) / 8
  if (feet === 0) return `${remaining}"`
  if (remaining === 0) return `${feet}'`
  return `${feet}'-${remaining}"`
}
