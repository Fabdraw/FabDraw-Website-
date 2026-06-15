import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Group, Rect, Circle, Line, Text, Ellipse } from 'react-konva'
import type Konva from 'konva'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { parseSizeString } from '../lib/materials'
import type { Member, Connection } from '../types'

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

// Draw the cross-section shape for a member (centered at 0,0, along X axis)
function MemberShape({ m, zoom, selected }: { m: Member; zoom: number; selected: boolean }) {
  const { width, height } = parseSizeString(m.type, m.size)
  const wall = parseFloat(m.wallThickness) || 0.12
  const S = zoom * SCALE
  const len = m.length * S
  const w = width * S   // visual height (perpendicular to length)
  const h = height * S  // visual height
  const wt = Math.max(wall * S, 1)
  const color = getMemberColor(m, selected)
  const stroke = selected ? '#f97316' : color
  const strokeW = selected ? 2 : 1.5

  // Upright: render as small square/circle overhead view
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
      const iw = Math.max(w - wt * 2, 2)
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
      const fw = w   // flange width (visual height)
      const fh = wt * 1.5
      const webH = fw - fh * 2
      return (
        <Group>
          {/* Top flange */}
          <Rect x={-hw} y={-fw / 2} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          {/* Bottom flange */}
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          {/* Web */}
          <Rect x={-hw} y={-webH / 2} width={len} height={webH} fill={color + '44'} stroke={stroke} strokeWidth={strokeW} />
        </Group>
      )
    }
    case 'channel': {
      const fw = w
      const fh = wt * 1.5
      return (
        <Group>
          {/* Top flange */}
          <Rect x={-hw} y={-fw / 2} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          {/* Bottom flange */}
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          {/* Web (left side) */}
          <Rect x={-hw} y={-fw / 2} width={wt} height={fw} fill={color + '66'} stroke={stroke} strokeWidth={strokeW} />
        </Group>
      )
    }
    case 'angle': {
      const fw = w
      const fh = wt * 1.5
      return (
        <Group>
          {/* Horizontal leg */}
          <Rect x={-hw} y={fw / 2 - fh} width={len} height={fh} fill={color + '88'} stroke={stroke} strokeWidth={strokeW} />
          {/* Vertical leg */}
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

function MemberNode({
  m,
  zoom,
  panX,
  panY,
  selected,
  onSelect,
  onContextMenu,
  onDragEnd,
}: {
  m: Member
  zoom: number
  panX: number
  panY: number
  selected: boolean
  onSelect: (id: string, shift: boolean) => void
  onContextMenu: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, cx: number, cy: number) => void
}) {
  const cx = wx2cx(m.position.x, zoom, panX)
  const cy = wy2cy(m.position.y, zoom, panY)
  const angle = m.rotation.y

  const { width, height } = parseSizeString(m.type, m.size)
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
      onDragEnd={(e) => {
        onDragEnd(m.id, e.target.x(), e.target.y())
        // Reset visual position — store will re-render with correct coords
        e.target.x(cx)
        e.target.y(cy)
      }}
    >
      <MemberShape m={m} zoom={zoom} selected={selected} />

      {/* Holes */}
      {m.holes.map(hole => {
        const t = hole.positionAlongMember / m.length - 0.5 // -0.5 to 0.5
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
          x={-m.length * zoom * SCALE / 2 - 4}
          y={-height * zoom * SCALE / 2 - 4}
          width={m.length * zoom * SCALE + 8}
          height={height * zoom * SCALE + 8}
          stroke='rgba(249,115,22,0.5)'
          strokeWidth={6}
          fill='transparent'
          dash={[6, 4]}
          listening={false}
        />
      )}
    </Group>
  )
}

function ConnectionDot({ conn, zoom, panX, panY }: { conn: Connection; zoom: number; panX: number; panY: number }) {
  const color = conn.type === 'weld' ? '#f97316' : conn.type === 'bolted' ? '#22c55e' : '#a855f7'
  const ax = wx2cx(conn.pointA.x, zoom, panX)
  const ay = wy2cy(conn.pointA.y, zoom, panY)
  const bx = wx2cx(conn.pointB.x, zoom, panX)
  const by = wy2cy(conn.pointB.y, zoom, panY)
  const r = Math.max(4, 5 * zoom)
  return (
    <Group listening={false}>
      <Circle x={ax} y={ay} radius={r} fill={color} opacity={0.85} />
      <Circle x={bx} y={by} radius={r} fill={color} opacity={0.85} />
    </Group>
  )
}

export default function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const { project, updateMember } = useProjectStore()
  const { members, connections } = project
  const {
    panX, panY, zoom, setPan, setZoom, setPanZoom,
    selectedIds, setSelectedIds, toggleSelectedId,
    mode, setContextMenu,
  } = useUIStore()
  const { push } = useHistoryStore()

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

  // Selection rect state
  const [selRect, setSelRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selStart = useRef<{ x: number; y: number } | null>(null)
  const isPanning = useRef(false)
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const spaceDown = useRef(false)

  // Keyboard: space for pan
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); spaceDown.current = true } }
    const onUp = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [])

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

    // Right mouse = selection rect (on stage background only)
    if (e.evt.button === 2 && e.target === stage) {
      selStart.current = { x: pos.x, y: pos.y }
      setSelRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
      return
    }

    // Left click on background = deselect
    if (e.evt.button === 0 && e.target === stage) {
      setSelectedIds([])
      setContextMenu(null)
    }
  }, [mode, panX, panY, setSelectedIds, setContextMenu])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current && panStart.current) {
      const dx = e.evt.clientX - panStart.current.x
      const dy = e.evt.clientY - panStart.current.y
      setPan(panStart.current.panX + dx, panStart.current.panY + dy)
      return
    }
    if (selStart.current) {
      const stage = stageRef.current
      const pos = stage?.getPointerPosition()
      if (!pos) return
      setSelRect({
        x: Math.min(selStart.current.x, pos.x),
        y: Math.min(selStart.current.y, pos.y),
        w: Math.abs(pos.x - selStart.current.x),
        h: Math.abs(pos.y - selStart.current.y),
      })
    }
  }, [setPan])

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) { isPanning.current = false; panStart.current = null; return }
    if (selStart.current && selRect) {
      // Select members whose canvas center is inside the rect
      const ids = members.filter(m => {
        const cx = wx2cx(m.position.x, zoom, panX)
        const cy = wy2cy(m.position.y, zoom, panY)
        return cx >= selRect.x && cx <= selRect.x + selRect.w && cy >= selRect.y && cy <= selRect.y + selRect.h
      }).map(m => m.id)
      setSelectedIds(ids)
      selStart.current = null
      setSelRect(null)
    }
  }, [selRect, members, zoom, panX, panY, setSelectedIds])

  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault()
    if (e.target === stageRef.current) {
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, type: 'canvas' })
    }
  }, [setContextMenu])

  const handleMemberSelect = useCallback((id: string, shift: boolean) => {
    if (shift) toggleSelectedId(id)
    else setSelectedIds([id])
    setContextMenu(null)
  }, [toggleSelectedId, setSelectedIds, setContextMenu])

  const handleMemberContextMenu = useCallback((id: string, x: number, y: number) => {
    if (!selectedIds.includes(id)) setSelectedIds([id])
    setContextMenu({ x, y, type: 'member', memberId: id })
  }, [selectedIds, setSelectedIds, setContextMenu])

  const handleMemberDragEnd = useCallback((id: string, canvasX: number, canvasY: number) => {
    const wx = cx2wx(canvasX, zoom, panX)
    const wy = cy2wy(canvasY, zoom, panY)
    // Snap to 1" grid
    const snappedX = Math.round(wx)
    const snappedY = Math.round(wy)
    const m = members.find(m => m.id === id)
    if (!m) return
    push({ members, connections })
    updateMember(id, { position: { ...m.position, x: snappedX, y: snappedY } })
  }, [zoom, panX, panY, members, connections, push, updateMember])

  // Grid dots
  const gridSpacingPx = zoom * SCALE // 1 inch in pixels
  const showGrid = gridSpacingPx >= 6
  const gridDots: React.ReactNode[] = []
  if (showGrid) {
    const startX = Math.floor(-panX / gridSpacingPx) * gridSpacingPx + panX
    const startY = Math.floor(-panY / gridSpacingPx) * gridSpacingPx + panY
    const cols = Math.ceil(size.w / gridSpacingPx) + 2
    const rows = Math.ceil(size.h / gridSpacingPx) + 2
    // Limit to 2500 dots
    const total = Math.min(cols * rows, 2500)
    for (let i = 0; i < total; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      gridDots.push(
        <Circle key={i} x={startX + col * gridSpacingPx} y={startY + row * gridSpacingPx}
          radius={0.8} fill='rgba(255,255,255,0.15)' listening={false} />
      )
    }
  }

  return (
    <div ref={containerRef} className='w-full h-full' style={{ background: '#12151e', cursor: mode === 'pan' || spaceDown.current ? 'grab' : 'default' }}>
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
        {/* Grid layer */}
        <Layer listening={false}>
          {gridDots}
        </Layer>

        {/* Members + connections */}
        <Layer>
          {connections.map(conn => (
            <ConnectionDot key={conn.id} conn={conn} zoom={zoom} panX={panX} panY={panY} />
          ))}
          {members.map(m => (
            <MemberNode
              key={m.id}
              m={m}
              zoom={zoom}
              panX={panX}
              panY={panY}
              selected={selectedIds.includes(m.id)}
              onSelect={handleMemberSelect}
              onContextMenu={handleMemberContextMenu}
              onDragEnd={handleMemberDragEnd}
            />
          ))}
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
    </div>
  )
}
