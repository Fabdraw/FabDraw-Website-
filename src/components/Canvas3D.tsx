import React, { useRef, useMemo, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { parseSizeString } from '../lib/materials'
import type { Member } from '../types'

const GRADE_COLOR: Record<string, string> = {
  mild: '#4a90d9',
  stainless: '#a8b8c8',
  aluminum: '#c8d8e8',
}

function memberColor(m: Member, selected: boolean): string {
  if (selected) return '#f97316'
  return GRADE_COLOR[m.grade] ?? '#4a90d9'
}

// Build cross-section Shape for extrusion (in inches)
function buildCrossSection(m: Member): THREE.Shape {
  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.12
  const hw = width / 2
  const hh = height / 2

  switch (m.type) {
    case 'square_tube':
    case 'rect_tube': {
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
      const hole = new THREE.Path()
      hole.moveTo(-(hw - wall), -(hh - wall))
      hole.lineTo(hw - wall, -(hh - wall))
      hole.lineTo(hw - wall, hh - wall)
      hole.lineTo(-(hw - wall), hh - wall)
      hole.closePath()
      shape.holes.push(hole)
      return shape
    }
    case 'round_tube':
    case 'pipe': {
      const r = hw
      const ir = Math.max(r - wall, 0.01)
      const shape = new THREE.Shape()
      shape.absarc(0, 0, r, 0, Math.PI * 2, false)
      const hole = new THREE.Path()
      hole.absarc(0, 0, ir, 0, Math.PI * 2, true)
      shape.holes.push(hole)
      return shape
    }
    case 'i_beam': {
      const fh = wall * 1.5  // flange thickness
      const shape = new THREE.Shape()
      // I-beam: top flange, web, bottom flange
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, -hh + fh)
      shape.lineTo(wall / 2, -hh + fh)
      shape.lineTo(wall / 2, hh - fh)
      shape.lineTo(hw, hh - fh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.lineTo(-hw, hh - fh)
      shape.lineTo(-wall / 2, hh - fh)
      shape.lineTo(-wall / 2, -hh + fh)
      shape.lineTo(-hw, -hh + fh)
      shape.closePath()
      return shape
    }
    case 'channel': {
      const fh = wall * 1.5
      const shape = new THREE.Shape()
      // C-channel: open on right side
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, -hh + fh)
      shape.lineTo(-hw + wall, -hh + fh)
      shape.lineTo(-hw + wall, hh - fh)
      shape.lineTo(hw, hh - fh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
      return shape
    }
    case 'angle': {
      const shape = new THREE.Shape()
      // L-angle
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, -hh + wall)
      shape.lineTo(-hw + wall, -hh + wall)
      shape.lineTo(-hw + wall, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
      return shape
    }
    default: {
      // flat_bar, sheet, plate — solid rect
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh)
      shape.lineTo(hw, -hh)
      shape.lineTo(hw, hh)
      shape.lineTo(-hw, hh)
      shape.closePath()
      return shape
    }
  }
}

function MemberMesh({
  m,
  selected,
  onClick,
}: {
  m: Member
  selected: boolean
  onClick: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.12
  const color = memberColor(m, selected)
  const hexColor = new THREE.Color(color)

  // Build geometry: extrude cross-section along Z (member length), then rotate
  const geo = useMemo(() => {
    const shape = buildCrossSection(m)
    const extrudeSettings = { depth: m.length, bevelEnabled: false, steps: 1 }
    const g = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    // Center along Z so member is centered at origin
    g.translate(0, 0, -m.length / 2)
    // Rotate so length runs along X axis (matching 2D canvas convention)
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length])

  // Upright: standing member, length runs up Y
  const uprightGeo = useMemo(() => {
    if (Math.abs(m.rotation.x) < 45) return null
    const shape = buildCrossSection(m)
    const extrudeSettings = { depth: m.length, bevelEnabled: false, steps: 1 }
    const g = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    g.translate(0, 0, -m.length / 2)
    // Rotate Z->Y so extrusion runs up
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length, m.rotation.x])

  const isUpright = Math.abs(m.rotation.x) >= 45
  const activeGeo = isUpright ? uprightGeo ?? geo : geo

  // Hole geometries
  const holeGeos = useMemo(() => {
    return m.holes.map(hole => {
      const r = hole.diameter / 2
      const g = new THREE.CylinderGeometry(r, r, Math.max(width, height) + 0.2, 16)
      return { geo: g, posInches: hole.positionAlongMember, id: hole.id }
    })
  }, [m.holes, width, height])

  // Position: member center in world space
  // In 2D, x=horizontal inches, y=vertical inches (screen). In 3D: X=x, Z=y (2D), Y=zOffset
  const px = m.position.x
  const pz = m.position.y   // 2D y maps to 3D Z
  const py = m.position.z ?? 0   // z in 3D model = height above floor
  const angleY = -(m.rotation.y * Math.PI) / 180

  return (
    <group ref={groupRef} position={[px, py, pz]} rotation={[0, angleY, 0]} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <mesh geometry={activeGeo} castShadow receiveShadow>
        <meshPhongMaterial color={hexColor} shininess={selected ? 80 : 30} />
      </mesh>

      {/* Edge lines for clarity */}
      <lineSegments>
        <edgesGeometry args={[activeGeo]} />
        <lineBasicMaterial color={selected ? '#ff8800' : hexColor.clone().multiplyScalar(0.6)} />
      </lineSegments>

      {/* Holes */}
      {holeGeos.map(({ geo: hGeo, posInches, id }) => {
        // Hole position along member X axis, centered at posInches from start -> -length/2 + posInches
        const hx = -m.length / 2 + posInches
        return (
          <mesh key={id} geometry={hGeo} position={[hx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <meshPhongMaterial color='#111111' />
          </mesh>
        )
      })}
    </group>
  )
}

function Scene() {
  const { project, updateMember } = useProjectStore()
  const { members, connections } = project
  const { selectedIds, setSelectedIds } = useUIStore()
  const { push } = useHistoryStore()

  const handleClick = useCallback((id: string) => {
    setSelectedIds([id])
  }, [setSelectedIds])

  const handleMissedClick = useCallback(() => {
    setSelectedIds([])
  }, [setSelectedIds])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[80, 100, 60]} intensity={0.8} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-40, 40, -40]} intensity={0.3} color='#8888ff' />
      <pointLight position={[0, 50, 0]} intensity={0.2} />

      {/* Ground grid */}
      <Grid
        args={[400, 400]}
        cellSize={6}
        cellThickness={0.5}
        cellColor='#223344'
        sectionSize={48}
        sectionThickness={1}
        sectionColor='#334455'
        fadeDistance={500}
        fadeStrength={1}
        position={[0, -0.01, 0]}
      />

      {/* Members */}
      {members.map(m => (
        <MemberMesh
          key={m.id}
          m={m}
          selected={selectedIds.includes(m.id)}
          onClick={() => handleClick(m.id)}
        />
      ))}

      {/* Click miss — deselect */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMissed={handleMissedClick} visible={false}>
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial />
      </mesh>
    </>
  )
}

function CameraSetup({ members }: { members: Member[] }) {
  const { camera } = useThree()
  const initialized = useRef(false)

  useFrame(() => {
    if (initialized.current) return
    if (members.length === 0) {
      camera.position.set(50, 40, 50)
      camera.lookAt(0, 0, 0)
    } else {
      // Fit to bounding box
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity, maxY = 0
      for (const m of members) {
        const hw = m.length / 2
        minX = Math.min(minX, m.position.x - hw)
        maxX = Math.max(maxX, m.position.x + hw)
        minZ = Math.min(minZ, m.position.y - hw)
        maxZ = Math.max(maxZ, m.position.y + hw)
        maxY = Math.max(maxY, (m.position.z ?? 0) + m.length)
      }
      const cx = (minX + maxX) / 2
      const cz = (minZ + maxZ) / 2
      const span = Math.max(maxX - minX, maxZ - minZ, maxY, 20)
      camera.position.set(cx + span, span * 0.8, cz + span)
      camera.lookAt(cx, maxY / 2, cz)
    }
    initialized.current = true
  })

  return null
}

export default function Canvas3D() {
  const { project } = useProjectStore()
  const { members } = project

  return (
    <div className='w-full h-full relative' style={{ background: '#12151e' }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 5000 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#12151e'))
        }}
      >
        <CameraSetup members={members} />
        <OrbitControls
          makeDefault
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={2000}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
        <Scene />
      </Canvas>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        fontSize: 11, color: '#475569', fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        3D View  •  Left drag: orbit  •  Right drag: pan  •  Scroll: zoom
      </div>

      {members.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', color: '#334155' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
            <div style={{ fontSize: 14 }}>Add members in the Library panel</div>
          </div>
        </div>
      )}
    </div>
  )
}
