import React, { useRef, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath()
      const hole = new THREE.Path()
      hole.moveTo(-(hw - wall), -(hh - wall)); hole.lineTo(hw - wall, -(hh - wall))
      hole.lineTo(hw - wall, hh - wall); hole.lineTo(-(hw - wall), hh - wall); hole.closePath()
      shape.holes.push(hole)
      return shape
    }
    case 'round_tube':
    case 'pipe': {
      const r = hw; const ir = Math.max(r - wall, 0.01)
      const shape = new THREE.Shape()
      shape.absarc(0, 0, r, 0, Math.PI * 2, false)
      const hole = new THREE.Path(); hole.absarc(0, 0, ir, 0, Math.PI * 2, true)
      shape.holes.push(hole); return shape
    }
    case 'i_beam': {
      const fh = wall * 1.5
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + fh)
      shape.lineTo(wall / 2, -hh + fh); shape.lineTo(wall / 2, hh - fh); shape.lineTo(hw, hh - fh)
      shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.lineTo(-hw, hh - fh)
      shape.lineTo(-wall / 2, hh - fh); shape.lineTo(-wall / 2, -hh + fh); shape.lineTo(-hw, -hh + fh)
      shape.closePath(); return shape
    }
    case 'channel': {
      const fh = wall * 1.5
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + fh)
      shape.lineTo(-hw + wall, -hh + fh); shape.lineTo(-hw + wall, hh - fh); shape.lineTo(hw, hh - fh)
      shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath(); return shape
    }
    case 'angle': {
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + wall)
      shape.lineTo(-hw + wall, -hh + wall); shape.lineTo(-hw + wall, hh); shape.lineTo(-hw, hh)
      shape.closePath(); return shape
    }
    default: {
      const shape = new THREE.Shape()
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath()
      return shape
    }
  }
}

interface DragState {
  memberId: string
  origPos: { x: number; y: number; z: number }
  groundHit: THREE.Vector3
  screenY0: number
  origZ: number      // 3D Y (height) at drag start
  shift: boolean
  isUpright: boolean // upright members can move Y freely without shift
  pushed: boolean
}

function MemberMesh({
  m,
  selected,
  onClick,
  onPointerDown,
}: {
  m: Member
  selected: boolean
  onClick: () => void
  onPointerDown: (e: React.PointerEvent<Element>) => void
}) {
  const { width, height } = parseSizeString(m.type, m.size)
  const color = memberColor(m, selected)
  const hexColor = new THREE.Color(color)

  const geo = useMemo(() => {
    const shape = buildCrossSection(m)
    const g = new THREE.ExtrudeGeometry(shape, { depth: m.length, bevelEnabled: false, steps: 1 })
    g.translate(0, 0, -m.length / 2)
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length])

  const uprightGeo = useMemo(() => {
    if (Math.abs(m.rotation.x) < 45) return null
    const shape = buildCrossSection(m)
    const g = new THREE.ExtrudeGeometry(shape, { depth: m.length, bevelEnabled: false, steps: 1 })
    g.translate(0, 0, -m.length / 2)
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length, m.rotation.x])

  const isUpright = Math.abs(m.rotation.x) >= 45
  const activeGeo = isUpright ? uprightGeo ?? geo : geo

  const holeGeos = useMemo(() => m.holes.map(hole => ({
    geo: new THREE.CylinderGeometry(hole.diameter / 2, hole.diameter / 2, Math.max(width, height) + 0.2, 16),
    posInches: hole.positionAlongMember,
    id: hole.id,
  })), [m.holes, width, height])

  // 3D position: 2D x→3D X, 2D y→3D Z, model z→3D Y (height)
  const px = m.position.x
  const pz = m.position.y
  const py = m.position.z ?? 0
  const angleY = -(m.rotation.y * Math.PI) / 180

  return (
    <group
      position={[px, py, pz]}
      rotation={[0, angleY, 0]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e as unknown as React.PointerEvent<Element>) }}
    >
      <mesh geometry={activeGeo} castShadow receiveShadow>
        <meshPhongMaterial color={hexColor} shininess={selected ? 80 : 30} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[activeGeo]} />
        <lineBasicMaterial color={selected ? '#ff8800' : hexColor.clone().multiplyScalar(0.6)} />
      </lineSegments>
      {holeGeos.map(({ geo: hGeo, posInches, id }) => (
        <mesh key={id} geometry={hGeo} position={[-m.length / 2 + posInches, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshPhongMaterial color='#111111' />
        </mesh>
      ))}
    </group>
  )
}

const CONNECTION_COLOR_3D: Record<string, string> = {
  weld: '#f97316',
  bolted: '#22c55e',
  flanged: '#a855f7',
}

function Scene() {
  const { project, updateMember } = useProjectStore()
  const { members, connections } = project
  const { selectedIds, selectedConnectionId, setSelectedIds, setSelectedConnectionId } = useUIStore()
  const { push } = useHistoryStore()
  const { camera, gl, controls } = useThree()

  // Stable refs for members/connections so pointer event handlers don't go stale
  const membersRef = useRef(members)
  membersRef.current = members
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds

  const dragRef = useRef<DragState | null>(null)
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const hitVec = useMemo(() => new THREE.Vector3(), [])

  const getNDC = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect()
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
  }, [gl])

  const groundHit = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    raycaster.setFromCamera(getNDC(clientX, clientY), camera)
    const hit = new THREE.Vector3()
    raycaster.ray.intersectPlane(groundPlane, hit)
    return hit
  }, [camera, raycaster, groundPlane, getNDC])

  const handleMemberPointerDown = useCallback((m: Member, e: React.PointerEvent<Element>) => {
    // Disable orbit controls so drag doesn't rotate the scene
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false

    // Push history once at drag start
    push({ members: membersRef.current, connections: connectionsRef.current })

    const hit = groundHit((e as unknown as PointerEvent).clientX, (e as unknown as PointerEvent).clientY)

    dragRef.current = {
      memberId: m.id,
      origPos: { ...m.position },
      groundHit: hit,
      screenY0: (e as unknown as PointerEvent).clientY,
      origZ: m.position.z ?? 0,
      shift: (e as unknown as PointerEvent).shiftKey,
      isUpright: Math.abs(m.rotation.x) >= 45,
      pushed: true,
    }

    gl.domElement.setPointerCapture((e as unknown as PointerEvent).pointerId)
  }, [controls, push, groundHit, gl])

  useEffect(() => {
    const dom = gl.domElement

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return

      if (d.shift) {
        // Shift+drag: vertical only
        const dy = (d.screenY0 - e.clientY) * 0.15
        updateMember(d.memberId, {
          position: { ...d.origPos, z: Math.max(0, d.origZ + dy) }
        })
      } else if (d.isUpright) {
        // Upright member: XZ drag + free vertical from screen-space Y delta
        const hit = groundHit(e.clientX, e.clientY)
        const dx = hit.x - d.groundHit.x
        const dz = hit.z - d.groundHit.z
        const dy = (d.screenY0 - e.clientY) * 0.15
        updateMember(d.memberId, {
          position: {
            x: Math.round(d.origPos.x + dx),
            y: Math.round(d.origPos.y + dz),
            z: Math.max(0, d.origZ + dy),
          }
        })
      } else {
        // Flat member: drag along XZ ground plane only
        const hit = groundHit(e.clientX, e.clientY)
        const dx = hit.x - d.groundHit.x
        const dz = hit.z - d.groundHit.z
        updateMember(d.memberId, {
          position: {
            ...d.origPos,
            x: Math.round(d.origPos.x + dx),
            y: Math.round(d.origPos.y + dz),
          }
        })
      }
    }

    const onPointerUp = () => {
      if (!dragRef.current) return
      if (controls) (controls as unknown as { enabled: boolean }).enabled = true
      dragRef.current = null
    }

    dom.addEventListener('pointermove', onPointerMove)
    dom.addEventListener('pointerup', onPointerUp)
    return () => {
      dom.removeEventListener('pointermove', onPointerMove)
      dom.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, controls, updateMember, groundHit])

  const handleMissed = useCallback(() => {
    if (!dragRef.current) setSelectedIds([])
  }, [setSelectedIds])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[80, 100, 60]} intensity={0.8} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-40, 40, -40]} intensity={0.3} color='#8888ff' />
      <pointLight position={[0, 50, 0]} intensity={0.2} />

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

      {members.map(m => (
        <MemberMesh
          key={m.id}
          m={m}
          selected={selectedIds.includes(m.id)}
          onClick={() => setSelectedIds([m.id])}
          onPointerDown={(e) => handleMemberPointerDown(m, e)}
        />
      ))}

      {connections.map(c => {
        const color = CONNECTION_COLOR_3D[c.type] ?? '#ffffff'
        const isSelected = selectedConnectionId === c.id
        return (
          <mesh
            key={c.id}
            position={[c.pointA.x, c.pointA.z ?? 0, c.pointA.y]}
            onClick={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id) }}
          >
            <sphereGeometry args={[isSelected ? 0.6 : 0.4, 12, 12]} />
            <meshPhongMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 0.6 : 0.2} />
          </mesh>
        )
      })}

      {/* Invisible backdrop — click miss deselects */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerMissed={handleMissed} visible={false}>
        <planeGeometry args={[10000, 10000]} />
        <meshBasicMaterial />
      </mesh>
    </>
  )
}

function CameraSetup({ members }: { members: Member[] }) {
  const { camera } = useThree()
  const initialized = useRef(false)

  // Run once after first render
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (members.length === 0) {
      camera.position.set(50, 40, 50)
      camera.lookAt(0, 0, 0)
    } else {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
        onCreated={({ gl }) => { gl.setClearColor(new THREE.Color('#12151e')) }}
      >
        <CameraSetup members={members} />
        <OrbitControls
          makeDefault
          mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={2000}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
        <Scene />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        fontSize: 11, color: '#475569', fontFamily: 'monospace', pointerEvents: 'none',
      }}>
        3D  •  Drag: move  •  Upright: drag moves X/Z + height  •  Shift+drag: vertical only  •  Right drag: pan  •  Scroll: zoom
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
