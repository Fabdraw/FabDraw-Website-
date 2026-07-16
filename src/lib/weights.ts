import type { Member } from '../types'
import { GRADE_MATERIALS, resolveWallThickness } from './materials'
import { crossSectionArea } from './geometryKernel'

/**
 * Weight of a member in lbs.
 *
 * volume = (cross-section area − drill-hole volumes) × density
 *
 * Hole deduction: each drill hole removes a cylinder of radius r through the
 * wall material (π·r²·wallThickness per hole).
 */
export function calcWeight(m: Member): number {
  const density = GRADE_MATERIALS[m.grade]?.density ?? 0.284
  const csArea = crossSectionArea(m)

  let holeVolume = 0
  if (m.holes?.length) {
    const wall = resolveWallThickness(m.wallThickness, m.grade)
    holeVolume = m.holes.reduce((sum, h) => {
      const r = h.diameter / 2
      return sum + Math.PI * r * r * wall
    }, 0)
  }

  return Math.max(0, csArea * m.length - holeVolume) * density
}

export function formatWeight(lbs: number): string {
  if (lbs < 0.1) return '< 0.1 lbs'
  return `${lbs.toFixed(2)} lbs`
}

export function totalWeight(members: Member[]): number {
  return members.reduce((sum, m) => sum + calcWeight(m), 0)
}
