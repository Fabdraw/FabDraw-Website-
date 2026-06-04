import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import {
  worldToCanvas, canvasToWorld, getSnapPoints, getVisualHeight,
  findSnap, applySnapToPiece, hitTestPiece, snapHolePosition,
  getPieceEndpoints, SCALE, getAngleRad
} from '../lib/geometry';
import { MATERIALS } from '../lib/materials';
import type { Piece, Connection, Hole } from '../types';

const SNAP_RADIUS = 18; // px

let dragOffsetX = 0;
let dragOffsetY = 0;

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { pieces, connections, zoom, panX, panY, setZoom, setPan, addPiece, updatePiece, addConnection, setPieces, setConnections } = useProjectStore();
  const { mode, selectedIds, setSelectedIds, toggleSelectedId, setContextMenu, setHolePreview, holePreview, holeAddMode } = useUIStore();
  const historyStore = useHistoryStore();

  const [dragging, setDragging] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [selBox, setSelBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [selBoxStart, setSelBoxStart] = useState<{ cx: number; cy: number } | null>(null);
  const [snapHighlight, setSnapHighlight] = useState<{ x: number; y: number } | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [rotateStart, setRotateStart] = useState({ angle: 0, mx: 0, my: 0 });
  const animFrameRef = useRef<number>(0);
  const piecesRef = useRef(pieces);
  const connectionsRef = useRef(connections);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  const draggingRef = useRef<string | null>(null);
  const snapRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panXRef.current = panX; }, [panX]);
  useEffect(() => { panYRef.current = panY; }, [panY]);
  useEffect(() => { draggingRef.current = dragging; }, [dragging]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const z = zoomRef.current;
    const px = panXRef.current;
    const py = panYRef.current;
    const ps = piecesRef.current;
    const cs = connectionsRef.current;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // Grid - minor lines
    const gridInches = z >= 1.5 ? 1 : z >= 0.5 ? 6 : 12;
    const gridPx = gridInches * z * SCALE;
    const startX = ((px % gridPx) + gridPx) % gridPx;
    const startY = ((py % gridPx) + gridPx) % gridPx;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = startX; x < W; x += gridPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = startY; y < H; y += gridPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Major grid every 10 units
    const majorPx = 10 * gridInches * z * SCALE;
    const majorStartX = ((px % majorPx) + majorPx) % majorPx;
    const majorStartY = ((py % majorPx) + majorPx) % majorPx;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = majorStartX; x < W; x += majorPx) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = majorStartY; y < H; y += majorPx) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Origin crosshair - orange at 30% opacity, 20px lines
    const [ox, oy] = worldToCanvas(0, 0, z, px, py);
    ctx.strokeStyle = 'rgba(249,115,22,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - 20, oy); ctx.lineTo(ox + 20, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy - 20); ctx.lineTo(ox, oy + 20); ctx.stroke();

    // Draw connections
    for (const conn of cs) {
      const pA = ps.find(p => p.id === conn.pieceAId);
      const pB = ps.find(p => p.id === conn.pieceBId);
      if (!pA || !pB) continue;
      const spA = getSnapPoints(pA).find(sp => sp.id === conn.snapPointA);
      const spB = getSnapPoints(pB).find(sp => sp.id === conn.snapPointB);
      if (!spA || !spB) continue;
      const [ax, ay] = worldToCanvas(spA.x, spA.y, z, px, py);
      const [bx, by] = worldToCanvas(spB.x, spB.y, z, px, py);
      ctx.strokeStyle = '#c94010';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      ctx.fillStyle = '#c94010';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(conn.type, mx, my - 4);
    }

    // Draw pieces
    for (const piece of ps) {
      const isSelected = useUIStore.getState().selectedIds.includes(piece.id);
      const mat = MATERIALS[piece.type];
      const rad = getAngleRad(piece);

      ctx.save();

      if (piece.orientation === 'upright') {
        const [cx2, cy2] = worldToCanvas(piece.x, piece.y, z, px, py);
        const r = Math.max(6, piece.width * z * SCALE / 2);
        ctx.beginPath();
        ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r);
        grad.addColorStop(0, mat.color + 'cc');
        grad.addColorStop(1, mat.color + '44');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : mat.color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
        // Z height label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `bold ${Math.max(9, 10 * z)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${piece.zHeight}"`, cx2, cy2);
        ctx.restore();
        continue;
      }

      const [cx2, cy2] = worldToCanvas(piece.x, piece.y, z, px, py);
      const len = piece.length * z * SCALE;
      const vizH = getVisualHeight(piece) * z * SCALE;

      ctx.translate(cx2, cy2);
      ctx.rotate(rad);

      // Piece fill
      const grd = ctx.createLinearGradient(-len / 2, -vizH / 2, -len / 2, vizH / 2);
      const baseColor = mat.color;
      grd.addColorStop(0, baseColor + '99');
      grd.addColorStop(0.4, baseColor + 'cc');
      grd.addColorStop(1, baseColor + '55');
      ctx.fillStyle = grd;

      // Shape drawing
      if (piece.type === 'round_tube' || piece.type === 'pipe') {
        // Draw as long oval / capsule
        const r2 = vizH / 2;
        ctx.beginPath();
        ctx.moveTo(-len / 2 + r2, -r2);
        ctx.lineTo(len / 2 - r2, -r2);
        ctx.arc(len / 2 - r2, 0, r2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-len / 2 + r2, r2);
        ctx.arc(-len / 2 + r2, 0, r2, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fill();
        // Outer ring
        ctx.strokeStyle = isSelected ? '#ffffff' : baseColor;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();
        // Inner wall circle hint
        if (z > 0.6) {
          const innerR = (piece.width / 2 - piece.wall) * z * SCALE;
          if (innerR > 2) {
            ctx.strokeStyle = baseColor + '44';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(innerR, r2 - 1), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      } else if (piece.type === 'angle') {
        const leg = piece.width * z * SCALE;
        const t = piece.wall * z * SCALE;
        ctx.beginPath();
        ctx.rect(-len / 2, -leg / 2, len, t);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : baseColor;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-len / 2, -leg / 2, t, leg);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#fff' : baseColor;
        ctx.stroke();
      } else if (piece.type === 'ibeam') {
        const fw = piece.width * z * SCALE;
        const fh = piece.wall * z * SCALE;
        const webW = (piece.wall * 0.6) * z * SCALE;
        ctx.fillStyle = grd;
        // Top flange
        ctx.fillRect(-len / 2, -vizH / 2, len, fh);
        // Bottom flange
        ctx.fillRect(-len / 2, vizH / 2 - fh, len, fh);
        // Web
        ctx.fillRect(-len / 2, -vizH / 2 + fh, len, vizH - fh * 2);
        ctx.strokeStyle = isSelected ? '#fff' : baseColor;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        // Outline flanges
        ctx.strokeRect(-len / 2, -vizH / 2, len, fh);
        ctx.strokeRect(-len / 2, vizH / 2 - fh, len, fh);
      } else {
        // Rectangle (square_tube, rect_tube, flat_bar, sheet, plate, channel)
        ctx.fillRect(-len / 2, -vizH / 2, len, vizH);
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 1.5;
        }
        ctx.strokeRect(-len / 2, -vizH / 2, len, vizH);

        // Hollow interior for tubes and channel
        if ((piece.type === 'square_tube' || piece.type === 'rect_tube') && z > 0.5) {
          const innerW = (piece.width - 2 * piece.wall) * z * SCALE;
          const innerH = (piece.height - 2 * piece.wall) * z * SCALE;
          if (innerW > 2 && innerH > 2) {
            ctx.clearRect(-innerW / 2, -innerH / 2, innerW, innerH);
            ctx.fillStyle = '#0d111755';
            ctx.fillRect(-innerW / 2, -innerH / 2, innerW, innerH);
            ctx.strokeStyle = baseColor + '55';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-innerW / 2, -innerH / 2, innerW, innerH);
          }
        }
      }

      // Length label
      if (z > 0.4 && len > 60) {
        ctx.rotate(0);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `${Math.max(9, Math.min(12, 11 * z))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `${mat.label} ${piece.length}"`;
        ctx.fillText(label, 0, 0);
      }

      ctx.restore();

      // Holes on piece
      for (const hole of piece.holes) {
        const { sx, sy, ex, ey } = getPieceEndpoints(piece);
        const t2 = hole.fromStart / piece.length;
        const hwx = sx + (ex - sx) * t2;
        const hwy = sy + (ey - sy) * t2;
        const [hcx, hcy] = worldToCanvas(hwx, hwy, z, px, py);
        const hr = Math.max(3, (hole.diameter / 2) * z * SCALE);
        ctx.beginPath();
        ctx.arc(hcx, hcy, hr, 0, Math.PI * 2);
        ctx.fillStyle = '#0d1117';
        ctx.fill();
        ctx.strokeStyle = hole.type === 'tapped' ? '#fbbf24' : hole.type === 'countersink' ? '#a78bfa' : '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Cross hair
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(hcx - hr, hcy); ctx.lineTo(hcx + hr, hcy);
        ctx.moveTo(hcx, hcy - hr); ctx.lineTo(hcx, hcy + hr);
        ctx.stroke();
      }

      // Snap points (only for selected)
      if (isSelected && z > 0.3) {
        const snapPts = getSnapPoints(piece);
        for (const sp of snapPts) {
          const [spx, spy] = worldToCanvas(sp.x, sp.y, z, px, py);
          ctx.beginPath();
          ctx.arc(spx, spy, 5, 0, Math.PI * 2);
          ctx.fillStyle = sp.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff88';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Snap highlight - accent color circle + crosshair
    const sh = snapRef.current;
    if (sh) {
      const [shx, shy] = worldToCanvas(sh.x, sh.y, z, px, py);
      ctx.beginPath();
      ctx.arc(shx, shy, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(249,115,22,0.8)';
      ctx.fill();
      // Crosshair lines 20px
      ctx.strokeStyle = 'rgba(249,115,22,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(shx - 20, shy); ctx.lineTo(shx + 20, shy);
      ctx.moveTo(shx, shy - 20); ctx.lineTo(shx, shy + 20);
      ctx.stroke();
    }

    // Hole preview
    if (holePreview) {
      const piece = ps.find(p => p.id === holePreview.pieceId);
      if (piece) {
        const { sx, sy, ex, ey } = getPieceEndpoints(piece);
        const t2 = holePreview.fromStart / piece.length;
        const hwx = sx + (ex - sx) * t2;
        const hwy = sy + (ey - sy) * t2;
        const [hpx, hpy] = worldToCanvas(hwx, hwy, z, px, py);
        ctx.beginPath();
        ctx.arc(hpx, hpy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Selection box
    if (selBox) {
      const sx = Math.min(selBox.x1, selBox.x2);
      const sy = Math.min(selBox.y1, selBox.y2);
      const sw = Math.abs(selBox.x2 - selBox.x1);
      const sh2 = Math.abs(selBox.y2 - selBox.y1);
      ctx.fillStyle = 'rgba(201, 64, 16, 0.1)';
      ctx.fillRect(sx, sy, sw, sh2);
      ctx.strokeStyle = '#c94010';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(sx, sy, sw, sh2);
      ctx.setLineDash([]);
    }

    animFrameRef.current = requestAnimationFrame(draw);
  }, [holePreview, selBox]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  const getWorldPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    return canvasToWorld(cx, cy, zoomRef.current, panXRef.current, panYRef.current);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) return;

    const [wx, wy] = getWorldPos(e);
    const currentMode = useUIStore.getState().mode;

    if (e.button === 1 || currentMode === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, px: panXRef.current, py: panYRef.current });
      return;
    }

    if (currentMode === 'select') {
      // Check hole mode
      if (holeAddMode) {
        // Find piece under cursor
        const ps = piecesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          if (hitTestPiece(ps[i], wx, wy)) {
            const fromStart = snapHolePosition(ps[i], wx, wy);
            const newHole: Hole = {
              id: crypto.randomUUID(),
              pieceId: ps[i].id,
              snapTo: 'custom',
              fromStart,
              type: 'through',
              diameter: 0.5,
            };
            const updated = ps[i].holes ? [...ps[i].holes, newHole] : [newHole];
            historyStore.push({ pieces: ps, connections: connectionsRef.current });
            updatePiece(ps[i].id, { holes: updated });
            return;
          }
        }
        return;
      }

      // Check piece hit
      const ps = piecesRef.current;
      let hit: Piece | null = null;
      for (let i = ps.length - 1; i >= 0; i--) {
        if (hitTestPiece(ps[i], wx, wy)) {
          hit = ps[i];
          break;
        }
      }

      if (hit) {
        const currentSelected = useUIStore.getState().selectedIds;
        if (e.shiftKey) {
          toggleSelectedId(hit.id);
        } else if (!currentSelected.includes(hit.id)) {
          setSelectedIds([hit.id]);
        }

        // Start drag
        historyStore.push({ pieces: ps, connections: connectionsRef.current });
        dragOffsetX = wx - hit.x;
        dragOffsetY = wy - hit.y;
        setDragging(hit.id);
      } else {
        // Selection box
        if (!e.shiftKey) setSelectedIds([]);
        const rect = canvasRef.current!.getBoundingClientRect();
        setSelBoxStart({ cx: e.clientX - rect.left, cy: e.clientY - rect.top });
        setSelBox(null);
      }
    }
  }, [holeAddMode, getWorldPos, historyStore, updatePiece, toggleSelectedId, setSelectedIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const [wx, wy] = getWorldPos(e);

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan(panStart.px + dx, panStart.py + dy);
      return;
    }

    if (dragging) {
      const ps = piecesRef.current;
      const piece = ps.find(p => p.id === dragging);
      if (!piece) return;

      const newPiece = { ...piece, x: wx - dragOffsetX, y: wy - dragOffsetY };
      const snap = findSnap(newPiece, ps, SNAP_RADIUS, zoomRef.current);

      if (snap) {
        const snapped = applySnapToPiece(newPiece, snap);
        snapRef.current = { x: snap.targetPoint.x, y: snap.targetPoint.y };
        updatePiece(dragging, { x: snapped.x, y: snapped.y });
      } else {
        snapRef.current = null;
        updatePiece(dragging, { x: newPiece.x, y: newPiece.y });
      }
      return;
    }

    // Selection box
    if (selBoxStart) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setSelBox({ x1: selBoxStart.cx, y1: selBoxStart.cy, x2: cx, y2: cy });
      return;
    }

    // Hole preview
    if (holeAddMode) {
      const ps = piecesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        if (hitTestPiece(ps[i], wx, wy)) {
          const fromStart = snapHolePosition(ps[i], wx, wy);
          setHolePreview({ pieceId: ps[i].id, fromStart, x: wx, y: wy });
          return;
        }
      }
      setHolePreview(null);
    }
  }, [isPanning, panStart, dragging, selBoxStart, holeAddMode, getWorldPos, setPan, updatePiece, setHolePreview]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      // Create connection if snapped
      if (snapRef.current) {
        const ps = piecesRef.current;
        const piece = ps.find(p => p.id === dragging);
        if (piece) {
          const myPts = getSnapPoints(piece);
          const z = zoomRef.current;
          const px2 = panXRef.current;
          const py2 = panYRef.current;
          // Find closest snap points
          for (const other of ps) {
            if (other.id === piece.id) continue;
            const otherPts = getSnapPoints(other);
            for (const mp of myPts) {
              for (const op of otherPts) {
                const dx = Math.abs(mp.x - op.x);
                const dy = Math.abs(mp.y - op.y);
                if (dx < 0.2 && dy < 0.2) {
                  const conn: Connection = {
                    id: crypto.randomUUID(),
                    pieceAId: piece.id,
                    pieceBId: other.id,
                    snapPointA: mp.id,
                    snapPointB: op.id,
                    type: 'butt',
                  };
                  addConnection(conn);
                }
              }
            }
          }
        }
      }
      snapRef.current = null;
      setDragging(null);
    }

    if (selBox) {
      // Select pieces in box
      const z = zoomRef.current;
      const px2 = panXRef.current;
      const py2 = panYRef.current;
      const [wx1, wy1] = canvasToWorld(Math.min(selBox.x1, selBox.x2), Math.min(selBox.y1, selBox.y2), z, px2, py2);
      const [wx2, wy2] = canvasToWorld(Math.max(selBox.x1, selBox.x2), Math.max(selBox.y1, selBox.y2), z, px2, py2);
      const ps = piecesRef.current;
      const inBox = ps.filter(p => p.x >= wx1 && p.x <= wx2 && p.y >= wy1 && p.y <= wy2);
      if (e.shiftKey) {
        const current = useUIStore.getState().selectedIds;
        setSelectedIds([...new Set([...current, ...inBox.map(p => p.id)])]);
      } else {
        setSelectedIds(inBox.map(p => p.id));
      }
      setSelBox(null);
      setSelBoxStart(null);
    }

    setIsPanning(false);
  }, [dragging, selBox, addConnection, setSelectedIds]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.05, Math.min(10, zoomRef.current * factor));
    const newPanX = cx - (cx - panXRef.current) * (newZoom / zoomRef.current);
    const newPanY = cy - (cy - panYRef.current) * (newZoom / zoomRef.current);
    setZoom(newZoom);
    setPan(newPanX, newPanY);
  }, [setZoom, setPan]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const [wx, wy] = getWorldPos(e);
    const ps = piecesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      if (hitTestPiece(ps[i], wx, wy)) {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'piece', pieceId: ps[i].id });
        return;
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
  }, [getWorldPos, setContextMenu]);

  const cursorClass = mode === 'pan' ? 'cursor-grab active:cursor-grabbing' :
    holeAddMode ? 'cursor-crosshair' : 'cursor-default';

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}
