import { useRef, useCallback } from 'react'
import type { Member } from '../types'

const SCALE = 8

export interface SnapPoint {
  worldX: number
  worldY: number
  type: 'endpoint' | 'midpoint' | 'intersection' | 'center'
  memberId: string
}

export interface SnapResult {
  active: boolean
  point: SnapPoint | null
  lockedX: number
  lockedY: number
}

export function useSnapEngine(members: Member[], zoom: number, panX: number, panY: number) {
  const snapResultRef = useRef<SnapResult>({ active: false, point: null, lockedX: 0, lockedY: 0 })

  const compute = useCallback((canvasX: number, canvasY: number): SnapResult => {
    const mouseWorldX = (canvasX - panX) / (zoom * SCALE)
    const mouseWorldY = (canvasY - panY) / (zoom * SCALE)
    const apertureWorld = 16 / zoom

    let best: SnapPoint | null = null
    let bestDist = apertureWorld

    for (const m of members) {
      const R = (m.rotation.y * Math.PI) / 180
      const halfLen = m.length / 2
      const candidates: SnapPoint[] = [
        { worldX: m.position.x - halfLen * Math.cos(R), worldY: m.position.y - halfLen * Math.sin(R), type: 'endpoint', memberId: m.id },
        { worldX: m.position.x + halfLen * Math.cos(R), worldY: m.position.y + halfLen * Math.sin(R), type: 'endpoint', memberId: m.id },
        { worldX: m.position.x, worldY: m.position.y, type: 'midpoint', memberId: m.id },
      ]
      for (const pt of candidates) {
        const dist = Math.hypot(mouseWorldX - pt.worldX, mouseWorldY - pt.worldY)
        if (dist < bestDist) { bestDist = dist; best = pt }
      }
    }

    const result: SnapResult = best
      ? { active: true, point: best, lockedX: best.worldX, lockedY: best.worldY }
      : { active: false, point: null, lockedX: mouseWorldX, lockedY: mouseWorldY }

    snapResultRef.current = result
    return result
  }, [members, zoom, panX, panY])

  return { compute, snapResultRef }
}
