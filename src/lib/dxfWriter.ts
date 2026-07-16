/** DXF R12 (AC1009) ASCII writer. Coordinates in inches. */

type Pt2D = [number, number]

/** Format one group-code / value pair. */
function gc(code: number, value: string | number): string {
  const cStr = String(code).padStart(3)
  let vStr: string
  if (typeof value === 'number') {
    vStr = Number.isInteger(value) ? String(value) : value.toFixed(6)
  } else {
    vStr = value
  }
  return `${cStr}\n${vStr}`
}

const HEADER_SECTION = [
  gc(0, 'SECTION'), gc(2, 'HEADER'),
  gc(9, '$ACADVER'),  gc(1, 'AC1009'),
  gc(9, '$INSUNITS'), gc(70, 1),        // 1 = inches
  gc(0, 'ENDSEC'),
].join('\n')

/** Build the TABLES section with layers '0' (cut, color 7) and 'BEND' (color 1). */
function buildTablesSection(): string {
  return [
    gc(0, 'SECTION'), gc(2, 'TABLES'),
    // LTYPE table (minimal — just CONTINUOUS)
    gc(0, 'TABLE'), gc(2, 'LTYPE'), gc(70, 1),
    gc(0, 'LTYPE'), gc(2, 'CONTINUOUS'), gc(70, 64), gc(3, 'Solid line'), gc(72, 65), gc(73, 0), gc(40, 0.0),
    gc(0, 'ENDTAB'),
    // LAYER table
    gc(0, 'TABLE'), gc(2, 'LAYER'), gc(70, 2),
    gc(0, 'LAYER'), gc(2, '0'),    gc(70, 0), gc(62, 7), gc(6, 'CONTINUOUS'),
    gc(0, 'LAYER'), gc(2, 'BEND'), gc(70, 0), gc(62, 1), gc(6, 'CONTINUOUS'),
    gc(0, 'ENDTAB'),
    gc(0, 'ENDSEC'),
  ].join('\n')
}

export class DxfWriter {
  private readonly entities: string[] = []

  writeLine(x1: number, y1: number, x2: number, y2: number, layer = '0'): void {
    this.entities.push([
      gc(0, 'LINE'), gc(8, layer),
      gc(10, x1), gc(20, y1),
      gc(11, x2), gc(21, y2),
    ].join('\n'))
  }

  writeCircle(cx: number, cy: number, r: number, layer = '0'): void {
    this.entities.push([
      gc(0, 'CIRCLE'), gc(8, layer),
      gc(10, cx), gc(20, cy),
      gc(40, r),
    ].join('\n'))
  }

  /** CCW arc, angles in degrees. */
  writeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, layer = '0'): void {
    this.entities.push([
      gc(0, 'ARC'), gc(8, layer),
      gc(10, cx), gc(20, cy),
      gc(40, r),
      gc(50, startDeg), gc(51, endDeg),
    ].join('\n'))
  }

  /** R12 POLYLINE / VERTEX / SEQEND triplet (NOT LWPOLYLINE). */
  writePolyline(points: Pt2D[], closed: boolean, layer = '0'): void {
    if (points.length < 2) return
    const flags = closed ? 1 : 0
    const parts: string[] = [
      gc(0, 'POLYLINE'), gc(8, layer),
      gc(66, 1),        // vertices follow
      gc(70, flags),
    ]
    for (const [x, y] of points) {
      parts.push(
        gc(0, 'VERTEX'), gc(8, layer),
        gc(10, x), gc(20, y),
      )
    }
    parts.push(gc(0, 'SEQEND'), gc(8, layer))
    this.entities.push(parts.join('\n'))
  }

  toString(): string {
    return [
      HEADER_SECTION,
      buildTablesSection(),
      gc(0, 'SECTION'), gc(2, 'ENTITIES'),
      ...this.entities,
      gc(0, 'ENDSEC'),
      gc(0, 'EOF'),
    ].join('\n') + '\n'
  }
}
