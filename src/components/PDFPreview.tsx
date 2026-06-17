import React, {
  useState, useRef, useImperativeHandle, forwardRef,
  useEffect, useMemo,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { X, Download, Loader2 } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { parseSizeString } from '../lib/materials'
import type { Member, Dimension } from '../types'
import { exportPDFFromImages } from '../lib/pdfExport'

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewPreset = 'top' | 'front' | 'leftSide' | 'rightSide' | 'isometric' | 'custom'

interface PanelState {
  preset: ViewPreset
  showDimensions: boolean
  mode: '2d' | '3d'   // 2d = force top-down ortho (plan view); 3d = full 3D preset
}

interface BBox {
  cx: number; cy: number; cz: number; radius: number
}

interface PanelHandle {
  capture(): Promise<{ name: string; dataURL: string }>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_LABELS: Record<ViewPreset, string> = {
  top: 'Top', front: 'Front', leftSide: 'Left Side',
  rightSide: 'Right Side', isometric: 'Isometric', custom: 'Custom',
}

const VIEW_OPTIONS: ViewPreset[] = ['top', 'front', 'leftSide', 'rightSide', 'isometric', 'custom']

const DEFAULT_PANELS: Record<number, PanelState[]> = {
  1: [{ preset: 'isometric', showDimensions: false, mode: '3d' }],
  2: [{ preset: 'top',       showDimensions: false, mode: '2d' },
      { preset: 'isometric', showDimensions: false, mode: '3d' }],
  3: [{ preset: 'top',       showDimensions: false, mode: '2d' },
      { preset: 'front',     showDimensions: false, mode: '3d' },
      { preset: 'isometric', showDimensions: false, mode: '3d' }],
  4: [{ preset: 'top',       showDimensions: false, mode: '2d' },
      { preset: 'front',     showDimensions: false, mode: '3d' },
      { preset: 'leftSide',  showDimensions: false, mode: '3d' },
      { preset: 'isometric', showDimensions: false, mode: '3d' }],
}

function isOrthoPreset(p: ViewPreset) {
  return p === 'top' || p === 'front' || p === 'leftSide' || p === 'rightSide'
}

// ─── Bounding box ────────────────────────────────────────────────────────────

function calcBBox(members: Member[]): BBox {
  if (members.length === 0) return { cx: 0, cy: 0, cz: 0, radius: 20 }
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const m of members) {
    const hw = m.length / 2
    const isUpright = Math.abs(m.rotation.x) >= 45
    const posY = isUpright ? (m.position.z ?? 0) + m.length / 2 : (m.position.z ?? 0)
    minX = Math.min(minX, m.position.x - hw); maxX = Math.max(maxX, m.position.x + hw)
    minZ = Math.min(minZ, m.position.y - hw); maxZ = Math.max(maxZ, m.position.y + hw)
    minY = Math.min(minY, posY - hw);          maxY = Math.max(maxY, posY + hw)
  }
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    cz: (minZ + maxZ) / 2,
    radius: Math.max(maxX - minX, maxY - minY, maxZ - minZ, 10) * 0.75,
  }
}

// ─── Member geometry ─────────────────────────────────────────────────────────

function buildShape(m: Member): THREE.Shape {
  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.12
  const hw = width / 2, hh = height / 2
  const shape = new THREE.Shape()
  shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath()
  if (['square_tube', 'rect_tube', 'round_tube', 'pipe'].includes(m.type)) {
    const hole = new THREE.Path()
    if (m.type === 'round_tube' || m.type === 'pipe') {
      hole.absarc(0, 0, Math.max(hw - wall, 0.01), 0, Math.PI * 2, true)
    } else {
      const iw = Math.max(hw - wall, 0.01), ih = Math.max(hh - wall, 0.01)
      hole.moveTo(-iw, -ih); hole.lineTo(iw, -ih); hole.lineTo(iw, ih); hole.lineTo(-iw, ih); hole.closePath()
    }
    shape.holes.push(hole)
  }
  return shape
}

const GRADE_COLOR: Record<string, string> = {
  mild: '#4a90d9', stainless: '#a8b8c8', aluminum: '#c8d8e8',
}

function PanelMemberMesh({ m }: { m: Member }) {
  const { width, height } = parseSizeString(m.type, m.size)

  const geo = useMemo(() => {
    const shape = buildShape(m)
    const g = new THREE.ExtrudeGeometry(shape, { depth: m.length, bevelEnabled: false, steps: 1 })
    g.translate(0, 0, -m.length / 2)
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const uprightGeo = useMemo(() => {
    if (Math.abs(m.rotation.x) < 45) return null
    const shape = buildShape(m)
    const g = new THREE.ExtrudeGeometry(shape, { depth: m.length, bevelEnabled: false, steps: 1 })
    g.translate(0, 0, -m.length / 2)
    g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    return g
  }, [m.type, m.size, m.wallThickness, m.length, m.rotation.x]) // eslint-disable-line react-hooks/exhaustive-deps

  const holeGeos = useMemo(() => (m.holes || []).map(hole => ({
    geo: new THREE.CylinderGeometry(hole.diameter / 2, hole.diameter / 2, Math.max(width, height) * 1.1, 16),
    posInches: hole.positionAlongMember,
    id: hole.id,
  })), [m.holes, width, height]) // eslint-disable-line react-hooks/exhaustive-deps

  const isUpright = Math.abs(m.rotation.x) >= 45
  const activeGeo = isUpright ? (uprightGeo ?? geo) : geo
  const color = GRADE_COLOR[m.grade] ?? '#4a90d9'
  const posY = isUpright ? (m.position.z ?? 0) + m.length / 2 : (m.position.z ?? 0)

  return (
    <group position={[m.position.x, posY, m.position.y]} rotation={[0, -(m.rotation.y * Math.PI) / 180, 0]}>
      <mesh geometry={activeGeo}>
        <meshPhongMaterial color={color} shininess={30} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[activeGeo]} />
        <lineBasicMaterial color={new THREE.Color(color).multiplyScalar(0.55)} />
      </lineSegments>
      {holeGeos.map(({ geo: hGeo, posInches, id }) => (
        <mesh
          key={id}
          geometry={hGeo}
          position={isUpright ? [0, -m.length / 2 + posInches, 0] : [-m.length / 2 + posInches, 0, 0]}
          rotation={isUpright ? [0, 0, Math.PI / 2] : [0, 0, 0]}
        >
          <meshPhongMaterial color='#0a0f1a' />
        </mesh>
      ))}
    </group>
  )
}

function DimensionLine3D({ dim }: { dim: Dimension }) {
  const geo = useMemo(() => {
    const H = 0.15
    const ax = dim.pointA.x, az = dim.pointA.y
    const bx = dim.pointB.x, bz = dim.pointB.y
    const odx = dim.offsetDirection.x, odz = dim.offsetDirection.y
    const d = dim.offsetDistance
    const verts = new Float32Array([
      ax, H, az,             ax + odx*d, H, az + odz*d,
      bx, H, bz,             bx + odx*d, H, bz + odz*d,
      ax + odx*d, H, az + odz*d, bx + odx*d, H, bz + odz*d,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    return g
  }, [dim.pointA.x, dim.pointA.y, dim.pointB.x, dim.pointB.y, dim.offsetDirection.x, dim.offsetDirection.y, dim.offsetDistance])

  return (
    <lineSegments>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#60a5fa" />
    </lineSegments>
  )
}

function PanelScene({ members, dimensions, showDimensions }: {
  members: Member[]; dimensions: Dimension[]; showDimensions: boolean
}) {
  return (
    <>
      <color attach="background" args={['#12151e']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 20, 10]} intensity={1.4} />
      <directionalLight position={[-8, 8, -8]} intensity={0.4} />
      {members.map(m => <PanelMemberMesh key={m.id} m={m} />)}
      {showDimensions && dimensions.map(d => <DimensionLine3D key={d.id} dim={d} />)}
    </>
  )
}

// ─── Camera Setup (runs once on mount inside each Canvas) ────────────────────

function PanelCameraSetup({ preset, bbox, mode }: { preset: ViewPreset; bbox: BBox; mode: '2d' | '3d' }) {
  const { camera, size } = useThree()

  useEffect(() => {
    const { cx, cy, cz, radius: r } = bbox
    const effectivePreset = mode === '2d' ? 'top' : preset
    const isOrtho = isOrthoPreset(effectivePreset)

    if (isOrtho && camera instanceof THREE.OrthographicCamera) {
      // Fit radius in view
      camera.zoom = Math.min(size.width, size.height) / 2 / r
      const positions: Record<string, [number, number, number]> = {
        top:      [cx, cy + r * 6, cz],
        front:    [cx, cy, cz + r * 6],
        leftSide: [cx - r * 6, cy, cz],
        rightSide:[cx + r * 6, cy, cz],
      }
      const [px, py, pz] = positions[effectivePreset] ?? [cx, cy + r * 6, cz]
      camera.position.set(px, py, pz)
      camera.lookAt(cx, cy, cz)
      if (effectivePreset === 'top') camera.up.set(0, 0, -1)
      else camera.up.set(0, 1, 0)
      camera.updateProjectionMatrix()
    } else if (!isOrtho && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 20
      camera.aspect = size.width / size.height
      camera.near = 0.1
      camera.far = 50000
      camera.position.set(cx + r, cy + r, cz + r)
      camera.lookAt(cx, cy, cz)
      camera.up.set(0, 1, 0)
      camera.updateProjectionMatrix()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ─── Capture helper (inside Canvas context) ──────────────────────────────────

const PanelCapture = forwardRef<PanelHandle, { name: string }>(({ name }, ref) => {
  const { gl, scene, camera } = useThree()

  useImperativeHandle(ref, () => ({
    capture: () => new Promise<{ name: string; dataURL: string }>(resolve => {
      const savedW = gl.domElement.width
      const savedH = gl.domElement.height
      const savedColor = new THREE.Color()
      gl.getClearColor(savedColor)
      const savedAlpha = gl.getClearAlpha()

      // White background for PDF
      gl.setClearColor(new THREE.Color(1, 1, 1), 1)
      gl.setSize(1200, 900, false)

      // Adjust camera for new aspect
      const savedProj = camera.projectionMatrix.clone()
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = 1200 / 900
        camera.updateProjectionMatrix()
      } else if (camera instanceof THREE.OrthographicCamera) {
        // Expand ortho frustum to match 1200:900 aspect
        const h = (camera.top - camera.bottom)
        const newW = h * (1200 / 900)
        camera.left = -newW / 2; camera.right = newW / 2
        camera.updateProjectionMatrix()
      }

      gl.render(scene, camera)
      const dataURL = gl.domElement.toDataURL('image/png')

      // Restore
      gl.setClearColor(savedColor, savedAlpha)
      gl.setSize(savedW, savedH, false)
      camera.projectionMatrix.copy(savedProj)
      gl.render(scene, camera)

      resolve({ name, dataURL })
    }),
  }), [gl, scene, camera, name])

  return null
})
PanelCapture.displayName = 'PanelCapture'

// ─── PanelView ───────────────────────────────────────────────────────────────

interface PanelViewProps {
  members: Member[]
  dimensions: Dimension[]
  state: PanelState
  panelIndex: number
  onStateChange: (s: Partial<PanelState>) => void
}

const PanelView = forwardRef<PanelHandle, PanelViewProps>(
  ({ members, dimensions, state, panelIndex, onStateChange }, ref) => {
    const captureRef = useRef<PanelHandle>(null)
    const bbox = useMemo(() => calcBBox(members), [members])
    // In 2D mode, always use top ortho; in 3D mode use preset
    const effectivePreset = state.mode === '2d' ? 'top' : state.preset
    const isOrtho = isOrthoPreset(effectivePreset)

    useImperativeHandle(ref, () => ({
      capture: () => captureRef.current?.capture() ?? Promise.resolve({ name: '', dataURL: '' }),
    }), [])

    // Remount Canvas when effective preset or mode changes
    const canvasKey = `p${panelIndex}-${effectivePreset}-${state.mode}-${isOrtho}`

    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        background: '#0f1117', border: '1px solid #2e3350',
        borderRadius: 6, overflow: 'hidden', height: '100%',
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', background: '#1a1d27',
          borderBottom: '1px solid #2e3350', flexShrink: 0,
        }}>
          {/* 2D/3D mode toggle */}
          <div style={{ display: 'flex', border: '1px solid #2e3350', borderRadius: 4, overflow: 'hidden' }}>
            {(['2d', '3d'] as const).map(m => (
              <button key={m} onClick={() => onStateChange({ mode: m })}
                style={{
                  fontSize: 10, padding: '2px 8px', border: 'none', cursor: 'pointer',
                  background: state.mode === m ? '#f97316' : '#21253a',
                  color: state.mode === m ? '#fff' : '#94a3b8',
                  fontWeight: state.mode === m ? 700 : 400,
                }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View preset (only in 3D mode) */}
          {state.mode === '3d' && (
            <select
              value={state.preset}
              onChange={e => onStateChange({ preset: e.target.value as ViewPreset })}
              style={{
                fontSize: 11, background: '#21253a', border: '1px solid #2e3350',
                borderRadius: 4, padding: '2px 6px', color: '#e2e8f0', cursor: 'pointer',
              }}
            >
              {VIEW_OPTIONS.map(v => <option key={v} value={v}>{PRESET_LABELS[v]}</option>)}
            </select>
          )}

          <button
            onClick={() => onStateChange({ showDimensions: !state.showDimensions })}
            style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              border: `1px solid ${state.showDimensions ? '#60a5fa' : '#2e3350'}`,
              background: state.showDimensions ? '#1e3a5f' : '#21253a',
              color: state.showDimensions ? '#60a5fa' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            Dim
          </button>

          <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>
            {state.mode === '2d' ? 'Plan' : (isOrtho ? 'Pan: drag  •  Zoom: scroll' : 'Rotate/Pan/Zoom')}
          </span>
        </div>

        {/* Three.js canvas */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <Canvas
            key={canvasKey}
            orthographic={isOrtho}
            camera={isOrtho
              ? { near: 0.1, far: 50000, zoom: 1 }
              : { fov: 20, near: 0.1, far: 50000 }
            }
            gl={{ antialias: true, preserveDrawingBuffer: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <PanelCapture ref={captureRef} name={PRESET_LABELS[state.preset]} />
            <PanelCameraSetup preset={effectivePreset} bbox={bbox} mode={state.mode} />
            <PanelScene members={members} dimensions={dimensions} showDimensions={state.showDimensions} />
            <OrbitControls
              enableRotate={!isOrtho && state.mode === '3d'}
              mouseButtons={{
                LEFT: (isOrtho || state.mode === '2d') ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN,
              }}
            />
          </Canvas>
        </div>
      </div>
    )
  },
)
PanelView.displayName = 'PanelView'

// ─── Resizable divider ────────────────────────────────────────────────────────

function Divider({
  direction,
  containerRef,
  onDelta,
}: {
  direction: 'v' | 'h'
  containerRef: React.RefObject<HTMLDivElement | null>
  onDelta: (pct: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDragging = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const total = direction === 'v' ? rect.width : rect.height
      const pos = direction === 'v' ? ev.clientX - rect.left : ev.clientY - rect.top
      const pct = Math.max(20, Math.min(80, (pos / total) * 100))
      onDelta(pct)
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isV = direction === 'v'
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        width: isV ? 6 : '100%',
        height: isV ? '100%' : 6,
        background: hovered ? '#f97316' : '#2e3350',
        cursor: isV ? 'col-resize' : 'row-resize',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: 'background 0.15s',
      }}
    >
      {/* Grip dots */}
      <div style={{
        display: 'flex',
        flexDirection: isV ? 'column' : 'row',
        gap: 3, pointerEvents: 'none',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 3, height: 3, borderRadius: '50%',
            background: hovered ? '#fff' : '#475569',
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function PanelGrid({ count, panelRefs, members, dimensions, panels, onPanelChange, splitH, setSplitH, splitV, setSplitV }: {
  count: number
  panelRefs: React.RefObject<PanelHandle | null>[]
  members: Member[]
  dimensions: Dimension[]
  panels: PanelState[]
  onPanelChange: (i: number, s: Partial<PanelState>) => void
  splitH: number
  setSplitH: (v: number) => void
  splitV: number
  setSplitV: (v: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const panelProps = (i: number) => ({
    ref: panelRefs[i] as React.RefObject<PanelHandle | null>,
    panelIndex: i,
    members,
    dimensions,
    state: panels[i],
    onStateChange: (s: Partial<PanelState>) => onPanelChange(i, s),
  })

  if (count === 1) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <PanelView {...panelProps(0)} />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div ref={containerRef} style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ flex: `0 0 ${splitH}%`, minWidth: '20%', maxWidth: '80%', height: '100%' }}>
          <PanelView {...panelProps(0)} />
        </div>
        <Divider direction='v' containerRef={containerRef} onDelta={setSplitH} />
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <PanelView {...panelProps(1)} />
        </div>
      </div>
    )
  }

  if (count === 3) {
    return (
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        <div style={{ flex: `0 0 ${splitV}%`, minHeight: '20%', display: 'flex' }}>
          <div style={{ flex: `0 0 ${splitH}%`, minWidth: '20%', maxWidth: '80%', height: '100%' }}>
            <PanelView {...panelProps(0)} />
          </div>
          <Divider direction='v' containerRef={containerRef} onDelta={setSplitH} />
          <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
            <PanelView {...panelProps(1)} />
          </div>
        </div>
        <Divider direction='h' containerRef={containerRef} onDelta={setSplitV} />
        <div style={{ flex: 1, minHeight: '20%' }}>
          <PanelView {...panelProps(2)} />
        </div>
      </div>
    )
  }

  // 4 panels — 2×2
  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div style={{ flex: `0 0 ${splitV}%`, minHeight: '20%', display: 'flex' }}>
        <div style={{ flex: `0 0 ${splitH}%`, minWidth: '20%', maxWidth: '80%', height: '100%' }}>
          <PanelView {...panelProps(0)} />
        </div>
        <Divider direction='v' containerRef={containerRef} onDelta={setSplitH} />
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <PanelView {...panelProps(1)} />
        </div>
      </div>
      <Divider direction='h' containerRef={containerRef} onDelta={setSplitV} />
      <div style={{ flex: 1, minHeight: '20%', display: 'flex' }}>
        <div style={{ flex: `0 0 ${splitH}%`, minWidth: '20%', maxWidth: '80%', height: '100%' }}>
          <PanelView {...panelProps(2)} />
        </div>
        <Divider direction='v' containerRef={containerRef} onDelta={setSplitH} />
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <PanelView {...panelProps(3)} />
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PDFPreview() {
  const { setShowPDFExportModal } = useUIStore()
  const { project } = useProjectStore()
  const { members, dimensions = [] } = project

  const [panelCount, setPanelCount] = useState(4)
  const [panels, setPanels] = useState<PanelState[]>(DEFAULT_PANELS[4])
  const [loading, setLoading] = useState(false)
  const [splitH, setSplitH] = useState(50)  // horizontal (column) split %
  const [splitV, setSplitV] = useState(50)  // vertical (row) split %

  const panelRefs = [
    useRef<PanelHandle>(null),
    useRef<PanelHandle>(null),
    useRef<PanelHandle>(null),
    useRef<PanelHandle>(null),
  ] as React.RefObject<PanelHandle | null>[]

  const handleCountChange = (n: number) => {
    setPanelCount(n)
    setPanels(DEFAULT_PANELS[n])
  }

  const handlePanelChange = (i: number, s: Partial<PanelState>) => {
    setPanels(prev => prev.map((p, idx) => idx === i ? { ...p, ...s } : p))
  }

  const handleExport = async () => {
    if (members.length === 0) {
      alert('No members to export.')
      return
    }
    setLoading(true)
    try {
      const views: { name: string; dataURL: string }[] = []
      for (let i = 0; i < panelCount; i++) {
        const result = await panelRefs[i].current?.capture()
        if (result) views.push(result)
      }
      const url = exportPDFFromImages(views, members, project.titleBlock, project.name, project.dimensions ?? [])
      window.open(url, '_blank')
      setShowPDFExportModal(false)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const activePanels = panels.slice(0, panelCount)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column',
      background: '#0f1117',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: '#1a1d27', borderBottom: '1px solid #2e3350',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginRight: 8 }}>
          Print Preview
        </span>

        {/* Panel count selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => handleCountChange(n)}
              style={{
                width: 28, height: 28, borderRadius: 4, fontSize: 12, fontWeight: 600,
                border: `1px solid ${panelCount === n ? '#f97316' : '#2e3350'}`,
                background: panelCount === n ? 'rgba(249,115,22,0.15)' : '#21253a',
                color: panelCount === n ? '#f97316' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#475569' }}>
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>

        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: loading ? '#7c3a1a' : '#f97316', color: '#fff',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {loading ? 'Exporting…' : 'Export PDF'}
        </button>

        <button
          onClick={() => setShowPDFExportModal(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6, fontSize: 12,
            background: '#21253a', color: '#94a3b8',
            border: '1px solid #2e3350', cursor: 'pointer',
          }}
        >
          <X size={13} />
          Cancel
        </button>
      </div>

      {/* Panel area */}
      <div style={{ flex: 1, padding: 12, minHeight: 0, overflow: 'hidden' }}>
        <PanelGrid
          count={panelCount}
          panelRefs={panelRefs}
          members={members}
          dimensions={dimensions}
          panels={activePanels}
          onPanelChange={handlePanelChange}
          splitH={splitH}
          setSplitH={setSplitH}
          splitV={splitV}
          setSplitV={setSplitV}
        />
      </div>
    </div>
  )
}
