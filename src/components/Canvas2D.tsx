import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Group, Rect, Circle, Line, Text, Ellipse, Arrow } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { parseSizeString } from '../lib/materials'
import type { Member, Connection, Dimension } from '../types'
import ConnectionDialog from './ConnectionDialog'
import { useSnapEngine } from '../hooks/useSnapEngine'
import type { SnapResult, SnapPoint } from '../hooks/useSnapEngine'
import { SNAP_HOVER_MS, SNAP_MOVE_CANCEL_PX } from '../hooks/useSnapEngine'

const SCALE = 8 // pixels per inch

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

// Dimension line rendering
function DimensionLine({
  dim, zoom, panX, panY, selected,
  onClick,
}: {
  dim: Dimension
  zoom: number
  panX: number
  panY: number
  selected: boolean
  onClick: (id: string) => void
}) {
  const S = zoom * SCALE
  const offsetPx = dim.offset * S

  const sx = wx2cx(dim.startX, zoom, panX)
  const sy = wy2cy(dim.startY, zoom, panY)
  const ex = wx2cx(dim.endX, zoom, panX)
  const ey = wy2cy(dim.endY, zoom, panY)

  // Direction of dimension line
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 2) return null

  // Perpendicular unit vector (upward = negative y in canvas)
  const ux = -dy / len
  const uy = dx / len

  // Offset the dimension line endpoints
  const dsx = sx + ux * offsetPx
  const dsy = sy + uy * offsetPx
  const dex = ex + ux * offsetPx
  const dey = ey + uy * offsetPx

  const midX = (dsx + dex) / 2
  const midY = (dsy + dey) / 2

  const totalInches = Math.sqrt(
    (dim.endX - dim.startX) ** 2 + (dim.endY - dim.startY) ** 2
  )
  const label = formatDimension(totalInches)

  const color = selected ? '#facc15' : '#e2e8f0'
  const extLen = 8

  return (
    <Group onClick={() => onClick(dim.id)}>
      {/* Extension lines */}
      <Line
        points={[sx, sy, dsx - ux * extLen, dsy - uy * extLen]}
        stroke={color} strokeWidth={1} opacity={0.7} listening={false}
      />
      <Line
        points={[ex, ey, dex - ux * extLen, dey - uy * extLen]}
        stroke={color} strokeWidth={1} opacity={0.7} listening={false}
      />
      {/* Dimension arrow line */}
      <Arrow
        points={[dsx, dsy, dex, dey]}
        stroke={color}
        fill={color}
        strokeWidth={1.5}
        pointerAtBeginning={true}
        pointerAtEnding={true}
        pointerLength={8}
        pointerWidth={5}
        listening={false}
      />
      {/* Invisible hit target */}
      <Line
        points={[dsx, dsy, dex, dey]}
        stroke='transparent'
        strokeWidth={12}
        hitStrokeWidth={12}
      />
      {/* Label */}
      <Text
        x={midX}
        y={midY - 16}
        text={label}
        fontSize={Math.max(10, 11 * zoom)}
        fill={color}
        align='center'
        offsetX={30}
        listening={false}
      />
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
  } = useUIStore()
  const { push } = useHistoryStore()

  // Dimension tool state
  const [dimStart, setDimStart] = useState<{ x: number; y: number } | null>(null)
  const [dimPreview, setDimPreview] = useState<{ x: number; y: number } | null>(null)

  // Alignment guides state
  const [alignGuides, setAlignGuides] = useState<{ hLines: number[]; vLines: number[] }>({ hLines: [], vLines: [] })

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

  // Multi-drag state
  const dragOffsets = useRef<DragOffsets>({})

  // Right-drag tracking (suppress context menu when drag occurred)
  const rightDragMoved = useRef(false)
  const rightDragStart = useRef<{ x: number; y: number } | null>(null)

  // Snap engine — pure nearest-point finder, no timer
  const { findNearest, snapResultRef } = useSnapEngine(members, zoom, panX, panY)
  const snapCanvasRef = useRef<HTMLCanvasElement>(null)

  // Hover-timer state for 180ms deliberate-pause activation
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapCandidateRef = useRef<SnapPoint | null>(null)
  const snapCandidateScreenRef = useRef<{ x: number; y: number } | null>(null)

  // Ref to always-current drawSnapLayer, safe to call from timer callbacks
  const drawSnapLayerRef = useRef<(r: SnapResult) => void>(() => {})

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

  // Draw snap indicators on the overlay canvas — imperative, no React re-renders
  const drawSnapLayer = useCallback((result: SnapResult) => {
    const canvas = snapCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!result.active || !result.point) return

    const snap = result.point
    const scx = snap.worldX * zoom * SCALE + panX
    const scy = snap.worldY * zoom * SCALE + panY
    const GREEN = '#00ff41'

    ctx.strokeStyle = GREEN
    ctx.lineWidth = 1.5
    ctx.setLineDash([])

    // Green square marker for all snap types
    ctx.strokeRect(scx - 5, scy - 5, 10, 10)

    // Tooltip: dark bg + white label
    const LABELS: Record<string, string> = {
      endpoint: 'Endpoint', corner: 'Corner', center: 'Center', midpoint: 'Midpoint',
    }
    const label = LABELS[snap.type] ?? snap.type
    ctx.font = '11px sans-serif'
    const tw = ctx.measureText(label).width
    const tx = scx + 14
    const ty = scy - 6
    ctx.fillStyle = '#1a1d27'
    ctx.fillRect(tx - 4, ty - 12, tw + 8, 18)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, tx, ty)

    // Full-viewport tracking lines edge-to-edge
    ctx.setLineDash([6, 3])
    ctx.lineWidth = 1
    ctx.strokeStyle = '#ff4444'
    ctx.beginPath(); ctx.moveTo(0, scy); ctx.lineTo(canvas.width, scy); ctx.stroke()
    ctx.strokeStyle = '#4444ff'
    ctx.beginPath(); ctx.moveTo(scx, 0); ctx.lineTo(scx, canvas.height); ctx.stroke()
    ctx.setLineDash([])
  }, [zoom, panX, panY])

  // Keep drawSnapLayerRef current so timer callbacks never use a stale closure
  useEffect(() => { drawSnapLayerRef.current = drawSnapLayer }, [drawSnapLayer])

  /**
   * updateSnap — called on every mousemove.
   * Implements the 180ms deliberate-hover activation:
   *   - cursor enters aperture  → start timer, no indicators yet
   *   - cursor moves >4px       → cancel timer, stay inactive
   *   - 180ms elapses           → activate, draw indicators
   *   - cursor leaves aperture  → cancel timer, clear indicators
   */
  const updateSnap = useCallback((canvasX: number, canvasY: number) => {
    const { best, mouseWorldX, mouseWorldY } = findNearest(canvasX, canvasY)

    if (!best) {
      // Nothing in aperture — cancel any pending timer, deactivate immediately
      if (snapTimerRef.current) { clearTimeout(snapTimerRef.current); snapTimerRef.current = null }
      snapCandidateRef.current = null
      snapCandidateScreenRef.current = null
      const inactive: SnapResult = { active: false, point: null, lockedX: mouseWorldX, lockedY: mouseWorldY }
      snapResultRef.current = inactive
      drawSnapLayerRef.current(inactive)
      return
    }

    const prev = snapCandidateRef.current
    const prevScreen = snapCandidateScreenRef.current

    const isSamePoint = prev !== null &&
      Math.abs(prev.worldX - best.worldX) < 0.001 &&
      Math.abs(prev.worldY - best.worldY) < 0.001

    if (isSamePoint && prevScreen) {
      // Same snap point — check if cursor moved too much
      const moved = Math.hypot(canvasX - prevScreen.x, canvasY - prevScreen.y)
      if (moved > SNAP_MOVE_CANCEL_PX) {
        // Moved too much: cancel timer, deactivate, restart timer from current screen pos
        if (snapTimerRef.current) { clearTimeout(snapTimerRef.current); snapTimerRef.current = null }
        snapCandidateScreenRef.current = { x: canvasX, y: canvasY }
        const inactive: SnapResult = { active: false, point: null, lockedX: mouseWorldX, lockedY: mouseWorldY }
        snapResultRef.current = inactive
        drawSnapLayerRef.current(inactive)
        const captured = best
        snapTimerRef.current = setTimeout(() => {
          const activated: SnapResult = { active: true, point: captured, lockedX: captured.worldX, lockedY: captured.worldY }
          snapResultRef.current = activated
          drawSnapLayerRef.current(activated)
          snapTimerRef.current = null
        }, SNAP_HOVER_MS)
      }
      // If not moved too much: let timer run (or keep active state if already fired)
      return
    }

    // New snap point — reset and start fresh timer
    if (snapTimerRef.current) { clearTimeout(snapTimerRef.current); snapTimerRef.current = null }
    snapCandidateRef.current = best
    snapCandidateScreenRef.current = { x: canvasX, y: canvasY }
    const inactive: SnapResult = { active: false, point: null, lockedX: mouseWorldX, lockedY: mouseWorldY }
    snapResultRef.current = inactive
    drawSnapLayerRef.current(inactive) // clear any previous indicator while waiting

    const captured = best
    snapTimerRef.current = setTimeout(() => {
      const activated: SnapResult = { active: true, point: captured, lockedX: captured.worldX, lockedY: captured.worldY }
      snapResultRef.current = activated
      drawSnapLayerRef.current(activated)
      snapTimerRef.current = null
    }, SNAP_HOVER_MS)
  }, [findNearest, snapResultRef])

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); spaceDown.current = true }

      if (e.code === 'Escape') {
        setSelectedIds([])
        setSelectedConnectionId(null)
        setSelectedDimensionId(null)
        setDimStart(null)
        setDimPreview(null)
        setConnectFirstMemberId(null)
        return
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        // Don't delete if renaming
        if (renamingGroupId) return
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
    selectedIds, selectedConnectionId, selectedDimensionId, renamingGroupId,
    members, connections, dimensions, groupNames,
    deleteMembers, deleteConnection, deleteDimension, groupMembers, ungroupMembers,
    setSelectedIds, setSelectedConnectionId, setSelectedDimensionId,
    setConnectFirstMemberId, push,
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

    // Dimension mode — use snap-locked position
    if (mode === 'dimension') {
      const sr = snapResultRef.current
      const sx = sr.active ? sr.lockedX : snapToGrid(cx2wx(pos.x, zoom, panX))
      const sy = sr.active ? sr.lockedY : snapToGrid(cy2wy(pos.y, zoom, panY))

      if (!dimStart) {
        setDimStart({ x: sx, y: sy })
      } else {
        push({ members, connections, dimensions, groupNames })
        addDimension({ startX: dimStart.x, startY: dimStart.y, endX: sx, endY: sy, offset: 3 })
        setDimStart(null)
        setDimPreview(null)
      }
      return
    }

    // Left click on stage background = deselect
    if (e.target === stage) {
      setSelectedIds([])
      setSelectedConnectionId(null)
      setSelectedDimensionId(null)
      setContextMenu(null)
      setConnectFirstMemberId(null)
    }
  }, [
    mode, panX, panY, zoom, dimStart, members, connections, dimensions, groupNames,
    snapResultRef,
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

    // Update snap hover timer on every mousemove — imperative, no React re-render
    const pos = stageRef.current?.getPointerPosition()
    if (pos) updateSnap(pos.x, pos.y)

    if (selStart.current) {
      if (!pos) return
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

    // Dimension preview — use snap-locked position
    if (mode === 'dimension' && dimStart) {
      if (!pos) return
      const sr = snapResultRef.current
      setDimPreview({ x: sr.lockedX, y: sr.lockedY })
    }
  }, [setPan, updateSnap, snapResultRef, mode, dimStart])

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
    setContextMenu(null)
  }, [
    mode, connectFirstMemberId, setConnectFirstMemberId,
    toggleSelectedId, setSelectedIds, setSelectedConnectionId,
    setSelectedDimensionId, setContextMenu,
  ])

  const handleMemberContextMenu = useCallback((id: string, x: number, y: number) => {
    if (!selectedIds.includes(id)) setSelectedIds([id])
    setContextMenu({ x, y, type: 'member', memberId: id })
  }, [selectedIds, setSelectedIds, setContextMenu])

  const handleMemberDragStart = useCallback((id: string) => {
    setAlignGuides({ hLines: [], vLines: [] })
    // Cancel any pending hover timer and reset snap state completely
    if (snapTimerRef.current) { clearTimeout(snapTimerRef.current); snapTimerRef.current = null }
    snapCandidateRef.current = null
    snapCandidateScreenRef.current = null
    snapResultRef.current = { active: false, point: null, lockedX: 0, lockedY: 0 }
    const sc = snapCanvasRef.current
    if (sc) sc.getContext('2d')?.clearRect(0, 0, sc.width, sc.height)
    // Record offsets for all selected members relative to dragged member
    const dragged = members.find(m => m.id === id)
    if (!dragged) return
    const ids = selectedIds.includes(id) ? selectedIds : [id]
    const offsets: DragOffsets = {}
    for (const sid of ids) {
      const sm = members.find(m => m.id === sid)
      if (sm) {
        offsets[sid] = {
          dx: sm.position.x - dragged.position.x,
          dy: sm.position.y - dragged.position.y,
        }
      }
    }
    dragOffsets.current = offsets
  }, [members, selectedIds])

  const handleMemberDragMove = useCallback((_id: string, _cx: number, _cy: number) => {
    // No state updates here — any React re-render during a Konva drag resets the
    // Konva node's x/y props to the store position, causing the member to jump.
    // Snap indicators are handled by handleStageMouseMove + drawSnapLayer (no re-renders).
  }, [])

  const handleMemberDragEnd = useCallback((id: string, canvasX: number, canvasY: number) => {
    setAlignGuides({ hLines: [], vLines: [] })
    // Cancel any hover timer that fired or was pending during drag
    if (snapTimerRef.current) { clearTimeout(snapTimerRef.current); snapTimerRef.current = null }
    const sc = snapCanvasRef.current
    if (sc) sc.getContext('2d')?.clearRect(0, 0, sc.width, sc.height)

    // Use snap only if it was actively engaged at release time (active=true in ref)
    // — the timer must have fired AND cursor must still be within aperture
    const sr = snapResultRef.current
    const snappedX = sr.active ? sr.lockedX : snapToGrid(cx2wx(canvasX, zoom, panX))
    const snappedY = sr.active ? sr.lockedY : snapToGrid(cy2wy(canvasY, zoom, panY))

    // Reset for next interaction
    snapCandidateRef.current = null
    snapCandidateScreenRef.current = null
    snapResultRef.current = { active: false, point: null, lockedX: 0, lockedY: 0 }

    push({ members, connections, dimensions, groupNames })
    for (const [sid, off] of Object.entries(dragOffsets.current)) {
      const sm = members.find(m => m.id === sid)
      if (!sm) continue
      updateMember(sid, { position: { ...sm.position, x: snapToGrid(snappedX + off.dx), y: snapToGrid(snappedY + off.dy) } })
    }
    dragOffsets.current = {}
  }, [zoom, panX, panY, members, connections, dimensions, groupNames, push, updateMember, snapResultRef])

  const handleConnectionClick = useCallback((id: string) => {
    setSelectedConnectionId(id)
    setSelectedIds([])
    setSelectedDimensionId(null)
  }, [setSelectedConnectionId, setSelectedIds, setSelectedDimensionId])

  const handleDimensionClick = useCallback((id: string) => {
    setSelectedDimensionId(id)
    setSelectedIds([])
    setSelectedConnectionId(null)
  }, [setSelectedDimensionId, setSelectedIds, setSelectedConnectionId])

  const handleConnectionDialogSelect = useCallback((type: 'weld' | 'bolted' | 'flanged') => {
    if (!connDialog) return
    const memberA = members.find(m => m.id === connDialog.memberAId)
    const memberB = members.find(m => m.id === connDialog.memberBId)
    if (!memberA || !memberB) { setConnDialog(null); return }
    push({ members, connections, dimensions, groupNames })
    addConnection({
      memberAId: connDialog.memberAId,
      memberBId: connDialog.memberBId,
      type,
      pointA: { ...memberA.position },
      pointB: { ...memberB.position },
    })
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

  return (
    <div
      ref={containerRef}
      className='w-full h-full'
      style={{ background: '#12151e', cursor, position: 'relative', ...gridStyle }}
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

          {/* Connections */}
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

          {/* Members */}
          {members.map(m => (
            <MemberNode
              key={m.id}
              m={m}
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

          {/* Dimension preview line */}
          {mode === 'dimension' && dimStart && dimPreview && (
            <Line
              points={[
                wx2cx(dimStart.x, zoom, panX), wy2cy(dimStart.y, zoom, panY),
                wx2cx(dimPreview.x, zoom, panX), wy2cy(dimPreview.y, zoom, panY),
              ]}
              stroke='#facc15'
              strokeWidth={1}
              dash={[6, 3]}
              opacity={0.6}
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

        {/* Alignment guide lines */}
        {(alignGuides.hLines.length > 0 || alignGuides.vLines.length > 0) && (
          <Layer listening={false}>
            {alignGuides.hLines.map((wy, i) => (
              <Line key={`h${i}`} points={[0, wy2cy(wy, zoom, panY), size.w, wy2cy(wy, zoom, panY)]}
                stroke='#ef4444' strokeWidth={1} dash={[8, 4]} opacity={0.8} listening={false} />
            ))}
            {alignGuides.vLines.map((wx, i) => (
              <Line key={`v${i}`} points={[wx2cx(wx, zoom, panX), 0, wx2cx(wx, zoom, panX), size.h]}
                stroke='#3b82f6' strokeWidth={1} dash={[8, 4]} opacity={0.8} listening={false} />
            ))}
          </Layer>
        )}
      </Stage>

      {/* Snap indicator overlay — drawn imperatively on every mousemove, zero React re-renders */}
      <canvas
        ref={snapCanvasRef}
        width={size.w}
        height={size.h}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />

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

// ---- MemberNode moved below to allow all helpers to be in scope ----
function MemberNode({
  m, zoom, panX, panY, selected, connectHighlight,
  onSelect, onContextMenu, onDragStart, onDragMove, onDragEnd,
}: {
  m: Member
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
      draggable
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

      {/* Holes */}
      {m.holes.map(hole => {
        const t = hole.positionAlongMember / m.length - 0.5
        const hx = t * len
        const r = Math.max(hole.diameter / 2 * zoom * SCALE, 2)
        return (
          <Circle key={hole.id} x={hx} y={0} radius={r}
            fill='rgba(0,0,0,0.8)' stroke='rgba(255,255,255,0.6)' strokeWidth={1} listening={false} />
        )
      })}

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
