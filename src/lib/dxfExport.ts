import type { FabDocument } from '../types/document'
import type { Member } from '../types'
import { fabDocumentToProject } from './migration'
import { unionMembers } from './geometryKernel'
import { DxfWriter } from './dxfWriter'

function memberHolePositions(m: Member): Array<{ x: number; y: number; r: number }> {
  if (!m.holes?.length) return []
  const angle = (m.rotation.y * Math.PI) / 180
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const startX = m.position.x - cos * m.length / 2
  const startY = m.position.y - sin * m.length / 2
  return m.holes.map(h => ({
    x: startX + cos * h.positionAlongMember,
    y: startY + sin * h.positionAlongMember,
    r: h.diameter / 2,
  }))
}

/**
 * Export the current document as a DXF R12 flat-pattern file.
 *
 * Merged member outlines → POLYLINE entities on layer '0'.
 * Drill holes → CIRCLE entities on layer '0'.
 * Y is flipped (world Y-down → DXF Y-up). 1 unit = 1 inch.
 */
export function exportDXF(doc: FabDocument): void {
  const { members } = fabDocumentToProject(doc)
  const writer = new DxfWriter()

  // Merged outlines — all rings (outer boundary + interior holes from union)
  const rings = unionMembers(members)
  for (const ring of rings) {
    const pts: [number, number][] = ring.map(([x, y]) => [x, -y])
    writer.writePolyline(pts, true, '0')
  }

  // Physical drill holes as CIRCLE entities
  for (const m of members) {
    for (const { x, y, r } of memberHolePositions(m)) {
      writer.writeCircle(x, -y, r, '0')
    }
  }

  const content = writer.toString()
  const blob = new Blob([content], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.name.replace(/\s+/g, '_')}.dxf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
