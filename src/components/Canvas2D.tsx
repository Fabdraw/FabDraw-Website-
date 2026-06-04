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

const SNAP_RADIUS = 20; // px

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
        const sizePx = Math.max(8, piece.width * z * SCALE);
        const half = sizePx / 2;
        const wallPx = piece.wall * z * SCALE;

        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          // Outer circle
          ctx.beginPath();
          ctx.arc(cx2, cy2, half, 0, Math.PI * 2);
          ctx.fillStyle = mat.color + 'cc';
          ctx.fill();
          ctx.strokeStyle = isSelected ? '#fff' : mat.color;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.stroke();
          // Inner hollow
          const innerR = half - wallPx;
          if (innerR > 2) {
            ctx.beginPath();
            ctx.arc(cx2, cy2, innerR, 0, Math.PI * 2);
            ctx.fillStyle = '#0d1117';
            ctx.fill();
            ctx.strokeStyle = mat.color + '66';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        } else {
          // Square/rect: outer box
          ctx.fillStyle = mat.color + 'cc';
          ctx.fillRect(cx2 - half, cy2 - half, sizePx, sizePx);
          ctx.strokeStyle = isSelected ? '#fff' : mat.color;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.strokeRect(cx2 - half, cy2 - half, sizePx, sizePx);
          // Inner hollow for tubes
          if ((piece.type === 'square_tube' || piece.type === 'rect_tube') && wallPx > 0 && (half - wallPx) > 2) {
            ctx.clearRect(cx2 - half + wallPx, cy2 - half + wallPx, sizePx - wallPx * 2, sizePx - wallPx * 2);
            ctx.fillStyle = '#0d111755';
            ctx.fillRect(cx2 - half + wallPx, cy2 - half + wallPx, sizePx - wallPx * 2, sizePx - wallPx * 2);
            ctx.strokeStyle = mat.color + '44';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(cx2 - half + wallPx, cy2 - half + wallPx, sizePx - wallPx * 2, sizePx - wallPx * 2);
          }
        }

        // Upward arrow above cross-section
        const arrowY = cy2 - half - 4;
        const arrowSize = Math.max(5, 6 * z);
        ctx.strokeStyle = mat.color + 'aa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx2, arrowY - arrowSize);
        ctx.lineTo(cx2, arrowY);
        ctx.moveTo(cx2 - arrowSize * 0.5, arrowY - arrowSize * 0.5);
        ctx.lineTo(cx2, arrowY - arrowSize);
        ctx.lineTo(cx2 + arrowSize * 0.5, arrowY - arrowSize * 0.5);
        ctx.stroke();

        // Height label
        if (z > 0.3) {
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `bold ${Math.max(8, 9 * z)}px JetBrains Mono, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${piece.length}"`, cx2, arrowY - arrowSize - 2);
        }

        ctx.restore();
        continue;
      }

      const [cx2, cy2] = worldToCanvas(piece.x, piece.y, z, px, py);
      const halfLen = piece.length / 2 * z * SCALE;
      // Visual height: tubeSize * SCALE * zoom, minimum 8px for tubes
      const rawVh = getVisualHeight(piece) * z * SCALE;
      const isRound = piece.type === 'round_tube' || piece.type === 'pipe';
      const isTube = piece.type === 'square_tube' || piece.type === 'rect_tube' || isRound;
      const vh = isTube ? Math.max(8, rawVh) : rawVh;

      ctx.translate(cx2, cy2);
      ctx.rotate(rad);

      const color = mat.color;
      // Canvas background colour used for hollow interiors so they appear truly empty
      const canvasBg = '#0d1117';

      // Shape drawing
      if (piece.type === 'square_tube' || piece.type === 'rect_tube') {
        const wallPx = Math.max(1.5, piece.wall * z * SCALE);
        // Outer body
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, vh);
        // Inner hollow — canvas background so it looks truly empty
        const innerW = halfLen * 2 - wallPx * 2;
        const innerH = vh - wallPx * 2;
        if (innerW > 0 && innerH > 0) {
          ctx.fillStyle = canvasBg;
          ctx.fillRect(-halfLen + wallPx, -vh / 2 + wallPx, innerW, innerH);
          // Subtle inner surface tint to add depth
          ctx.fillStyle = color + '22';
          ctx.fillRect(-halfLen + wallPx, -vh / 2 + wallPx, innerW, innerH);
        }
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, vh * 0.38);
        // Border
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, vh);
      } else if (piece.type === 'round_tube' || piece.type === 'pipe') {
        const wallPx = Math.max(1.5, piece.wall * z * SCALE);
        const radius = vh / 2;

        // Helper to draw a capsule path
        const capsule = (x: number, y: number, w: number, h: number, r: number) => {
          const cr = Math.min(r, w / 2, h / 2);
          ctx.beginPath();
          ctx.moveTo(x + cr, y);
          ctx.lineTo(x + w - cr, y);
          ctx.arc(x + w - cr, y + cr, cr, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(x + cr, y + h);
          ctx.arc(x + cr, y + cr, cr, Math.PI / 2, -Math.PI / 2);
          ctx.closePath();
        };

        // Outer body
        ctx.fillStyle = color;
        capsule(-halfLen, -radius, halfLen * 2, vh, radius);
        ctx.fill();

        // Inner hollow — canvas background
        const innerR = Math.max(1, radius - wallPx);
        const innerLen = halfLen * 2 - wallPx * 2;
        if (innerLen > 0 && innerR > 1) {
          ctx.fillStyle = canvasBg;
          capsule(-halfLen + wallPx, -innerR, innerLen, innerR * 2, innerR);
          ctx.fill();
          // Subtle tint
          ctx.fillStyle = color + '22';
          capsule(-halfLen + wallPx, -innerR, innerLen, innerR * 2, innerR);
          ctx.fill();
        }

        // Top highlight arc
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        capsule(-halfLen, -radius, halfLen * 2, radius * 0.5, radius * 0.4);
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        capsule(-halfLen, -radius, halfLen * 2, vh, radius);
        ctx.stroke();
      } else if (piece.type === 'angle') {
        const legThickPx = Math.max(3, piece.wall * z * SCALE * 2);
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, vh / 2 - legThickPx, halfLen * 2, legThickPx);
        ctx.fillRect(-halfLen, -vh / 2, legThickPx, vh);
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(-halfLen, -vh / 2);
        ctx.lineTo(-halfLen + legThickPx, -vh / 2);
        ctx.lineTo(-halfLen + legThickPx, vh / 2 - legThickPx);
        ctx.lineTo(halfLen, vh / 2 - legThickPx);
        ctx.lineTo(halfLen, vh / 2);
        ctx.lineTo(-halfLen, vh / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (piece.type === 'channel') {
        const flangeH = Math.max(4, vh * 0.28);
        const webW = Math.max(4, vh * 0.2);
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, flangeH);
        ctx.fillRect(-halfLen, vh / 2 - flangeH, halfLen * 2, flangeH);
        ctx.fillRect(-halfLen, -vh / 2, webW, vh);
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, flangeH);
        ctx.strokeRect(-halfLen, vh / 2 - flangeH, halfLen * 2, flangeH);
        ctx.strokeRect(-halfLen, -vh / 2, webW, vh);
      } else if (piece.type === 'ibeam') {
        const flangeH = Math.max(4, vh * 0.25);
        const webThick = Math.max(3, vh * 0.12);
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, flangeH);
        ctx.fillRect(-halfLen, vh / 2 - flangeH, halfLen * 2, flangeH);
        ctx.fillRect(-halfLen, -webThick / 2, halfLen * 2, webThick);
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, flangeH);
        ctx.strokeRect(-halfLen, vh / 2 - flangeH, halfLen * 2, flangeH);
        ctx.strokeRect(-halfLen, -webThick / 2, halfLen * 2, webThick);
      } else if (piece.type === 'flat_bar') {
        // Flat bar visual height: bar width (the wider face) at 30%, min 6px
        const flatVh = Math.max(6, piece.width * z * SCALE * 0.30);
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -flatVh / 2, halfLen * 2, flatVh);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-halfLen, -flatVh / 2, halfLen * 2, flatVh * 0.3);
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.strokeRect(-halfLen, -flatVh / 2, halfLen * 2, flatVh);
      } else if (piece.type === 'sheet') {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, vh);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        const hatchSpacing = 3 * z * SCALE;
        for (let x = -halfLen; x < halfLen; x += hatchSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, -vh / 2);
          ctx.lineTo(x, vh / 2);
          ctx.stroke();
        }
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, vh);
      } else if (piece.type === 'plate') {
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, vh);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        const spacing = Math.max(4, z * SCALE);
        for (let x = -halfLen; x < halfLen; x += spacing) {
          ctx.beginPath(); ctx.moveTo(x, -vh / 2); ctx.lineTo(x, vh / 2); ctx.stroke();
        }
        for (let y = -vh / 2; y < vh / 2; y += spacing) {
          ctx.beginPath(); ctx.moveTo(-halfLen, y); ctx.lineTo(halfLen, y); ctx.stroke();
        }
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 2;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, vh);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(-halfLen, -vh / 2, halfLen * 2, vh);
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeRect(-halfLen, -vh / 2, halfLen * 2, vh);
      }

      // Dimension label — only when piece is long enough to fit text legibly
      if (z > 0.4 && halfLen > 40) {
        ctx.fillStyle = 'rgba(241,245,249,0.75)';
        ctx.font = `9px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `${piece.length}"`;
        ctx.fillText(label, 0, 0);
      }

      ctx.restore();

      // Holes on piece
      if (piece.holes && piece.holes.length > 0) {
        const { sx, sy, ex, ey } = getPieceEndpoints(piece);
        for (let hi = 0; hi < piece.holes.length; hi++) {
          const hole = piece.holes[hi];
          const t2 = hole.fromStart / piece.length;
          const hwx = sx + (ex - sx) * t2;
          const hwy = sy + (ey - sy) * t2;
          const [hcx, hcy] = worldToCanvas(hwx, hwy, z, px, py);
          const hr = Math.max(3, (hole.diameter / 2) * z * SCALE);
          ctx.save();
          ctx.translate(hcx, hcy);
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(0, 0, hr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, hr * 0.9)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(hi + 1), 0, 0);
          ctx.restore();
        }
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

    // CORNER CAPS - filled squares at connection points between horizontal pieces
    for (const conn of cs) {
      const pieceA = ps.find(p => p.id === conn.pieceAId);
      const pieceB = ps.find(p => p.id === conn.pieceBId);
      if (!pieceA || !pieceB) continue;
      if (pieceA.type === 'sheet' || pieceB.type === 'sheet') continue;
      if (pieceA.orientation === 'upright' || pieceB.orientation === 'upright') continue;

      const snapPtsA = getSnapPoints(pieceA);
      const sp = snapPtsA.find(s => s.id === conn.snapPointA);
      if (!sp) continue;

      const [cx2, cy2] = worldToCanvas(sp.x, sp.y, z, px, py);
      const capH = Math.max(getVisualHeight(pieceA), getVisualHeight(pieceB));
      const capSizePx = (capH + 0.1) * z * SCALE;

      const dominantPiece = getVisualHeight(pieceA) >= getVisualHeight(pieceB) ? pieceA : pieceB;
      const capMat = MATERIALS[dominantPiece.type];
      ctx.fillStyle = capMat.color;
      ctx.fillRect(cx2 - capSizePx / 2, cy2 - capSizePx / 2, capSizePx, capSizePx);
      ctx.strokeStyle = capMat.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx2 - capSizePx / 2, cy2 - capSizePx / 2, capSizePx, capSizePx);
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
        ctx.save();
        ctx.translate(hpx, hpy);
        ctx.fillStyle = 'rgba(59,130,246,0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('ADD HOLE', 0, 13);
        ctx.restore();
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
