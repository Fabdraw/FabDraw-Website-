import { useRef, useCallback } from 'react'
import type { Member } from '../types'
import { parseSizeString } from '../lib/materials'
import { SCALE } from '../lib/constants'
export const SNAP_APERTURE_PX = 14
export const SNAP_HOVER_MS = 180
export const SNAP_MOVE_CANCEL_PX = 4

export type SnapType = 'endpoint' | 'corner' | 'center' | 'midpoint' | 'intersection'

export interface SnapPoint {
  worldX: number
  worldY: number
  type: SnapType
  memberId: string
}

export interface SnapResult {
  active: boolean
  point: SnapPoint | null
  lockedX: number
  lockedY: number
}

/** Collect all snap points for a member: 2 endpoints, 1 center, 4 corners, 4 side midpoints */
export function getSnapPoints(m: Member): SnapPoint[] {
  const R = (m.rotation.y * Math.PI) / 180
  const cosR = Math.cos(R), sinR = Math.sin(R)
  const halfLen = m.length / 2
  const { height } = parseSizeString(m.type, m.size)
  const halfH = height / 2

  const toWorld = (lx: number, ly: number) => ({
    x: m.position.x + lx * cosR - ly * sinR,
    y: m.position.y + lx * sinR + ly * cosR,
  })

  const mk = (lx: number, ly: number, type: SnapType): SnapPoint => {
    const w = toWorld(lx, ly)
    return { worldX: w.x, worldY: w.y, type, memberId: m.id }
  }

  return [
    mk(-halfLen, 0, 'endpoint'),
    mk(halfLen, 0, 'endpoint'),
    mk(0, 0, 'center'),
    mk(-halfLen, -halfH, 'corner'),
    mk(halfLen, -halfH, 'corner'),
    mk(halfLen, halfH, 'corner'),
    mk(-halfLen, halfH, 'corner'),
    mk(0, -halfH, 'midpoint'),
    mk(0, halfH, 'midpoint'),
    mk(-halfLen, 0, 'midpoint'),
    mk(halfLen, 0, 'midpoint'),
  ]
}

/** Segment intersection — returns intersection point or null if segments don't cross */
function segmentIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): { x: number; y: number } | null {
  const dx1 = bx - ax, dy1 = by - ay
  const dx2 = dx - cx, dy2 = dy - cy
  const cross = dx1 * dy2 - dy1 * dx2
  if (Math.abs(cross) < 1e-10) return null
  const t = ((cx - ax) * dy2 - (cy - ay) * dx2) / cross
  const s = ((cx - ax) * dy1 - (cy - ay) * dx1) / cross
  if (t < -1e-6 || t > 1 + 1e-6 || s < -1e-6 || s > 1 + 1e-6) return null
  return { x: ax + t * dx1, y: ay + t * dy1 }
}

/** Member centerline endpoints in plan view */
function memberEndpoints(m: Member): [{ x: number; y: number }, { x: number; y: number }] {
  const R = (m.rotation.y * Math.PI) / 180
  const hw = m.length / 2
  return [
    { x: m.position.x - Math.cos(R) * hw, y: m.position.y - Math.sin(R) * hw },
    { x: m.position.x + Math.cos(R) * hw, y: m.position.y + Math.sin(R) * hw },
  ]
}

/** Compute all member-member intersection snap points */
export function getIntersectionSnapPoints(members: Member[]): SnapPoint[] {
  const pts: SnapPoint[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const [as, ae] = memberEndpoints(members[i])
      const [bs, be] = memberEndpoints(members[j])
      const hit = segmentIntersect(as.x, as.y, ae.x, ae.y, bs.x, bs.y, be.x, be.y)
      if (hit) {
        pts.push({ worldX: hit.x, worldY: hit.y, type: 'intersection', memberId: members[i].id })
      }
    }
  }
  return pts
}

/**
 * Pure snap-point finder — no timer, no side effects.
 * Canvas2D manages the 180ms hover timer and calls drawSnapLayer when snap activates.
 */
export function useSnapEngine(members: Member[], zoom: number, panX: number, panY: number) {
  const snapResultRef = useRef<SnapResult>({ active: false, point: null, lockedX: 0, lockedY: 0 })

  const findNearest = useCallback((canvasX: number, canvasY: number): {
    best: SnapPoint | null
    mouseWorldX: number
    mouseWorldY: number
  } => {
    const mouseWorldX = (canvasX - panX) / (zoom * SCALE)
    const mouseWorldY = (canvasY - panY) / (zoom * SCALE)
    const apertureWorld = SNAP_APERTURE_PX / zoom

    let best: SnapPoint | null = null
    let bestDist = apertureWorld

    // Member snap points
    for (const m of members) {
      for (const pt of getSnapPoints(m)) {
        const dist = Math.hypot(mouseWorldX - pt.worldX, mouseWorldY - pt.worldY)
        if (dist < bestDist) { bestDist = dist; best = pt }
      }
    }

    // Intersection snap points
    for (const pt of getIntersectionSnapPoints(members)) {
      const dist = Math.hypot(mouseWorldX - pt.worldX, mouseWorldY - pt.worldY)
      if (dist < bestDist) { bestDist = dist; best = pt }
    }

    return { best, mouseWorldX, mouseWorldY }
  }, [members, zoom, panX, panY])

  return { findNearest, snapResultRef }
}
