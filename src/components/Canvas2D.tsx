import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Group, Rect, Circle, Line, Text } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { SCALE, worldToCanvas, canvasToWorld, getVisualHeight, getWallPx, getSnapPoints, findSnap, toFeetInches } from '../lib/geometry'
import { getMaterial, getSizeValue, getWall } from '../lib/materials'
import type { Piece, Connection } from '../types'

const PIECE_COLORS: Record<string, string> = {
  square_tube: '#4d8fd4',
  round_tube: '#5ba3e8',
  rect_tube: '#4d8fd4',
  pipe: '#6b8fa8',
  angle: '#4a9068',
  channel: '#7060b8',
  ibeam: '#4870a8',
  flat_bar: '#a89040',
  sheet: '#a07860',
  plate: '#906850',
}

interface Props {
  stageRef: React.RefObject<Konva.Stage>
  containerRef: React.RefObject<HTMLDivElement>
}

export default function Canvas2D({ stageRef, containerRef }: Props) {
  const { project, updatePiece, removeConnectionsForPiece, addConnection, setPanZoom } = useProjectStore()
  const {
    mode, selectedIds, setSelectedIds, toggleSelectedId,
    snapPreview, setSnapPreview, isDragging, setIsDragging, setContextMenu,
    sketchMode, sketchPoints, addSketchPoint, clearSketch
  } = useUIStore()
  const { push } = useHistoryStore()
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [localPan, setLocalPan] = useState({ x: project.panX, y: project.panY })
  const [localZoom, setLocalZoom] = useState(project.zoom)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [containerRef])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sketchMode) {
        clearSketch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sketchMode, clearSketch])

  const getSV = useCallback((p: Piece) => {
    return getSizeValue(p.type, p.sizeIdx)
  }, [])

  const getVH = useCallback((p: Piece) => {
    const sv = getSV(p)
    return getVisualHeight(p.type, sv, p.customH, localZoom)
  }, [getSV, localZoom])

  const getWallP = useCallback((p: Piece) => {
    const wall = getWall(p.type, p.thkIdx)
    return Math.max(2, getWallPx(wall, localZoom))
  }, [localZoom])

  function getPieceColor(p: Piece) {
    return PIECE_COLORS[p.type] ?? '#4d8fd4'
  }

  function renderPiece(p: Piece, isSelected: boolean) {
    const [cx, cy] = worldToCanvas(p.x, p.y, localPan.x, localPan.y, localZoom)
    const color = getPieceColor(p)
    const vh = getVH(p)
    const wallPx = getWallP(p)
    const hw = vh / 2

    if (p.upright) {
      const sv = getSV(p)
      const s = (Array.isArray(sv) ? Math.max(sv[0], sv[1]) : sv) * SCALE * localZoom
      const isRound = getMaterial(p.type).isRound

      return (
        <Group
          key={p.id}
          x={cx}
          y={cy}
          onClick={() => setSelectedIds([p.id])}
          onContextMenu={(e) => {
            e.evt.preventDefault()
            setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, pieceId: p.id, connectionId: null })
          }}
        >
          {isRound ? (
            <>
              <Circle radius={s / 2} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <Circle radius={s / 2 - wallPx} fill="rgba(0,0,0,0.65)" />
            </>
          ) : (
            <>
              <Rect x={-s / 2} y={-s / 2} width={s} height={s} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <Rect x={-s / 2 + wallPx} y={-s / 2 + wallPx} width={s - wallPx * 2} height={s - wallPx * 2} fill="rgba(0,0,0,0.65)" />
            </>
          )}
          {isSelected && (
            <Rect x={-s / 2 - 3} y={-s / 2 - 3} width={s + 6} height={s + 6} stroke="#f97316" strokeWidth={2} dash={[4, 3]} fill="transparent" />
          )}
        </Group>
      )
    }

    const halfLen = p.length / 2 * SCALE * localZoom
    const t = p.type

    return (
      <Group
        key={p.id}
        x={cx}
        y={cy}
        rotation={p.angle}
        draggable
        onDragStart={() => {
          setIsDragging(true)
          removeConnectionsForPiece(p.id)
        }}
        onDragMove={(e) => {
          const pos = e.target.position()
          const [wx, wy] = canvasToWorld(pos.x, pos.y, localPan.x, localPan.y, localZoom)
          const tempP = { ...p, x: wx, y: wy }
          const snap = findSnap(tempP, project.pieces, localPan.x, localPan.y, localZoom, getSV)
          setSnapPreview(snap ? { x: snap.x, y: snap.y, color: snap.snapPoint.color, label: snap.snapPoint.label } : null)
        }}
        onDragEnd={(e) => {
          const pos = e.target.position()
          let [wx, wy] = canvasToWorld(pos.x, pos.y, localPan.x, localPan.y, localZoom)
          const tempP = { ...p, x: wx, y: wy }
          const snap = findSnap(tempP, project.pieces, localPan.x, localPan.y, localZoom, getSV)
          if (snap) { wx = snap.wx; wy = snap.wy }
          updatePiece(p.id, { x: wx, y: wy })
          if (snap) {
            addConnection({ p1: p.id, e1: snap.dragEndpoint, p2: snap.snapPoint.pieceId, e2: snap.snapPoint.endpoint, type: 'butt_weld' })
          }
          setSnapPreview(null)
          setIsDragging(false)
          push({ pieces: project.pieces, connections: project.connections })
        }}
        onClick={(e) => {
          if (e.evt.shiftKey) toggleSelectedId(p.id)
          else setSelectedIds([p.id])
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, pieceId: p.id, connectionId: null })
        }}
      >
        {/* Body shapes */}
        {(t === 'square_tube' || t === 'rect_tube') && (
          <>
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh} fill={color} opacity={1} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
            {halfLen * 2 - wallPx * 2 > 0 && vh - wallPx * 2 > 0 && (
              <Rect x={-halfLen + wallPx} y={-hw + wallPx} width={halfLen * 2 - wallPx * 2} height={vh - wallPx * 2} fill="rgba(0,0,0,0.7)" />
            )}
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh * 0.38} fill="rgba(255,255,255,0.09)" listening={false} />
          </>
        )}
        {(t === 'round_tube' || t === 'pipe') && (
          <>
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh} fill={color} opacity={1} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} cornerRadius={hw} />
            {halfLen * 2 - wallPx * 2 > 0 && vh - wallPx * 2 > 0 && (
              <Rect x={-halfLen + wallPx} y={-hw + wallPx} width={halfLen * 2 - wallPx * 2} height={vh - wallPx * 2} fill="rgba(0,0,0,0.6)" cornerRadius={Math.max(0, hw - wallPx)} />
            )}
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh * 0.4} fill="rgba(255,255,255,0.08)" cornerRadius={hw} listening={false} />
          </>
        )}
        {t === 'angle' && (
          <>
            <Rect x={-halfLen} y={hw / 3} width={halfLen * 2} height={hw * 2 / 3} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            <Rect x={-halfLen} y={-hw} width={Math.max(4, hw * 0.35)} height={vh} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
          </>
        )}
        {t === 'channel' && (
          <>
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh * 0.22} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            <Rect x={-halfLen} y={hw - vh * 0.22} width={halfLen * 2} height={vh * 0.22} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
            <Rect x={-halfLen} y={-hw} width={Math.max(4, vh * 0.22)} height={vh} fill={color} />
          </>
        )}
        {t === 'ibeam' && (
          <>
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh * 0.22} fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            <Rect x={-halfLen} y={hw - vh * 0.22} width={halfLen * 2} height={vh * 0.22} fill={color} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            <Rect x={-Math.max(3, vh * 0.1)} y={-hw + vh * 0.22} width={Math.max(6, vh * 0.2)} height={vh * 0.56} fill={color} />
          </>
        )}
        {t === 'flat_bar' && (
          <>
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
            <Rect x={-halfLen} y={-hw} width={halfLen * 2} height={vh * 0.5} fill="rgba(255,255,255,0.18)" listening={false} />
          </>
        )}
        {(t === 'sheet' || t === 'plate') && (() => {
          const shH = p.customH * SCALE * localZoom
          const hlines: React.ReactNode[] = []
          const spacing = 4 * SCALE * localZoom
          for (let x = -halfLen + spacing; x < halfLen; x += spacing) {
            hlines.push(<Line key={x} points={[x, -shH / 2, x, shH / 2]} stroke="rgba(255,255,255,0.07)" strokeWidth={0.5} listening={false} />)
          }
          return (
            <>
              <Rect x={-halfLen} y={-shH / 2} width={halfLen * 2} height={shH} fill={color} opacity={0.88} stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} />
              {hlines}
            </>
          )
        })()}

        {/* Holes */}
        {p.holes.map((hole, idx) => {
          const hx = (hole.posInches - p.length / 2) * SCALE * localZoom
          const r = Math.max(3, hole.diameter / 2 * SCALE * localZoom)
          return (
            <React.Fragment key={hole.id}>
              <Circle x={hx} y={0} radius={r} fill="rgba(0,0,0,0.95)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
              <Text x={hx - 4} y={-4} text={String(idx + 1)} fontSize={7} fill="rgba(255,255,255,0.7)" />
            </React.Fragment>
          )
        })}

        {/* Bend Lines */}
        {(p.bendLines ?? []).map(bend => {
          const bx = (bend.posInches - p.length / 2) * SCALE * localZoom
          return (
            <React.Fragment key={bend.id}>
              <Line points={[bx, -hw, bx, hw]} stroke="#a78bfa" strokeWidth={2} dash={[4, 3]} listening={false} />
              <Text x={bx + 2} y={-hw + 2} text={`${bend.angle}°`} fontSize={8} fill="#a78bfa" listening={false} />
            </React.Fragment>
          )
        })}

        {/* Label */}
        {halfLen > 35 && (
          <Text
            x={-halfLen + 4}
            y={-hw + 3}
            text={(() => {
              const sv = getSV(p)
              return Array.isArray(sv) ? `${sv[0]}x${sv[1]}"` : `${sv}"`
            })()}
            fontSize={9}
            fill="rgba(255,255,255,0.85)"
            fontFamily="JetBrains Mono, monospace"
            listening={false}
          />
        )}

        {/* Selection outline */}
        {isSelected && (
          <Rect
            x={-halfLen - 3}
            y={-hw - 3}
            width={halfLen * 2 + 6}
            height={vh + 6}
            stroke="#f97316"
            strokeWidth={2}
            dash={[4, 3]}
            fill="transparent"
          />
        )}
      </Group>
    )
  }

  function renderGrid() {
    const lines: React.ReactNode[] = []
    const minorSpacing = 3 * SCALE * localZoom
    const majorSpacing = 12 * SCALE * localZoom

    for (let x = localPan.x % minorSpacing; x < size.w; x += minorSpacing) {
      const worldX = (x - localPan.x) / (SCALE * localZoom)
      const isMajor = Math.abs(Math.round(worldX / 12) * 12 - worldX) < 0.01
      lines.push(<Line key={`gx${x}`} points={[x, 0, x, size.h]} stroke={isMajor ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'} strokeWidth={0.5} listening={false} />)
    }
    for (let y = localPan.y % minorSpacing; y < size.h; y += minorSpacing) {
      const worldY = (y - localPan.y) / (SCALE * localZoom)
      const isMajor = Math.abs(Math.round(worldY / 12) * 12 - worldY) < 0.01
      lines.push(<Line key={`gy${y}`} points={[0, y, size.w, y]} stroke={isMajor ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'} strokeWidth={0.5} listening={false} />)
    }

    // Origin cross
    lines.push(
      <Line key="ox" points={[localPan.x - 20, localPan.y, localPan.x + 20, localPan.y]} stroke="#f97316" strokeWidth={1} opacity={0.35} listening={false} />,
      <Line key="oy" points={[localPan.x, localPan.y - 20, localPan.x, localPan.y + 20]} stroke="#f97316" strokeWidth={1} opacity={0.35} listening={false} />
    )

    return lines
  }

  function renderDimension(p: Piece) {
    const vh = getVH(p)
    const halfLen = p.length / 2 * SCALE * localZoom
    if (halfLen < 35) return null
    const [cx, cy] = worldToCanvas(p.x, p.y, localPan.x, localPan.y, localZoom)
    const rad = p.angle * Math.PI / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const perpRad = rad + Math.PI / 2
    const offset = vh / 2 + 22
    const dcx = cx + Math.cos(perpRad) * offset
    const dcy = cy + Math.sin(perpRad) * offset

    const lx = dcx - cos * halfLen, ly = dcy - sin * halfLen
    const rx = dcx + cos * halfLen, ry = dcy + sin * halfLen
    const label = toFeetInches(p.length)

    return (
      <React.Fragment key={`dim-${p.id}`}>
        <Line points={[cx - cos * halfLen, cy - sin * halfLen, lx, ly]} stroke="rgba(249,115,22,0.5)" strokeWidth={1} dash={[3, 4]} listening={false} />
        <Line points={[cx + cos * halfLen, cy + sin * halfLen, rx, ry]} stroke="rgba(249,115,22,0.5)" strokeWidth={1} dash={[3, 4]} listening={false} />
        <Line points={[lx, ly, rx, ry]} stroke="rgba(249,115,22,0.7)" strokeWidth={1.5} listening={false} />
        <Rect
          x={dcx - label.length * 3.5 - 4}
          y={dcy - 8}
          width={label.length * 7 + 8}
          height={14}
          fill="rgba(13,17,23,0.92)"
          stroke="rgba(249,115,22,0.3)"
          strokeWidth={1}
          cornerRadius={2}
          listening={false}
        />
        <Text
          x={dcx - label.length * 3.5}
          y={dcy - 5}
          text={label}
          fontSize={11}
          fontStyle="bold"
          fontFamily="JetBrains Mono, monospace"
          fill="white"
          listening={false}
        />
      </React.Fragment>
    )
  }

  function renderConnection(conn: Connection) {
    const pieceA = project.pieces.find(p => p.id === conn.p1)
    const pieceB = project.pieces.find(p => p.id === conn.p2)
    if (!pieceA || !pieceB) return null

    const svA = getSV(pieceA)
    const ptsA = getSnapPoints(pieceA, svA, localPan.x, localPan.y, localZoom)
    const spA = ptsA.find(p => p.endpoint === conn.e1)

    if (!spA) return null

    const JOINT_COLORS: Record<string, string> = {
      butt_weld: '#f97316',
      miter_weld: '#fb923c',
      fillet_weld: '#fdba74',
      cope_cut: '#60a5fa',
      bolted: '#4ade80',
      flanged: '#a78bfa',
    }
    const color = JOINT_COLORS[conn.type] ?? '#f97316'

    return (
      <React.Fragment key={`conn-${conn.id}`}>
        <Circle
          x={spA.x}
          y={spA.y}
          radius={6}
          fill={color}
          opacity={0.85}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={1}
          listening={false}
        />
        <Text
          x={spA.x + 8}
          y={spA.y - 6}
          text={conn.type.replace('_', ' ')}
          fontSize={8}
          fill={color}
          fontFamily="JetBrains Mono, monospace"
          listening={false}
          opacity={0.8}
        />
      </React.Fragment>
    )
  }

  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()!
    const [wx, wy] = canvasToWorld(pointer.x, pointer.y, localPan.x, localPan.y, localZoom)
    const factor = e.evt.deltaY < 0 ? 1.12 : 0.9
    const newZoom = Math.max(0.15, Math.min(8, localZoom * factor))
    const newPanX = pointer.x - wx * SCALE * newZoom
    const newPanY = pointer.y - wy * SCALE * newZoom
    setLocalZoom(newZoom)
    setLocalPan({ x: newPanX, y: newPanY })
    setPanZoom(newPanX, newPanY, newZoom)
  }

  function handleMouseDown(e: KonvaEventObject<MouseEvent>) {
    if (mode === 'sketch' && e.evt.button === 0 && e.target === e.target.getStage()) {
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getPointerPosition()!
      const [wx, wy] = canvasToWorld(pos.x, pos.y, localPan.x, localPan.y, localZoom)
      addSketchPoint(wx, wy)
      return
    }
    if (mode === 'pan' || e.evt.button === 1) {
      isPanning.current = true
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY, panX: localPan.x, panY: localPan.y }
    }
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    if (isPanning.current) {
      const dx = e.evt.clientX - panStart.current.x
      const dy = e.evt.clientY - panStart.current.y
      const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy }
      setLocalPan(newPan)
    }
  }

  function handleMouseUp() {
    if (isPanning.current) {
      isPanning.current = false
      setPanZoom(localPan.x, localPan.y, localZoom)
    }
  }

  const hasNoPieces = project.pieces.length === 0

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#0d1117', position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
          if (e.target === e.target.getStage()) setSelectedIds([])
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          if (e.target === e.target.getStage()) {
            setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, pieceId: null, connectionId: null })
          }
        }}
        style={{ cursor: mode === 'sketch' ? 'crosshair' : mode === 'pan' ? 'grab' : 'default' }}
      >
        <Layer>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="#0d1117" />
          {renderGrid()}
        </Layer>

        <Layer>
          {project.pieces.map(p => renderPiece(p, selectedIds.includes(p.id)))}
          {!isDragging && project.pieces.map(p => !p.upright && renderDimension(p))}
          {project.connections.map(c => renderConnection(c))}
        </Layer>

        <Layer>
          {isDragging && project.pieces.map(p => {
            const sv = getSV(p)
            return getSnapPoints(p, sv, localPan.x, localPan.y, localZoom).map(sp => (
              <Circle key={`sp-${p.id}-${sp.endpoint}`} x={sp.x} y={sp.y} radius={4} fill={sp.color} opacity={0.6} stroke={sp.color} strokeWidth={1} listening={false} />
            ))
          })}

          {snapPreview && (
            <>
              <Line points={[snapPreview.x - 14, snapPreview.y, snapPreview.x + 14, snapPreview.y]} stroke={snapPreview.color} strokeWidth={2} listening={false} />
              <Line points={[snapPreview.x, snapPreview.y - 14, snapPreview.x, snapPreview.y + 14]} stroke={snapPreview.color} strokeWidth={2} listening={false} />
              <Circle x={snapPreview.x} y={snapPreview.y} radius={12} stroke={snapPreview.color} strokeWidth={2} fill="transparent" listening={false} />
              <Text x={snapPreview.x + 14} y={snapPreview.y - 8} text={snapPreview.label} fill={snapPreview.color} fontSize={10} fontFamily="JetBrains Mono, monospace" listening={false} />
            </>
          )}

          {/* Sketch mode lines and dots */}
          {sketchMode && sketchPoints.length >= 2 && (
            <Line
              points={sketchPoints.flatMap(pt => {
                const [cx, cy] = worldToCanvas(pt.x, pt.y, localPan.x, localPan.y, localZoom)
                return [cx, cy]
              })}
              stroke="#f97316"
              strokeWidth={2}
              dash={[4, 3]}
              listening={false}
            />
          )}
          {sketchMode && sketchPoints.map((pt, i) => {
            const [cx, cy] = worldToCanvas(pt.x, pt.y, localPan.x, localPan.y, localZoom)
            return (
              <Circle key={i} x={cx} y={cy} radius={4} fill="#f97316" listening={false} />
            )
          })}
        </Layer>
      </Stage>

      {hasNoPieces && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9881;</div>
            <div style={{ fontSize: 14, marginBottom: 8, color: '#64748b' }}>No pieces yet</div>
            <div style={{ fontSize: 12 }}>Select a material and click Add to Drawing</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>or press <span style={{ color: '#f97316', fontFamily: 'JetBrains Mono' }}>Ctrl+K</span> to quick-add</div>
          </div>
        </div>
      )}
    </div>
  )
}
