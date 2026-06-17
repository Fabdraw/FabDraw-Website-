import { useRef, useCallback } from 'react'
import type { Member } from '../types'
import { parseSizeString } from '../lib/materials'

const SCALE = 8
export const SNAP_APERTURE_PX = 14
export const SNAP_HOVER_MS = 180
export const SNAP_MOVE_CANCEL_PX = 4

export type SnapType = 'endpoint' | 'corner' | 'center' | 'midpoint'

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

  // Rotate a local (lx, ly) offset into world space
  const toWorld = (lx: number, ly: number) => ({
    x: m.position.x + lx * cosR - ly * sinR,
    y: m.position.y + lx * sinR + ly * cosR,
  })

  const mk = (lx: number, ly: number, type: SnapType): SnapPoint => {
    const w = toWorld(lx, ly)
    return { worldX: w.x, worldY: w.y, type, memberId: m.id }
  }

  return [
    // Endpoints
    mk(-halfLen, 0, 'endpoint'),
    mk(halfLen, 0, 'endpoint'),
    // Center
    mk(0, 0, 'center'),
    // 4 corners of rotated bounding box
    mk(-halfLen, -halfH, 'corner'),
    mk(halfLen, -halfH, 'corner'),
    mk(halfLen, halfH, 'corner'),
    mk(-halfLen, halfH, 'corner'),
    // Midpoints of 4 sides
    mk(0, -halfH, 'midpoint'),     // top side
    mk(0, halfH, 'midpoint'),      // bottom side
    mk(-halfLen, 0, 'midpoint'),   // left side (coincides with start endpoint)
    mk(halfLen, 0, 'midpoint'),    // right side (coincides with end endpoint)
  ]
}

/**
 * Pure snap-point finder — no timer, no side effects.
 * Canvas2D manages the 180ms hover timer and calls drawSnapLayer when snap activates.
 */
export function useSnapEngine(members: Member[], zoom: number, panX: number, panY: number) {
  const snapResultRef = useRef<SnapResult>({ active: false, point: null, lockedX: 0, lockedY: 0 })

  /**
   * Find the nearest snap point within aperture (or null if none).
   * Also returns raw mouse world position for use when not snapping.
   */
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

    for (const m of members) {
      for (const pt of getSnapPoints(m)) {
        const dist = Math.hypot(mouseWorldX - pt.worldX, mouseWorldY - pt.worldY)
        if (dist < bestDist) { bestDist = dist; best = pt }
      }
    }

    return { best, mouseWorldX, mouseWorldY }
  }, [members, zoom, panX, panY])

  return { findNearest, snapResultRef }
}
