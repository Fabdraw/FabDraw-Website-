import * as THREE from 'three'
import { parseSizeString } from './materials'
import type { Member, MemberType } from '../types'

// Mirror buildCrossSection logic for validation (avoids circular import from Canvas3D)
function buildShape(type: MemberType, size: string, wall: number): THREE.Shape {
  const { width, height } = parseSizeString(type, size)
  const hw = width / 2, hh = height / 2
  switch (type) {
    case 'square_tube':
    case 'rect_tube': {
      const iw = Math.max(hw - wall, 0.01), ih = Math.max(hh - wall, 0.01)
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,hh); s.lineTo(-hw,hh); s.closePath()
      const hole = new THREE.Path()
      hole.moveTo(-iw,-ih); hole.lineTo(iw,-ih); hole.lineTo(iw,ih); hole.lineTo(-iw,ih); hole.closePath()
      s.holes.push(hole); return s
    }
    case 'round_tube': case 'pipe': {
      const r = hw, ir = Math.max(r - wall, 0.01)
      const s = new THREE.Shape(); s.absarc(0,0,r,0,Math.PI*2,false)
      const hole = new THREE.Path(); hole.absarc(0,0,ir,0,Math.PI*2,true)
      s.holes.push(hole); return s
    }
    case 'i_beam': {
      const ft = Math.max(wall, height * 0.08), wt = Math.max(wall*0.6, 0.05), hww = wt/2
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,-hh+ft); s.lineTo(hww,-hh+ft)
      s.lineTo(hww,hh-ft); s.lineTo(hw,hh-ft); s.lineTo(hw,hh); s.lineTo(-hw,hh)
      s.lineTo(-hw,hh-ft); s.lineTo(-hww,hh-ft); s.lineTo(-hww,-hh+ft); s.lineTo(-hw,-hh+ft)
      s.closePath(); return s
    }
    case 'channel': {
      const ft = Math.max(wall, height*0.08), wt = Math.max(wall, 0.05)
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,-hh+ft); s.lineTo(-hw+wt,-hh+ft)
      s.lineTo(-hw+wt,hh-ft); s.lineTo(hw,hh-ft); s.lineTo(hw,hh); s.lineTo(-hw,hh); s.closePath(); return s
    }
    case 'angle': {
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,-hh+wall)
      s.lineTo(-hw+wall,-hh+wall); s.lineTo(-hw+wall,hh); s.lineTo(-hw,hh); s.closePath(); return s
    }
    case 'flat_bar': {
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,hh); s.lineTo(-hw,hh); s.closePath(); return s
    }
    case 'sheet': case 'plate': {
      const ht = wall/2
      const s = new THREE.Shape()
      s.moveTo(-hw,-ht); s.lineTo(hw,-ht); s.lineTo(hw,ht); s.lineTo(-hw,ht); s.closePath(); return s
    }
    default: {
      const s = new THREE.Shape()
      s.moveTo(-hw,-hh); s.lineTo(hw,-hh); s.lineTo(hw,hh); s.lineTo(-hw,hh); s.closePath(); return s
    }
  }
}

function buildGeo(m: Member): THREE.BufferGeometry {
  const shape = buildShape(m.type, m.size, parseFloat(m.wallThickness) || 0.12)
  const g = new THREE.ExtrudeGeometry(shape, { depth: m.length, bevelEnabled: false, steps: 1 })
  g.translate(0, 0, -m.length / 2)
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
  return g
}

interface TestCase {
  type: MemberType
  size: string
  wall: string
  length: number
  // expected bounding box (approximate, with tolerance)
  expectedX: number  // along length axis
  expectedY: number  // cross-section dim 1 (height or diameter)
  expectedZ: number  // cross-section dim 2 (width or thickness)
  tolerance: number
}

const TEST_CASES: TestCase[] = [
  { type: 'square_tube',  size: '2x2',     wall: '0.120', length: 24, expectedX: 24,   expectedY: 2,    expectedZ: 2,    tolerance: 0.01 },
  { type: 'rect_tube',    size: '2x4',     wall: '0.120', length: 24, expectedX: 24,   expectedY: 4,    expectedZ: 2,    tolerance: 0.01 },
  { type: 'round_tube',   size: '2',       wall: '0.120', length: 24, expectedX: 24,   expectedY: 2,    expectedZ: 2,    tolerance: 0.01 },
  { type: 'pipe',         size: '2',       wall: '0.154', length: 24, expectedX: 24,   expectedY: 2,    expectedZ: 2,    tolerance: 0.01 },
  { type: 'i_beam',       size: 'W8x24',   wall: '0.245', length: 36, expectedX: 36,   expectedY: 8,    expectedZ: 4.8,  tolerance: 0.1  },
  { type: 'channel',      size: 'C6x8.2',  wall: '0.200', length: 36, expectedX: 36,   expectedY: 6,    expectedZ: 3.6,  tolerance: 0.1  },
  { type: 'angle',        size: '2x2',     wall: '0.188', length: 24, expectedX: 24,   expectedY: 2,    expectedZ: 2,    tolerance: 0.01 },
  { type: 'flat_bar',     size: '1/4x2',   wall: '0.250', length: 24, expectedX: 24,   expectedY: 0.25, expectedZ: 2,    tolerance: 0.01 },
  { type: 'sheet',        size: '48x96',   wall: '0.075', length: 96, expectedX: 96,   expectedY: 0.075,expectedZ: 48,   tolerance: 0.01 },
  { type: 'plate',        size: '12x24',   wall: '0.250', length: 24, expectedX: 24,   expectedY: 0.25, expectedZ: 12,   tolerance: 0.01 },
]

function within(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) <= tol + expected * 0.05
}

export function validateMemberShapes(): void {
  console.group('%c[FabDraw] 3D Shape Validation', 'color:#f97316;font-weight:bold')

  let pass = 0, fail = 0

  for (const tc of TEST_CASES) {
    const member: Member = {
      id: 'test',
      type: tc.type,
      size: tc.size,
      wallThickness: tc.wall,
      grade: 'mild',
      length: tc.length,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      holes: [],
    }

    try {
      const geo = buildGeo(member)
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      const sx = bb.max.x - bb.min.x
      const sy = bb.max.y - bb.min.y
      const sz = bb.max.z - bb.min.z

      const okX = within(sx, tc.expectedX, tc.tolerance)
      const okY = within(sy, tc.expectedY, tc.tolerance)
      const okZ = within(sz, tc.expectedZ, tc.tolerance)
      const ok = okX && okY && okZ
      ok ? pass++ : fail++

      const status = ok ? '%c✓ PASS' : '%c✗ FAIL'
      const style = ok ? 'color:#22c55e;font-weight:bold' : 'color:#ef4444;font-weight:bold'
      console.log(
        `${status}%c  ${tc.type.padEnd(12)} ${tc.size.padEnd(10)}` +
        `  expected [${tc.expectedX}×${tc.expectedY}×${tc.expectedZ}]` +
        `  actual [${sx.toFixed(3)}×${sy.toFixed(3)}×${sz.toFixed(3)}]`,
        style, 'color:#94a3b8'
      )
      geo.dispose()
    } catch (err) {
      fail++
      console.log(`%c✗ FAIL%c  ${tc.type} — exception: ${err}`, 'color:#ef4444;font-weight:bold', 'color:#94a3b8')
    }
  }

  console.log(`\n%cResult: ${pass}/${TEST_CASES.length} PASS, ${fail} FAIL`, fail === 0 ? 'color:#22c55e;font-weight:bold' : 'color:#ef4444;font-weight:bold')
  console.groupEnd()
}
