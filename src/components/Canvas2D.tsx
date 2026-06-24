import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Group, Rect, Circle, Line, Text, Ellipse, Arrow } from 'react-konva'
import Konva from 'konva'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { parseSizeString } from '../lib/materials'
import { SCALE } from '../lib/constants'
import type { Member, Connection, Dimension, Hole } from '../types'
import ConnectionDialog from './ConnectionDialog'

// Canvas coordinate conversions
function wx2cx(wx: number, zoom: number, panX: number) { return wx * zoom * SCALE + panX }
function wy2cy(wy: number, zoom: number, panY: number) { return wy * zoom * SCALE + panY }
function cx2wx(cx: number, zoom: number, panX: number) { return (cx - panX) / (zoom * SCALE) }
function cy2wy(cy: number, zoom: number, panY: number) { return (cy - panY) / (zoom * SCALE) }

const GRADE_COLOR: Record<string, string> = {
  mild: '#4a90d9',
  stainless: '#a8b8c8',
  aluminum: '#c8d8e8',
}

function getMemberColor(m: Member, selected: boolean): string {
  const base = GRADE_COLOR[m.grade] ?? '#4a90d9'
  if (selected) return '#f97316'
  return base
}

function isUpright(m: Member) { return Math.abs(m.rotation.x) >= 45 }

// Format inches to feet+inches string
function formatDimension(totalInches: number): string {
  const rounded = Math.round(totalInches * 16) / 16
  const feet = Math.floor(rounded / 12)
  const inches = rounded % 12
  if (feet === 0) {
    return `${inches}"`
  }
  if (inches === 0) {
    return `${feet}'`
  }
  return `${feet}'-${inches}"`
}

// Project a world point onto a member axis, returning position along member (from start) and distance from axis
function projectOntoMember(m: Member, wx: number, wy: number): { posAlongMember: number; dist: number } {
  const R = (m.rotation.y * Math.PI) / 180
  const cosR = Math.cos(R), sinR = Math.sin(R)
  const startX = m.position.x - cosR * m.length / 2
  const startY = m.position.y - sinR * m.length / 2
  const vx = wx - startX, vy = wy - startY
  const t = Math.max(0, Math.min(m.length, vx * cosR + vy * sinR))
  const cpx = startX + cosR * t, cpy = startY + sinR * t
  return { posAlongMember: t, dist: Math.hypot(wx - cpx, wy - cpy) }
}

// Grid snap (0.25 inch)
function snapToGrid(v: number): number {
  return Math.round(v * 4) / 4
}

// Draw the cross-section shape for a member (centered at 0,0, along X axis)
function MemberShape({ m, zoom, selected }: { m: Member; zoom: number; selected: boolean }) {
  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.12
  const S = zoom * SCALE
  const len = m.length * S
  const w = width * S
  const h = height * S
  const wt = Math.max(wall * S, 1)
  const color = getMemberColor(m, selected)
  const stroke = selected ? '#f97316' : color
  const strokeW = selected ? 2 : 1.5

  if (isUpright(m)) {
    return (
      <Group>
        <Rect x={-w / 2} y={-w / 2} width={w} height={w} fill={color + '33'} stroke={stroke} strokeWidth={strokeW} cornerRadius={2} />
        <Rect x={-w / 2 + wt} y={-w / 2 + wt} width={w - wt * 2} height={w - wt * 2} fill='rgba(0,0,0,0.5)' listening={false} />
      </Group>
    )
  }

  const hw = len / 2

  switch (m.type) {
    case 'square_tube':
    case 'rect_tube': {
      const ih = Math.max(h - wt * 2, 2)
      return (
        <Group>
          <Rect x={-hw} y={-h / 2} width={len} height={h} fill={color + '55'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw + wt} y={-h / 2 + wt} width={Math.max(len - wt * 2, 2)} height={ih} fill='rgba(0,0,0,0.4)' listening={false} />
        </Group>
      )
    }
    case 'round_tube':
    case 'pipe': {
      const r = w / 2
      const ir = Math.max(r - wt, 2)
      return (
        <Group>
          <Ellipse radiusX={hw} radiusY={r} fill={color + '55'} stroke={stroke} strokeWidth={strokeW} />
          <Ellipse radiusX={Math.max(hw - wt, 2)} radiusY={ir} fill='rgba(0,0,0,0.4)' listening={false} />
        </Group>
      )
    }
    case 'i_beam': {
      const fw = w
      const fh = wt * 1.5
      const webH = fw - fh * 2
      return (
        <Group>
          <Rect x={-hw} y={-fw / 2} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw} y={-webH / 2} width={len} height={webH} fill={color + '44'} stroke={stroke} strokeWidth={strokeW} />
        </Group>
      )
    }
    case 'channel': {
      const fw = w
      const fh = wt * 1.5
      return (
        <Group>
          <Rect x={-hw} y={-fw / 2} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw} y={-fw / 2} width={wt} height={fw} fill={color + '66'} stroke={stroke} strokeWidth={strokeW} />
        </Group>
      )
    }
    case 'angle': {
      const fw = w
      const fh = wt * 1.5
      return (
        <Group>
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          <Rect x={-hw} y={-fw / 2} width={wt} height={fw} fill={color + '66'} stroke={stroke} strokeWidth={strokeW} />
        </Group>
      )
    }
    case 'flat_bar':
    case 'sheet':
    case 'plate':
    default:
      return (
        <Rect x={-hw} y={-h / 2} width={len} height={h} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
      )
  }
}

/** Render a saved dimension: extension lines + measurement arrow + label */
function DimensionLine({
  dim, zoom, panX, panY, selected, onClick,
}: {
  dim: Dimension; zoom: number; panX: number; panY: number
  selected: boolean; onClick: (id: string) => void
}) {
  if (!dim.pointA || !dim.pointB || !dim.offsetDirection) return null
  const S = zoom * SCALE
  const ax = wx2cx(dim.pointA.x, zoom, panX)
  const ay = wy2cy(dim.pointA.y, zoom, panY)
  const bx = wx2cx(dim.pointB.x, zoom, panX)
  const by = wy2cy(dim.pointB.y, zoom, panY)

  const offPx = dim.offsetDistance * S
  const odx = dim.offsetDirection.x
  const ody = dim.offsetDirection.y

  // Offset endpoints
  const dax = ax + odx * offPx, day = ay + ody * offPx
  const dbx = bx + odx * offPx, dby = by + ody * offPx
  const midX = (dax + dbx) / 2, midY = (day + dby) / 2

  // Measurement line length check
  const mLen = Math.hypot(dbx - dax, dby - day)
  if (mLen < 4) return null

  const color = selected ? '#facc15' : '#60a5fa'
  const labelW = Math.max(dim.label.length * 7, 42)

  return (
    <Group onClick={() => onClick(dim.id)}>
      {/* Extension lines */}
      <Line points={[ax, ay, dax, day]} stroke={color} strokeWidth={1} opacity={0.75} listening={false} />
      <Line points={[bx, by, dbx, dby]} stroke={color} strokeWidth={1} opacity={0.75} listening={false} />
      {/* Measurement line with arrows */}
      <Arrow points={[dax, day, dbx, dby]} stroke={color} fill={color}
        strokeWidth={1.5} pointerAtBeginning pointerAtEnding pointerLength={8} pointerWidth={5} listening={false} />
      {/* Invisible hit area */}
      <Line points={[dax, day, dbx, dby]} stroke='transparent' strokeWidth={14} hitStrokeWidth={14} />
      {/* Label background + text */}
      <Rect x={midX - labelW / 2} y={midY - 19} width={labelW} height={14}
        fill='#0f1117' opacity={0.88} cornerRadius={2} listening={false} />
      <Text x={midX} y={midY - 17} text={dim.label}
        fontSize={Math.max(9, 10 * zoom)} fill={color}
        align='center' offsetX={labelW / 2} width={labelW} listening={false} />
    </Group>
  )
}

// Connection dot rendering
function ConnectionDot({
  conn, zoom, panX, panY, selected, onClick,
}: {
  conn: Connection
  zoom: number
  panX: number
  panY: number
  selected: boolean
  onClick: (id: string) => void
}) {
  const color = conn.type === 'weld' ? '#f97316' : conn.type === 'bolted' ? '#22c55e' : '#a855f7'
  const ax = wx2cx(conn.pointA.x, zoom, panX)
  const ay = wy2cy(conn.pointA.y, zoom, panY)
  const bx = wx2cx(conn.pointB.x, zoom, panX)
  const by = wy2cy(conn.pointB.y, zoom, panY)
  const r = Math.max(4, 5 * zoom)

  return (
    <Group onClick={(e) => { e.cancelBubble = true; onClick(conn.id) }}>
      {selected && (
        <>
          <Circle x={ax} y={ay} radius={r + 4} fill='transparent' stroke={color} strokeWidth={2} opacity={0.7} listening={false} />
          <Circle x={bx} y={by} radius={r + 4} fill='transparent' stroke={color} strokeWidth={2} opacity={0.7} listening={false} />
        </>
      )}
      <Circle x={ax} y={ay} radius={r} fill={color} opacity={0.85} />
      <Circle x={bx} y={by} radius={r} fill={color} opacity={0.85} />
      {/* Hit targets */}
      <Circle x={ax} y={ay} radius={r + 6} fill='transparent' hitStrokeWidth={0} />
      <Circle x={bx} y={by} radius={r + 6} fill='transparent' hitStrokeWidth={0} />
    </Group>
  )
}

// Group bounding box
function GroupBoundingBox({
  groupId, groupName, members, zoom, panX, panY,
  onDoubleClick,
}: {
  groupId: string
  groupName: string
  members: Member[]
  zoom: number
  panX: number
  panY: number
  onDoubleClick: (groupId: string) => void
}) {
  const S = zoom * SCALE
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const m of members) {
    const { width, height } = parseSizeString(m.type, m.size)
    const halfLen = m.length / 2
    const halfH = height / 2
    const angle = (m.rotation.y * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // Four corners of the member rectangle in world space
    const corners = [
      [-halfLen, -halfH], [halfLen, -halfH],
      [halfLen, halfH], [-halfLen, halfH],
    ]
    for (const [lx, ly] of corners) {
      const wx = m.position.x + lx * cos - ly * sin
      const wy = m.position.y + lx * sin + ly * cos
      const cx = wx2cx(wx, zoom, panX)
      const cy = wy2cy(wy, zoom, panY)
      if (cx < minX) minX = cx
      if (cy < minY) minY = cy
      if (cx > maxX) maxX = cx
      if (cy > maxY) maxY = cy
    }
  }

  const pad = 8
  return (
    <Group onDblClick={() => onDoubleClick(groupId)}>
      <Rect
        x={minX - pad} y={minY - pad}
        width={maxX - minX + pad * 2}
        height={maxY - minY + pad * 2}
        stroke='#a855f7'
        strokeWidth={1.5}
        dash={[6, 4]}
        fill='rgba(168,85,247,0.04)'
        listening={false}
      />
      <Text
        x={minX - pad}
        y={minY - pad - 18}
        text={groupName}
        fontSize={Math.max(10, 11 * zoom)}
        fill='#a855f7'
        listening={false}
      />
    </Group>
  )
}

interface DragOffsets {
  [memberId: string]: { dx: number; dy: number }
}


export default function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const {
    project, updateMember, deleteMembers, addConnection, deleteConnection,
    addDimension, deleteDimension, groupMembers, ungroupMembers, renameGroup,
  } = useProjectStore()
  const { members, connections, dimensions = [], groupNames = {} } = project
  const {
    panX, panY, zoom, setPan, setZoom: _setZoom, setPanZoom,
    selectedIds, setSelectedIds, toggleSelectedId,
    selectedConnectionId, setSelectedConnectionId,
    selectedDimensionId, setSelectedDimensionId,
    connectFirstMemberId, setConnectFirstMemberId,
    mode, setMode, setContextMenu,
    activeRightTab,
  } = useUIStore()
  const { push } = useHistoryStore()

  // Dimension tool state machine: IDLE → FIRST_POINT_SET → PULLING → IDLE
  type DimState = 'IDLE' | 'FIRST_POINT_SET' | 'PULLING'
  const [dimState, setDimState] = useState<DimState>('IDLE')
  const [dimPointA, setDimPointA] = useState<{ x: number; y: number } | null>(null)
  const [dimPointB, setDimPointB] = useState<{ x: number; y: number } | null>(null)
  const [dimMouse, setDimMouse] = useState<{ x: number; y: number } | null>(null)

  // Hole placement preview — position in canvas coords + positionAlongMember in inches
  const [holePlacePreview, setHolePlacePreview] = useState<{
    canvasX: number; canvasY: number; posAlongMember: number
  } | null>(null)

  // Selected hole: { memberId, holeId } — separate from member selection
  const [selectedHole, setSelectedHole] = useState<{ memberId: string; holeId: string } | null>(null)

  // Connection dialog state
  const [connDialog, setConnDialog] = useState<{
    memberAId: string; memberBId: string
  } | null>(null)

  // Rename group state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Selection rect state
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selStart = useRef<{ x: number; y: number } | null>(null)
  const isPanning = useRef(false)
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const spaceDown = useRef(false)

  // Touch state
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const pinchRef = useRef<{ dist: number; midX: number; midY: number; zoom: number; panX: number; panY: number } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Multi-drag state
  const dragOffsets = useRef<DragOffsets>({})

  // Right-drag tracking (suppress context menu when drag occurred)
  const rightDragMoved = useRef(false)
  const rightDragStart = useRef<{ x: number; y: number } | null>(null)

  // Reset dim tool when leaving dimension mode
  useEffect(() => {
    if (mode !== 'dimension') {
      setDimState('IDLE')
      setDimPointA(null)
      setDimPointB(null)
      setDimMouse(null)
    }
  }, [mode])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); spaceDown.current = true }

      if (e.code === 'Escape') {
        setSelectedIds([])
        setSelectedConnectionId(null)
        setSelectedDimensionId(null)
        setSelectedHole(null)
        setDimState('IDLE')
        setDimPointA(null)
        setDimPointB(null)
        setDimMouse(null)
        setConnectFirstMemberId(null)
        return
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        // Don't delete if renaming
        if (renamingGroupId) return
        if (selectedHole) {
          const m = members.find(mb => mb.id === selectedHole.memberId)
          if (m) {
            push({ members, connections, dimensions, groupNames })
            updateMember(m.id, { holes: m.holes.filter(h => h.id !== selectedHole.holeId) })
          }
          setSelectedHole(null)
          return
        }
        if (selectedDimensionId) {
          push({ members, connections, dimensions, groupNames })
          deleteDimension(selectedDimensionId)
          setSelectedDimensionId(null)
          return
        }
        if (selectedConnectionId) {
          push({ members, connections, dimensions, groupNames })
          deleteConnection(selectedConnectionId)
          setSelectedConnectionId(null)
          return
        }
        if (selectedIds.length > 0) {
          push({ members, connections, dimensions, groupNames })
          deleteMembers(selectedIds)
          setSelectedIds([])
          return
        }
      }

      // Ctrl+G group
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyG' && !e.shiftKey) {
        if (selectedIds.length >= 2) {
          e.preventDefault()
          push({ members, connections, dimensions, groupNames })
          const groupId = crypto.randomUUID()
          groupMembers(selectedIds, groupId)
        }
        return
      }

      // Ctrl+Shift+G ungroup
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyG') {
        e.preventDefault()
        // Find groups that have selected members
        const groupIds = new Set(
          members
            .filter(m => selectedIds.includes(m.id) && m.groupId)
            .map(m => m.groupId as string)
        )
        if (groupIds.size > 0) {
          push({ members, connections, dimensions, groupNames })
          groupIds.forEach(gid => ungroupMembers(gid))
        }
        return
      }
    }
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [
    selectedIds, selectedConnectionId, selectedDimensionId, selectedHole, renamingGroupId,
    members, connections, dimensions, groupNames,
    deleteMembers, deleteConnection, deleteDimension, groupMembers, ungroupMembers,
    setSelectedIds, setSelectedConnectionId, setSelectedDimensionId,
    setConnectFirstMemberId, push, updateMember,
  ])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldZoom = zoom
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const zoomFactor = e.evt.deltaY < 0 ? 1.1 : 0.9
    const newZoom = Math.max(0.05, Math.min(12, oldZoom * zoomFactor))
    const mouseWorldX = (pointer.x - panX) / (oldZoom * SCALE)
    const mouseWorldY = (pointer.y - panY) / (oldZoom * SCALE)
    const newPanX = pointer.x - mouseWorldX * newZoom * SCALE
    const newPanY = pointer.y - mouseWorldY * newZoom * SCALE
    setPanZoom(newPanX, newPanY, newZoom)
  }, [zoom, panX, panY, setPanZoom])

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.getPointerPosition()
    if (!pos) return

    // Middle mouse or space+left = pan
    if (e.evt.button === 1 || (e.evt.button === 0 && spaceDown.current) || mode === 'pan') {
      isPanning.current = true
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY, panX, panY }
      return
    }

    // Right mouse on stage background = selection rect
    if (e.evt.button === 2 && e.target === stage) {
      selStart.current = { x: pos.x, y: pos.y }
      rightDragStart.current = { x: pos.x, y: pos.y }
      rightDragMoved.current = false
      setSelRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
      return
    }

    if (e.evt.button !== 0) return

    // Dimension mode — 3-state machine
    if (mode === 'dimension') {
      const wx = snapToGrid(cx2wx(pos.x, zoom, panX))
      const wy = snapToGrid(cy2wy(pos.y, zoom, panY))

      if (dimState === 'IDLE') {
        setDimPointA({ x: wx, y: wy })
        setDimState('FIRST_POINT_SET')
      } else if (dimState === 'FIRST_POINT_SET') {
        if (!dimPointA) return
        if (Math.hypot(wx - dimPointA.x, wy - dimPointA.y) < 0.05) return
        setDimPointB({ x: wx, y: wy })
        setDimState('PULLING')
      } else if (dimState === 'PULLING') {
        if (!dimPointA || !dimPointB) return
        const mouse = dimMouse ?? { x: cx2wx(pos.x, zoom, panX), y: cy2wy(pos.y, zoom, panY) }
        const abVec = { x: dimPointB.x - dimPointA.x, y: dimPointB.y - dimPointA.y }
        const abLen = Math.sqrt(abVec.x ** 2 + abVec.y ** 2)
        if (abLen < 0.01) return
        const perpDir = { x: -abVec.y / abLen, y: abVec.x / abLen }
        const mid = { x: (dimPointA.x + dimPointB.x) / 2, y: (dimPointA.y + dimPointB.y) / 2 }
        const toMouse = { x: mouse.x - mid.x, y: mouse.y - mid.y }
        const signedDist = toMouse.x * perpDir.x + toMouse.y * perpDir.y
        const offsetDir = signedDist >= 0 ? perpDir : { x: -perpDir.x, y: -perpDir.y }
        const offsetDist = Math.max(Math.abs(signedDist), 1)
        push({ members, connections, dimensions, groupNames })
        addDimension({
          pointA: dimPointA,
          pointB: dimPointB,
          offsetDistance: offsetDist,
          offsetDirection: offsetDir,
          label: formatDimension(abLen),
        })
        setDimState('IDLE')
        setDimPointA(null)
        setDimPointB(null)
        setDimMouse(null)
      }
      return
    }

    // Left click on stage background = deselect
    if (e.target === stage) {
      setSelectedIds([])
      setSelectedConnectionId(null)
      setSelectedDimensionId(null)
      setSelectedHole(null)
      setContextMenu(null)
      setConnectFirstMemberId(null)
    }
  }, [
    mode, panX, panY, zoom, dimState, dimPointA, dimPointB, dimMouse,
    members, connections, dimensions, groupNames,
    setSelectedIds, setSelectedConnectionId, setSelectedDimensionId,
    setContextMenu, setConnectFirstMemberId, addDimension, push,
  ])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current && panStart.current) {
      const dx = e.evt.clientX - panStart.current.x
      const dy = e.evt.clientY - panStart.current.y
      setPan(panStart.current.panX + dx, panStart.current.panY + dy)
      return
    }

    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) return

    const worldX = (pos.x - panX) / (zoom * SCALE)
    const worldY = (pos.y - panY) / (zoom * SCALE)

    if (selStart.current) {
      if (rightDragStart.current) {
        const ddx = pos.x - rightDragStart.current.x
        const ddy = pos.y - rightDragStart.current.y
        if (Math.sqrt(ddx * ddx + ddy * ddy) > 3) rightDragMoved.current = true
      }
      setSelRect({
        x: Math.min(selStart.current.x, pos.x),
        y: Math.min(selStart.current.y, pos.y),
        w: Math.abs(pos.x - selStart.current.x),
        h: Math.abs(pos.y - selStart.current.y),
      })
      return
    }

    // Dimension mouse tracking
    if (mode === 'dimension') {
      if (dimState === 'FIRST_POINT_SET') {
        setDimMouse({ x: worldX, y: worldY })
      } else if (dimState === 'PULLING') {
        setDimMouse({ x: worldX, y: worldY })
      }
    }

    // Hole placement preview when Holes tab is active and one member is selected
    if (activeRightTab === 'holes' && selectedIds.length === 1) {
      const wx = worldX
      const wy = worldY
      const m = members.find(mb => mb.id === selectedIds[0])
      if (m) {
        const { width, height } = parseSizeString(m.type, m.size)
        const threshold = Math.max(width, height) / 2 + 0.5
        const { posAlongMember, dist } = projectOntoMember(m, wx, wy)
        if (dist < threshold) {
          const R = (m.rotation.y * Math.PI) / 180
          const startX = m.position.x - Math.cos(R) * m.length / 2
          const startY = m.position.y - Math.sin(R) * m.length / 2
          const holeWorldX = startX + Math.cos(R) * posAlongMember
          const holeWorldY = startY + Math.sin(R) * posAlongMember
          setHolePlacePreview({ canvasX: wx2cx(holeWorldX, zoom, panX), canvasY: wy2cy(holeWorldY, zoom, panY), posAlongMember })
        } else if (holePlacePreview !== null) {
          setHolePlacePreview(null)
        }
      }
    } else if (holePlacePreview !== null) {
      setHolePlacePreview(null)
    }
  }, [setPan, mode, dimState, zoom, panX, panY, activeRightTab, selectedIds, members, holePlacePreview])

  const handleStageMouseUp = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) { isPanning.current = false; panStart.current = null; return }
    if (selStart.current && selRect) {
      const rx2 = selRect.x + selRect.w
      const ry2 = selRect.y + selRect.h
      const ids = members.filter(m => {
        const angle = (m.rotation.y * Math.PI) / 180
        const cos = Math.cos(angle), sin = Math.sin(angle)
        const hw = m.length / 2 * zoom * SCALE
        const { height } = parseSizeString(m.type, m.size)
        const hh = height / 2 * zoom * SCALE
        const mcx = wx2cx(m.position.x, zoom, panX)
        const mcy = wy2cy(m.position.y, zoom, panY)
        const corners = [
          { x: mcx - cos * hw + sin * hh, y: mcy - sin * hw - cos * hh },
          { x: mcx + cos * hw + sin * hh, y: mcy + sin * hw - cos * hh },
          { x: mcx + cos * hw - sin * hh, y: mcy + sin * hw + cos * hh },
          { x: mcx - cos * hw - sin * hh, y: mcy - sin * hw + cos * hh },
        ]
        const minBX = Math.min(...corners.map(c => c.x))
        const maxBX = Math.max(...corners.map(c => c.x))
        const minBY = Math.min(...corners.map(c => c.y))
        const maxBY = Math.max(...corners.map(c => c.y))
        return minBX <= rx2 && maxBX >= selRect.x && minBY <= ry2 && maxBY >= selRect.y
      }).map(m => m.id)
      setSelectedIds(ids)
      selStart.current = null
      rightDragStart.current = null
      setSelRect(null)
    }
  }, [selRect, members, zoom, panX, panY, setSelectedIds])

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }

    if (touches.length === 1) {
      const t = touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
      pinchRef.current = null
      // Long press → context menu
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null
        if (touchStartRef.current) {
          setContextMenu({ x: touchStartRef.current.x, y: touchStartRef.current.y, type: 'canvas' })
          touchStartRef.current = null
        }
      }, 500)
    } else if (touches.length === 2) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      touchStartRef.current = null
      const dx = touches[1].clientX - touches[0].clientX
      const dy = touches[1].clientY - touches[0].clientY
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        midX: (touches[0].clientX + touches[1].clientX) / 2,
        midY: (touches[0].clientY + touches[1].clientY) / 2,
        zoom,
        panX,
        panY,
      }
    }
  }, [zoom, panX, panY, setContextMenu])

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault()
    const touches = e.evt.touches

    if (touches.length === 1 && touchStartRef.current) {
      const t = touches[0]
      const moved = Math.hypot(t.clientX - touchStartRef.current.x, t.clientY - touchStartRef.current.y)
      if (moved > 8 && longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    } else if (touches.length === 2 && pinchRef.current) {
      const p = pinchRef.current
      const dx = touches[1].clientX - touches[0].clientX
      const dy = touches[1].clientY - touches[0].clientY
      const newDist = Math.hypot(dx, dy)
      const curMidX = (touches[0].clientX + touches[1].clientX) / 2
      const curMidY = (touches[0].clientY + touches[1].clientY) / 2

      const newZoom = Math.max(0.05, Math.min(10, p.zoom * (newDist / p.dist)))
      const midWorldX = (p.midX - p.panX) / (p.zoom * SCALE)
      const midWorldY = (p.midY - p.panY) / (p.zoom * SCALE)
      const panDx = curMidX - p.midX
      const panDy = curMidY - p.midY
      const newPanX = curMidX - midWorldX * newZoom * SCALE + panDx * 0
      const newPanY = curMidY - midWorldY * newZoom * SCALE + panDy * 0
      // Combine pinch zoom + two-finger pan
      const finalPanX = newPanX + (curMidX - p.midX)
      const finalPanY = newPanY + (curMidY - p.midY)
      setPanZoom(finalPanX, finalPanY, newZoom)
    }
  }, [setPanZoom])

  const handleTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    if (e.evt.changedTouches.length === 1 && touchStartRef.current) {
      const t = e.evt.changedTouches[0]
      const moved = Math.hypot(t.clientX - touchStartRef.current.x, t.clientY - touchStartRef.current.y)
      const elapsed = Date.now() - touchStartRef.current.t
      if (moved < 8 && elapsed < 500) {
        // Tap → select member under touch point
        const stage = stageRef.current
        if (stage) {
          const pos = stage.getPointerPosition()
          if (pos) {
            const shape = stage.getIntersection(pos)
            const memberGroup = shape?.findAncestor('Group')
            if (memberGroup) {
              const id = (memberGroup.attrs as { id?: string }).id
              if (id) setSelectedIds([id])
            } else {
              setSelectedIds([])
            }
          }
        }
      }
      touchStartRef.current = null
    }
    pinchRef.current = null
  }, [stageRef, setSelectedIds])
  // ── End touch ────────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault()
    if (rightDragMoved.current) {
      rightDragMoved.current = false
      return
    }
    if (e.target === stageRef.current) {
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, type: 'canvas' })
    }
  }, [setContextMenu])

  const handleMemberSelect = useCallback((id: string, shift: boolean) => {
    // Holes tab: clicking the already-selected member places a hole at preview position
    if (activeRightTab === 'holes' && selectedIds.includes(id) && holePlacePreview) {
      const m = members.find(mb => mb.id === id)
      if (m) {
        push({ members, connections, dimensions, groupNames })
        const newHole: Hole = {
          id: crypto.randomUUID(),
          type: 'circle',
          diameter: 0.5,
          positionAlongMember: holePlacePreview.posAlongMember,
          face: 'top',
        }
        updateMember(id, { holes: [...(m.holes || []), newHole] })
      }
      return
    }
    if (mode === 'connect') {
      if (!connectFirstMemberId) {
        setConnectFirstMemberId(id)
      } else if (connectFirstMemberId !== id) {
        setConnDialog({ memberAId: connectFirstMemberId, memberBId: id })
        setConnectFirstMemberId(null)
      }
      return
    }
    if (shift) toggleSelectedId(id)
    else setSelectedIds([id])
    setSelectedConnectionId(null)
    setSelectedDimensionId(null)
    setSelectedHole(null)
    setContextMenu(null)
  }, [
    mode, connectFirstMemberId, setConnectFirstMemberId,
    toggleSelectedId, setSelectedIds, setSelectedConnectionId,
    setSelectedDimensionId, setContextMenu,
    activeRightTab, selectedIds, holePlacePreview, members, connections, dimensions, groupNames,
    push, updateMember,
  ])

  const handleMemberContextMenu = useCallback((id: string, x: number, y: number) => {
    if (!selectedIds.includes(id)) setSelectedIds([id])
    setContextMenu({ x, y, type: 'member', memberId: id })
  }, [selectedIds, setSelectedIds, setContextMenu])

  const handleMemberDragStart = useCallback((id: string) => {
    // Record dragged member's world position and offsets of all selected members
    const dragged = members.find(m => m.id === id)
    if (!dragged) return
    const ids = selectedIds.includes(id) ? selectedIds : [id]
    const offsets: DragOffsets = {}
    for (const sid of ids) {
      const sm = members.find(m => m.id === sid)
      if (sm) {
        // off.dx = 0 for the dragged member itself; relative offset for others
        offsets[sid] = {
          dx: sm.position.x - dragged.position.x,
          dy: sm.position.y - dragged.position.y,
        }
      }
    }
    dragOffsets.current = offsets
  }, [members, selectedIds])

  const handleMemberDragMove = useCallback((_id: string, _cx: number, _cy: number) => {}, [])

  const handleMemberDragEnd = useCallback((id: string, nodeX: number, nodeY: number) => {
    // nodeX and nodeY are e.target.x() and e.target.y() — the Konva node's canvas position
    // Convert from canvas pixels to world inches
    const worldX = (nodeX - panX) / (zoom * SCALE)
    const worldY = (nodeY - panY) / (zoom * SCALE)

    const finalX = Math.round(worldX * 4) / 4
    const finalY = Math.round(worldY * 4) / 4

    push({ members, connections, dimensions, groupNames })
    for (const [sid, off] of Object.entries(dragOffsets.current)) {
      const sm = members.find(m => m.id === sid)
      if (!sm) continue
      updateMember(sid, { position: { ...sm.position, x: finalX + off.dx, y: finalY + off.dy } })
    }
    dragOffsets.current = {}
  }, [zoom, panX, panY, members, connections, dimensions, groupNames, push, updateMember])

  const handleConnectionClick = useCallback((id: string) => {
    setSelectedConnectionId(id)
    setSelectedIds([])
    setSelectedDimensionId(null)
    setSelectedHole(null)
  }, [setSelectedConnectionId, setSelectedIds, setSelectedDimensionId])

  const handleDimensionClick = useCallback((id: string) => {
    setSelectedDimensionId(id)
    setSelectedIds([])
    setSelectedConnectionId(null)
    setSelectedHole(null)
  }, [setSelectedDimensionId, setSelectedIds, setSelectedConnectionId])

  const handleConnectionDialogSelect = useCallback((type: 'weld' | 'bolted' | 'flanged') => {
    if (!connDialog) return
    const memberA = members.find(m => m.id === connDialog.memberAId)
    const memberB = members.find(m => m.id === connDialog.memberBId)
    if (!memberA || !memberB) { setConnDialog(null); return }
    push({ members, connections, dimensions, groupNames })
    const newConn = {
      memberAId: connDialog.memberAId,
      memberBId: connDialog.memberBId,
      type,
      pointA: { ...memberA.position },
      pointB: { ...memberB.position },
    }
    addConnection(newConn)
    setConnDialog(null)
    setMode('select')
  }, [connDialog, members, connections, dimensions, groupNames, addConnection, push, setMode])

  const handleGroupDoubleClick = useCallback((groupId: string) => {
    setRenamingGroupId(groupId)
    setRenameValue(groupNames[groupId] ?? '')
  }, [groupNames])

  const handleRenameConfirm = useCallback(() => {
    if (!renamingGroupId) return
    renameGroup(renamingGroupId, renameValue.trim() || groupNames[renamingGroupId])
    setRenamingGroupId(null)
  }, [renamingGroupId, renameValue, groupNames, renameGroup])

  // CSS grid (full viewport coverage via background-image)
  const gridSpacingPx = zoom * SCALE
  const showGrid = gridSpacingPx >= 6
  const gridStyle: React.CSSProperties = showGrid ? {
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)',
    backgroundSize: `${gridSpacingPx}px ${gridSpacingPx}px`,
    backgroundPosition: `${panX % gridSpacingPx}px ${panY % gridSpacingPx}px`,
  } : {}

  // Collect unique groups
  const groupIds = Array.from(new Set(members.filter(m => m.groupId).map(m => m.groupId as string)))

  // Cursor style
  let cursor = 'default'
  if (mode === 'pan' || spaceDown.current) cursor = 'grab'
  else if (mode === 'dimension') cursor = 'crosshair'
  else if (mode === 'connect') cursor = 'cell'
  else if (activeRightTab === 'holes' && selectedIds.length === 1 && holePlacePreview) cursor = 'crosshair'

  return (
    <div
      ref={containerRef}
      className='w-full h-full'
      style={{ background: '#12151e', cursor, position: 'relative', touchAction: 'none', ...gridStyle }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {}}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ display: 'block' }}
      >
        {/* Main layer */}
        <Layer>
          {/* Group bounding boxes */}
          {groupIds.map(gid => {
            const gMembers = members.filter(m => m.groupId === gid)
            if (gMembers.length === 0) return null
            return (
              <GroupBoundingBox
                key={gid}
                groupId={gid}
                groupName={groupNames[gid] ?? gid.slice(0, 6)}
                members={gMembers}
                zoom={zoom}
                panX={panX}
                panY={panY}
                onDoubleClick={handleGroupDoubleClick}
              />
            )
          })}

          {/* Members */}
          {members.map(m => (
            <MemberNode
              key={m.id}
              m={m}
              mode={mode}
              zoom={zoom}
              panX={panX}
              panY={panY}
              selected={selectedIds.includes(m.id)}
              connectHighlight={connectFirstMemberId === m.id}
              onSelect={handleMemberSelect}
              onContextMenu={handleMemberContextMenu}
              onDragStart={handleMemberDragStart}
              onDragMove={handleMemberDragMove}
              onDragEnd={handleMemberDragEnd}
            />
          ))}

          {/* Dimensions */}
          {dimensions.map(dim => (
            <DimensionLine
              key={dim.id}
              dim={dim}
              zoom={zoom}
              panX={panX}
              panY={panY}
              selected={selectedDimensionId === dim.id}
              onClick={handleDimensionClick}
            />
          ))}

          {/* Dimension preview — FIRST_POINT_SET: dashed line to cursor */}
          {mode === 'dimension' && dimState === 'FIRST_POINT_SET' && dimPointA && dimMouse && (
            <Line
              points={[wx2cx(dimPointA.x, zoom, panX), wy2cy(dimPointA.y, zoom, panY),
                       wx2cx(dimMouse.x, zoom, panX),  wy2cy(dimMouse.y, zoom, panY)]}
              stroke='#facc15' strokeWidth={1} dash={[6, 3]} opacity={0.7} listening={false}
            />
          )}

          {/* Dimension preview — PULLING: live extension lines + measurement line */}
          {mode === 'dimension' && dimState === 'PULLING' && dimPointA && dimPointB && dimMouse && (() => {
            const abVec = { x: dimPointB.x - dimPointA.x, y: dimPointB.y - dimPointA.y }
            const abLen = Math.sqrt(abVec.x ** 2 + abVec.y ** 2)
            if (abLen < 0.01) return null
            const perpDir = { x: -abVec.y / abLen, y: abVec.x / abLen }
            const mid = { x: (dimPointA.x + dimPointB.x) / 2, y: (dimPointA.y + dimPointB.y) / 2 }
            const toMouse = { x: dimMouse.x - mid.x, y: dimMouse.y - mid.y }
            const signedDist = toMouse.x * perpDir.x + toMouse.y * perpDir.y
            const offsetDir = signedDist >= 0 ? perpDir : { x: -perpDir.x, y: -perpDir.y }
            const offWorld = Math.max(Math.abs(signedDist), 0.1)
            const S = zoom * SCALE, offPx = offWorld * S
            const ax = wx2cx(dimPointA.x, zoom, panX), ay = wy2cy(dimPointA.y, zoom, panY)
            const bx = wx2cx(dimPointB.x, zoom, panX), by = wy2cy(dimPointB.y, zoom, panY)
            const dax = ax + offsetDir.x * offPx, day = ay + offsetDir.y * offPx
            const dbx = bx + offsetDir.x * offPx, dby = by + offsetDir.y * offPx
            const midX = (dax + dbx) / 2, midY = (day + dby) / 2
            const label = formatDimension(abLen)
            const labelW = Math.max(label.length * 7, 42)
            return (
              <>
                <Line points={[ax, ay, dax, day]} stroke='#facc15' strokeWidth={1} listening={false} />
                <Line points={[bx, by, dbx, dby]} stroke='#facc15' strokeWidth={1} listening={false} />
                <Arrow points={[dax, day, dbx, dby]} stroke='#facc15' fill='#facc15'
                  strokeWidth={1.5} pointerAtBeginning pointerAtEnding pointerLength={8} pointerWidth={5} listening={false} />
                <Rect x={midX - labelW / 2} y={midY - 19} width={labelW} height={14}
                  fill='#0f1117' opacity={0.88} cornerRadius={2} listening={false} />
                <Text x={midX} y={midY - 17} text={label}
                  fontSize={Math.max(9, 10 * zoom)} fill='#facc15'
                  align='center' offsetX={labelW / 2} width={labelW} listening={false} />
              </>
            )
          })()}

          {/* Holes — rendered above members, interactive */}
          {members.flatMap(m =>
            (m.holes || []).map(hole => {
              const isSelected = selectedHole?.memberId === m.id && selectedHole?.holeId === hole.id
              return (
                <HoleNode
                  key={`${m.id}-${hole.id}`}
                  m={m} hole={hole} zoom={zoom} panX={panX} panY={panY}
                  selected={isSelected}
                  onSelect={() => {
                    setSelectedHole({ memberId: m.id, holeId: hole.id })
                    setSelectedIds([])
                    setSelectedConnectionId(null)
                    setSelectedDimensionId(null)
                  }}
                  onDelete={() => {
                    push({ members, connections, dimensions, groupNames })
                    updateMember(m.id, { holes: m.holes.filter(h => h.id !== hole.id) })
                    setSelectedHole(null)
                  }}
                  onDragEnd={(pos) => {
                    push({ members, connections, dimensions, groupNames })
                    updateMember(m.id, { holes: m.holes.map(h => h.id === hole.id ? { ...h, positionAlongMember: pos } : h) })
                  }}
                />
              )
            })
          )}

          {/* Connections — rendered above members so dots are visible */}
          {connections.map(conn => (
            <ConnectionDot
              key={conn.id}
              conn={conn}
              zoom={zoom}
              panX={panX}
              panY={panY}
              selected={selectedConnectionId === conn.id}
              onClick={handleConnectionClick}
            />
          ))}

          {/* Hole placement preview circle */}
          {activeRightTab === 'holes' && selectedIds.length === 1 && holePlacePreview && (
            <Circle
              x={holePlacePreview.canvasX}
              y={holePlacePreview.canvasY}
              radius={Math.max(6 * zoom, 4)}
              stroke='#f97316'
              strokeWidth={2}
              fill='rgba(249,115,22,0.2)'
              dash={[4, 3]}
              listening={false}
            />
          )}

          {/* Connect mode first member indicator */}
          {mode === 'connect' && connectFirstMemberId && (() => {
            const m = members.find(mb => mb.id === connectFirstMemberId)
            if (!m) return null
            const cx = wx2cx(m.position.x, zoom, panX)
            const cy = wy2cy(m.position.y, zoom, panY)
            return (
              <Circle x={cx} y={cy} radius={10} stroke='#22c55e' strokeWidth={2}
                fill='transparent' dash={[4, 3]} listening={false} />
            )
          })()}
        </Layer>

        {/* Selection rectangle overlay */}
        {selRect && (
          <Layer listening={false}>
            <Rect
              x={selRect.x} y={selRect.y}
              width={selRect.w} height={selRect.h}
              stroke='#f97316' strokeWidth={1.5}
              fill='rgba(249,115,22,0.08)'
              dash={[6, 3]}
            />
          </Layer>
        )}


      </Stage>

      {/* Empty state */}
      {members.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ textAlign: 'center', color: '#334155' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>◻</div>
            <div style={{ fontSize: 14 }}>Add a member from the Library panel</div>
          </div>
        </div>
      )}

      {/* Connection dialog */}
      {connDialog && (
        <ConnectionDialog
          onSelect={handleConnectionDialogSelect}
          onCancel={() => { setConnDialog(null); setConnectFirstMemberId(null) }}
        />
      )}

      {/* Group rename input */}
      {renamingGroupId && (() => {
        const gMembers = members.filter(m => m.groupId === renamingGroupId)
        if (gMembers.length === 0) return null
        // Find approximate screen position
        const avgX = gMembers.reduce((s, m) => s + wx2cx(m.position.x, zoom, panX), 0) / gMembers.length
        const minY = Math.min(...gMembers.map(m => wy2cy(m.position.y, zoom, panY)))
        return (
          <div style={{
            position: 'absolute',
            left: avgX - 60,
            top: minY - 50,
            zIndex: 100,
          }}>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={handleRenameConfirm}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameConfirm()
                if (e.key === 'Escape') setRenamingGroupId(null)
              }}
              style={{
                background: '#1a1d27',
                border: '1px solid #a855f7',
                borderRadius: 4,
                color: '#e2e8f0',
                padding: '2px 8px',
                fontSize: 12,
                outline: 'none',
                width: 120,
              }}
            />
          </div>
        )
      })()}
    </div>
  )
}

// ─── HoleNode — interactive hole circle at world coords ──────────────────────
function HoleNode({
  m, hole, zoom, panX, panY, selected,
  onSelect, onDelete, onDragEnd,
}: {
  m: Member; hole: Hole; zoom: number; panX: number; panY: number
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onDragEnd: (posAlongMember: number) => void
}) {
  const R = (m.rotation.y * Math.PI) / 180
  const cosR = Math.cos(R), sinR = Math.sin(R)
  const startX = m.position.x - cosR * m.length / 2
  const startY = m.position.y - sinR * m.length / 2
  const hWorldX = startX + cosR * hole.positionAlongMember
  const hWorldY = startY + sinR * hole.positionAlongMember
  const hCx = wx2cx(hWorldX, zoom, panX)
  const hCy = wy2cy(hWorldY, zoom, panY)
  const r = Math.max(hole.diameter / 2 * zoom * SCALE, 3)

  // Constrain drag to member axis, snap to quarter-points
  const dragBoundFunc = (pos: { x: number; y: number }) => {
    const wx = (pos.x - panX) / (zoom * SCALE)
    const wy = (pos.y - panY) / (zoom * SCALE)
    const vx = wx - startX, vy = wy - startY
    let t = Math.max(0, Math.min(m.length, vx * cosR + vy * sinR))
    // Snap to endpoint, quarter, midpoint, three-quarter, endpoint
    const snapPts = [0, m.length * 0.25, m.length * 0.5, m.length * 0.75, m.length]
    for (const sp of snapPts) {
      if (Math.abs(t - sp) * zoom * SCALE < 10) { t = sp; break }
    }
    return {
      x: (startX + cosR * t) * zoom * SCALE + panX,
      y: (startY + sinR * t) * zoom * SCALE + panY,
    }
  }

  return (
    <Group>
      <Circle
        x={hCx} y={hCy} radius={r}
        fill='rgba(0,0,0,0.82)'
        stroke={selected ? '#f97316' : 'rgba(255,255,255,0.45)'}
        strokeWidth={selected ? 2.5 : 1}
        draggable={selected}
        dragBoundFunc={selected ? dragBoundFunc : undefined}
        onClick={(e) => { e.cancelBubble = true; onSelect() }}
        onDragEnd={(e) => {
          const wx = (e.target.x() - panX) / (zoom * SCALE)
          const wy = (e.target.y() - panY) / (zoom * SCALE)
          const vx = wx - startX, vy = wy - startY
          const t = Math.max(0, Math.min(m.length, vx * cosR + vy * sinR))
          onDragEnd(t)
          // Reset to original; re-render will show new position from store
          e.target.x(hCx)
          e.target.y(hCy)
        }}
      />
      {/* Delete button when selected */}
      {selected && (
        <Group
          x={hCx + r + 3} y={hCy - r - 3}
          onClick={(e) => { e.cancelBubble = true; onDelete() }}
        >
          <Circle radius={7} fill='#ef4444' listening />
          <Text text='×' fontSize={12} fill='#fff'
            align='center' verticalAlign='middle'
            offsetX={3.5} offsetY={6}
            listening={false} />
        </Group>
      )}
    </Group>
  )
}

// ---- MemberNode moved below to allow all helpers to be in scope ----
function MemberNode({
  m, mode, zoom, panX, panY, selected, connectHighlight,
  onSelect, onContextMenu, onDragStart, onDragMove, onDragEnd,
}: {
  m: Member
  mode: string
  zoom: number
  panX: number
  panY: number
  selected: boolean
  connectHighlight: boolean
  onSelect: (id: string, shift: boolean) => void
  onContextMenu: (id: string, x: number, y: number) => void
  onDragStart: (id: string) => void
  onDragMove: (id: string, cx: number, cy: number) => void
  onDragEnd: (id: string, cx: number, cy: number) => void
}) {
  const cx = wx2cx(m.position.x, zoom, panX)
  const cy = wy2cy(m.position.y, zoom, panY)
  const angle = m.rotation.y

  const { height } = parseSizeString(m.type, m.size)
  const h = height * zoom * SCALE
  const len = m.length * zoom * SCALE
  const showLabel = zoom > 0.3

  return (
    <Group
      x={cx}
      y={cy}
      rotation={angle}
      draggable={mode === 'select'}
      onClick={(e) => {
        e.cancelBubble = true
        onSelect(m.id, e.evt.shiftKey)
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault()
        e.cancelBubble = true
        onContextMenu(m.id, e.evt.clientX, e.evt.clientY)
      }}
      onDragStart={() => onDragStart(m.id)}
      onDragMove={(e) => onDragMove(m.id, e.target.x(), e.target.y())}
      onDragEnd={(e) => {
        onDragEnd(m.id, e.target.x(), e.target.y())
        e.target.x(cx)
        e.target.y(cy)
      }}
    >
      <MemberShape m={m} zoom={zoom} selected={selected} />

      {/* Dimension label */}
      {showLabel && (
        <Text
          x={0}
          y={-h / 2 - 14}
          text={`${m.length}"`}
          fontSize={Math.max(10, 11 * zoom)}
          fill='rgba(255,255,255,0.7)'
          align='center'
          offsetX={20}
          listening={false}
        />
      )}

      {/* Selection glow */}
      {selected && (
        <Rect
          x={-len / 2 - 4}
          y={-h / 2 - 4}
          width={len + 8}
          height={h + 8}
          stroke='rgba(249,115,22,0.5)'
          strokeWidth={6}
          fill='transparent'
          dash={[6, 4]}
          listening={false}
        />
      )}

      {/* Connect highlight */}
      {connectHighlight && (
        <Rect
          x={-len / 2 - 6}
          y={-h / 2 - 6}
          width={len + 12}
          height={h + 12}
          stroke='#22c55e'
          strokeWidth={2}
          fill='transparent'
          dash={[4, 3]}
          listening={false}
        />
      )}
    </Group>
  )
}
