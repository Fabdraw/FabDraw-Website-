/**
 * Bend allowance engine for sheet metal flat pattern calculation.
 *
 * Conventions:
 *   T   = material thickness (inches)
 *   IR  = inside radius (inches)
 *   K   = K-factor (neutral axis ratio, 0–0.5)
 *   A   = bend angle FROM FLAT (degrees) — 90° = right angle bend
 */

import type { Member, Bend } from '../types'
import { resolveWallThickness } from './materials'

// ─── Core formulas ────────────────────────────────────────────────────────────

/** Arc length of the bent neutral axis. */
export function bendAllowance(angle: number, ir: number, k: number, t: number): number {
  return (Math.PI / 180) * angle * (ir + k * t)
}

/**
 * Outside setback: distance from outside mold line to bend tangent point.
 * For A ≤ 90°: OSSB = tan(A/2) × (IR + T)
 * For A > 90°:  OSSB = IR + T  (simplified — tan diverges beyond 90°)
 */
export function outsideSetback(angle: number, ir: number, t: number): number {
  if (angle <= 90) return Math.tan((angle / 2) * (Math.PI / 180)) * (ir + t)
  return ir + t
}

/** How much total material to subtract vs. sum of outside flange dims. BD = 2×OSSB − BA. */
export function bendDeduction(angle: number, ir: number, k: number, t: number): number {
  return 2 * outsideSetback(angle, ir, t) - bendAllowance(angle, ir, k, t)
}

// ─── Flat pattern ─────────────────────────────────────────────────────────────

export interface FlatPatternResult {
  /** Total flat blank length (inches). */
  flatLength: number
  /** Position of each bend line in the flat pattern (inches from left edge). */
  bendLinePositions: number[]
  /**
   * 2D outline of the flat blank as [x, y] pairs (flat along X, thickness in Y).
   * Four corners: bottom-left, bottom-right, top-right, top-left (closed).
   */
  outline: [number, number][]
}

/**
 * Compute the flat pattern for a bent sheet / plate / flat_bar member.
 *
 * Algorithm (outside-mold-line / bend-deduction method):
 *  1. Sort bends by positionAlongPart.
 *  2. Derive flange outside dimensions from consecutive outside-mold positions.
 *  3. For each bend, compute BA and OSSB.
 *  4. Walk left→right: each flat section = flange outside dim − adjacent OSSBs.
 *     Insert the bend arc (BA) between flat sections.
 *  5. Bend line in flat = midpoint of each bend arc.
 *
 * Returns null if the member has no bends or is not a sheet-type part.
 */
export function flatPattern(member: Member): FlatPatternResult | null {
  if (!member.bends?.length) return null
  if (!['sheet', 'plate', 'flat_bar'].includes(member.type)) return null

  const t = resolveWallThickness(member.wallThickness, member.grade)
  const sorted: Bend[] = [...member.bends].sort((a, b) => a.positionAlongPart - b.positionAlongPart)
  const n = sorted.length

  // Outside-mold-line positions from start
  const omlPos = sorted.map(b => b.positionAlongPart)

  // Flange outside dimensions: F[0]=start→oml[0], F[i]=oml[i-1]→oml[i], F[n]=oml[n-1]→end
  const F: number[] = [omlPos[0]]
  for (let i = 1; i < n; i++) F.push(omlPos[i] - omlPos[i - 1])
  F.push(member.length - omlPos[n - 1])

  const ossb = sorted.map(b => outsideSetback(b.angle, b.insideRadius, t))
  const ba   = sorted.map(b => bendAllowance(b.angle, b.insideRadius, b.kFactor, t))

  // Walk flat pattern left → right
  let cursor = 0
  const bendLinePositions: number[] = []

  // First flat section: from left edge to tangent of bend 0
  cursor += Math.max(0, F[0] - ossb[0])

  for (let i = 0; i < n; i++) {
    // Bend arc — line at midpoint
    bendLinePositions.push(cursor + ba[i] / 2)
    cursor += ba[i]

    // Next flat section
    if (i < n - 1) {
      // Middle flange: tangent-to-tangent = outside dim − both adjacent OSSBs
      cursor += Math.max(0, F[i + 1] - ossb[i] - ossb[i + 1])
    } else {
      // Last flange: tangent to right edge
      cursor += Math.max(0, F[n] - ossb[n - 1])
    }
  }

  const flatLength = cursor
  const outline: [number, number][] = [
    [0, 0], [flatLength, 0], [flatLength, t], [0, t],
  ]

  return { flatLength, bendLinePositions, outline }
}

/**
 * Return the flat blank length for a member, or member.length if no bends.
 * Used in BOM / Cut List to show the correct pre-bend cut size.
 */
export function flatLength(member: Member): number {
  return flatPattern(member)?.flatLength ?? member.length
}

// ─── 3D geometry for bent parts ───────────────────────────────────────────────

export interface FlatSegment {
  length: number     // along the member / flange
  direction: 'up' | 'down' | null  // bend direction AFTER this segment (null = last)
  bendAngle: number  // bend angle after this segment (0 if null)
}

/**
 * Decompose a bent member into ordered flat segments separated by bend angles.
 * The first segment is always the reference (angle 0). Each subsequent segment
 * is rotated by the cumulative bend angle (accounting for direction).
 */
export function bendSegments(member: Member): FlatSegment[] | null {
  if (!member.bends?.length) return null

  const t = resolveWallThickness(member.wallThickness, member.grade)
  const sorted = [...member.bends].sort((a, b) => a.positionAlongPart - b.positionAlongPart)
  const n = sorted.length
  const omlPos = sorted.map(b => b.positionAlongPart)

  const F: number[] = [omlPos[0]]
  for (let i = 1; i < n; i++) F.push(omlPos[i] - omlPos[i - 1])
  F.push(member.length - omlPos[n - 1])

  const ossb = sorted.map(b => outsideSetback(b.angle, b.insideRadius, t))

  const segments: FlatSegment[] = []
  for (let i = 0; i < n; i++) {
    const len = i === 0
      ? Math.max(0, F[0] - ossb[0])
      : Math.max(0, F[i] - ossb[i - 1] - ossb[i])
    segments.push({ length: len, direction: sorted[i].direction, bendAngle: sorted[i].angle })
  }
  segments.push({ length: Math.max(0, F[n] - ossb[n - 1]), direction: null, bendAngle: 0 })

  return segments
}
