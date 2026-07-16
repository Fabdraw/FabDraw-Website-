import polygonClipping from 'polygon-clipping'
import type { Member } from '../types'
import { parseSizeString } from './materials'

type Pt = [number, number]
type Ring = Pt[]

function rotate(pts: Pt[], angle: number, cx: number, cy: number): Pt[] {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return pts.map(([x, y]): Pt => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ])
}

function rectRing(cx: number, cy: number, hw: number, hh: number, angle: number): Ring {
  const pts: Pt[] = [
    [cx - hw, cy - hh], [cx + hw, cy - hh],
    [cx + hw, cy + hh], [cx - hw, cy + hh],
  ]
  return angle === 0 ? pts : rotate(pts, angle, cx, cy)
}

function circleRing(cx: number, cy: number, r: number, segs = 32): Ring {
  return Array.from({ length: segs }, (_, i): Pt => {
    const a = (i / segs) * Math.PI * 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
}

function isUpright(m: Member): boolean {
  return Math.abs(m.rotation.x) >= 45
}

function getMemberAngleRad(m: Member): number {
  return (m.rotation.y * Math.PI) / 180
}

/** Outer footprint of a member in world-space inches (plan view for non-upright, cross-section for upright). */
export function memberFootprint(m: Member): { outer: Ring; inner?: Ring } | null {
  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.125
  const cx = m.position.x, cy = m.position.y

  if (isUpright(m)) {
    return uprintCrossSection(m.type, cx, cy, width, height, wall)
  }

  const angle = getMemberAngleRad(m)
  const hw = m.length / 2

  if (m.type === 'round_tube' || m.type === 'pipe') {
    // Plan-view silhouette of a round tube is a rectangle (length × OD)
    return { outer: rectRing(cx, cy, hw, width / 2, angle) }
  }

  let hh: number
  if (m.type === 'angle') hh = width / 2
  else hh = height / 2

  return { outer: rectRing(cx, cy, hw, hh, angle) }
}

function uprintCrossSection(
  type: string, cx: number, cy: number,
  width: number, height: number, wall: number
): { outer: Ring; inner?: Ring } {
  switch (type) {
    case 'square_tube': {
      const outer = rectRing(cx, cy, width / 2, width / 2, 0)
      const iw = width / 2 - wall
      const inner = iw > 0 ? rectRing(cx, cy, iw, iw, 0) : undefined
      return { outer, inner }
    }
    case 'rect_tube': {
      const outer = rectRing(cx, cy, width / 2, height / 2, 0)
      const iw = width / 2 - wall, ih = height / 2 - wall
      const inner = iw > 0 && ih > 0 ? rectRing(cx, cy, iw, ih, 0) : undefined
      return { outer, inner }
    }
    case 'round_tube':
    case 'pipe': {
      const r = width / 2
      return { outer: circleRing(cx, cy, r), inner: circleRing(cx, cy, Math.max(0, r - wall)) }
    }
    case 'angle': {
      const leg = width, t = wall
      const outer: Ring = [
        [cx - leg / 2, cy - leg / 2],
        [cx - leg / 2 + t, cy - leg / 2],
        [cx - leg / 2 + t, cy + leg / 2 - t],
        [cx + leg / 2, cy + leg / 2 - t],
        [cx + leg / 2, cy + leg / 2],
        [cx - leg / 2, cy + leg / 2],
      ]
      return { outer }
    }
    case 'channel': {
      const hw = width / 2, hh = height / 2, t = wall
      const outer: Ring = [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy - hh + t],
        [cx - hw + t, cy - hh + t],
        [cx - hw + t, cy + hh - t],
        [cx + hw, cy + hh - t],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh],
      ]
      return { outer }
    }
    case 'i_beam': {
      const hw = width / 2, hh = height / 2, ft = wall, wt = wall * 0.5
      const outer: Ring = [
        [cx - hw, cy - hh],
        [cx + hw, cy - hh],
        [cx + hw, cy - hh + ft],
        [cx + wt / 2, cy - hh + ft],
        [cx + wt / 2, cy + hh - ft],
        [cx + hw, cy + hh - ft],
        [cx + hw, cy + hh],
        [cx - hw, cy + hh],
        [cx - hw, cy + hh - ft],
        [cx - wt / 2, cy + hh - ft],
        [cx - wt / 2, cy - hh + ft],
        [cx - hw, cy - hh + ft],
      ]
      return { outer }
    }
    case 'flat_bar': {
      return { outer: rectRing(cx, cy, width / 2, height / 2, 0) }
    }
    case 'sheet':
    case 'plate': {
      return { outer: rectRing(cx, cy, width / 2, wall / 2, 0) }
    }
    default:
      return { outer: rectRing(cx, cy, width / 2, height / 2, 0) }
  }
}

/**
 * Union plan-view footprints of all non-upright members.
 * Returns ALL rings from the Clipper result — outer boundaries AND interior holes.
 * Callers must render with even-odd fill rule so holes cut through outer shapes.
 */
export function unionMembers(members: Member[]): Ring[] {
  const nonUpright = members.filter(m => !isUpright(m))
  if (nonUpright.length === 0) return []

  const footprints = nonUpright
    .map(m => memberFootprint(m))
    .filter((f): f is { outer: Ring } => f !== null)

  if (footprints.length === 0) return []
  if (footprints.length === 1) return [footprints[0].outer]

  const closeRing = (r: Ring): Pt[] => [...r, r[0]]
  const polys = footprints.map(f => [closeRing(f.outer)]) as Parameters<typeof polygonClipping.union>[0][]

  try {
    const result = polygonClipping.union(polys[0], ...polys.slice(1))
    // Flatten ALL rings from all polygons (outer rings + hole rings).
    // polygon-clipping returns MultiPolygon where each polygon is [outerRing, ...holeRings].
    // We return them all; the renderer uses even-odd fill to punch holes correctly.
    return result.flatMap(poly => poly.map(ring => ring.slice(0, -1) as Ring))
  } catch {
    return footprints.map(f => f.outer)
  }
}

/** Subtract hole polygons from an outline. Returns resulting rings. */
export function subtractHoles(outline: Ring, holes: Ring[]): Ring[] {
  if (holes.length === 0) return [outline]
  const closeRing = (r: Ring): Pt[] => [...r, r[0]]
  const subjectPoly = [closeRing(outline)] as Parameters<typeof polygonClipping.difference>[0]
  const clipPolys = holes.map(h => [closeRing(h)]) as Parameters<typeof polygonClipping.difference>[1][]
  try {
    const result = polygonClipping.difference(subjectPoly, ...clipPolys)
    return result.map(poly => poly[0].slice(0, -1) as Ring)
  } catch {
    return [outline]
  }
}

/** Shoelace area formula (absolute value) in world units². */
export function shoelaceArea(ring: Ring): number {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(area) / 2
}
