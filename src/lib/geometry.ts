import type { Piece, SnapPoint, SnapResult, Connection } from '../types';

export const SCALE = 8; // pixels per inch

export function worldToCanvas(wx: number, wy: number, zoom: number, panX: number, panY: number): [number, number] {
  return [wx * zoom * SCALE + panX, wy * zoom * SCALE + panY];
}

export function canvasToWorld(cx: number, cy: number, zoom: number, panX: number, panY: number): [number, number] {
  return [(cx - panX) / (zoom * SCALE), (cy - panY) / (zoom * SCALE)];
}

export function getAngleRad(piece: Piece): number {
  return (piece.angle * Math.PI) / 180;
}

export function getPieceEndpoints(piece: Piece): { sx: number; sy: number; ex: number; ey: number } {
  if (piece.orientation === 'upright') {
    return { sx: piece.x, sy: piece.y, ex: piece.x, ey: piece.y };
  }
  const rad = getAngleRad(piece);
  const halfLen = piece.length / 2;
  return {
    sx: piece.x - Math.cos(rad) * halfLen,
    sy: piece.y - Math.sin(rad) * halfLen,
    ex: piece.x + Math.cos(rad) * halfLen,
    ey: piece.y + Math.sin(rad) * halfLen,
  };
}

export function getVisualHeight(piece: Piece): number {
  if (piece.type === 'sheet' || piece.type === 'plate') return piece.height;
  if (piece.type === 'round_tube' || piece.type === 'pipe') return piece.width;
  if (piece.type === 'angle') return piece.width;
  if (piece.type === 'ibeam') return piece.height;
  return piece.height;
}

export function getSnapPoints(piece: Piece): SnapPoint[] {
  if (piece.orientation === 'upright') {
    return [{
      id: `${piece.id}_center`,
      pieceId: piece.id,
      x: piece.x,
      y: piece.y,
      label: 'center',
      color: '#15803d',
    }];
  }

  if (piece.type === 'sheet' || piece.type === 'plate') {
    const rad = getAngleRad(piece);
    const hw = piece.length / 2;
    const hh = piece.height / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const perp = rad + Math.PI / 2;
    const pc = Math.cos(perp);
    const ps = Math.sin(perp);

    return [
      { id: `${piece.id}_tl`, pieceId: piece.id, x: piece.x - cos * hw - pc * hh, y: piece.y - sin * hw - ps * hh, label: 'corner_tl', color: '#c94010' },
      { id: `${piece.id}_tr`, pieceId: piece.id, x: piece.x + cos * hw - pc * hh, y: piece.y + sin * hw - ps * hh, label: 'corner_tr', color: '#c94010' },
      { id: `${piece.id}_bl`, pieceId: piece.id, x: piece.x - cos * hw + pc * hh, y: piece.y - sin * hw + ps * hh, label: 'corner_bl', color: '#c94010' },
      { id: `${piece.id}_br`, pieceId: piece.id, x: piece.x + cos * hw + pc * hh, y: piece.y + sin * hw + ps * hh, label: 'corner_br', color: '#c94010' },
      { id: `${piece.id}_et`, pieceId: piece.id, x: piece.x - pc * hh, y: piece.y - ps * hh, label: 'edge_t', color: '#1d4ed8' },
      { id: `${piece.id}_eb`, pieceId: piece.id, x: piece.x + pc * hh, y: piece.y + ps * hh, label: 'edge_b', color: '#1d4ed8' },
      { id: `${piece.id}_el`, pieceId: piece.id, x: piece.x - cos * hw, y: piece.y - sin * hw, label: 'edge_l', color: '#1d4ed8' },
      { id: `${piece.id}_er`, pieceId: piece.id, x: piece.x + cos * hw, y: piece.y + sin * hw, label: 'edge_r', color: '#1d4ed8' },
      { id: `${piece.id}_center`, pieceId: piece.id, x: piece.x, y: piece.y, label: 'center', color: '#15803d' },
    ];
  }

  const { sx, sy, ex, ey } = getPieceEndpoints(piece);
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const q1x = (sx + mx) / 2;
  const q1y = (sy + my) / 2;
  const q3x = (mx + ex) / 2;
  const q3y = (my + ey) / 2;

  return [
    { id: `${piece.id}_start`, pieceId: piece.id, x: sx, y: sy, label: 'start', color: '#c94010' },
    { id: `${piece.id}_end`, pieceId: piece.id, x: ex, y: ey, label: 'end', color: '#c94010' },
    { id: `${piece.id}_mid`, pieceId: piece.id, x: mx, y: my, label: 'mid', color: '#15803d' },
    { id: `${piece.id}_q1`, pieceId: piece.id, x: q1x, y: q1y, label: 'quarter1', color: '#1d4ed8' },
    { id: `${piece.id}_q3`, pieceId: piece.id, x: q3x, y: q3y, label: 'quarter3', color: '#1d4ed8' },
  ];
}

export function getInsets(piece: Piece, connections: Connection[], pieces: Piece[]): { startInset: number; endInset: number } {
  let startInset = 0;
  let endInset = 0;

  if (piece.type === 'sheet' || piece.type === 'plate' || piece.orientation === 'upright') {
    return { startInset: 0, endInset: 0 };
  }

  for (const conn of connections) {
    const isA = conn.pieceAId === piece.id;
    const isB = conn.pieceBId === piece.id;
    if (!isA && !isB) continue;

    const otherPieceId = isA ? conn.pieceBId : conn.pieceAId;
    const otherPiece = pieces.find(p => p.id === otherPieceId);
    if (!otherPiece) continue;
    if (otherPiece.type === 'sheet' || otherPiece.type === 'plate' || otherPiece.orientation === 'upright') continue;

    const mySnap = isA ? conn.snapPointA : conn.snapPointB;
    const isStart = mySnap.endsWith('_start');
    const isEnd = mySnap.endsWith('_end');

    if (!isStart && !isEnd) continue;

    const myAngle = piece.angle % 180;
    const otherAngle = otherPiece.angle % 180;
    const diff = Math.abs(myAngle - otherAngle) % 180;
    const isPerpendicular = diff > 45 && diff < 135;

    if (isPerpendicular) {
      const inset = getVisualHeight(otherPiece) / 2;
      if (isStart) startInset = Math.max(startInset, inset);
      else endInset = Math.max(endInset, inset);
    }
  }

  return { startInset, endInset };
}

export function findSnap(
  draggingPiece: Piece,
  allPieces: Piece[],
  snapRadius: number,
  zoom: number
): SnapResult | null {
  const myPoints = getSnapPoints(draggingPiece);
  const radiusWorld = snapRadius / (zoom * SCALE);

  let best: SnapResult | null = null;
  let bestDist = radiusWorld;

  for (const other of allPieces) {
    if (other.id === draggingPiece.id) continue;
    const otherPoints = getSnapPoints(other);

    for (const mine of myPoints) {
      for (const theirs of otherPoints) {
        const dx = theirs.x - mine.x;
        const dy = theirs.y - mine.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { snapPoint: mine, targetPoint: theirs, dx, dy };
        }
      }
    }
  }

  return best;
}

export function applySnapToPiece(piece: Piece, snap: SnapResult): Piece {
  return {
    ...piece,
    x: piece.x + snap.dx,
    y: piece.y + snap.dy,
  };
}

export function getHoleCanvasPos(piece: Piece, fromStart: number, zoom: number, panX: number, panY: number): [number, number] {
  const { sx, sy, ex, ey } = getPieceEndpoints(piece);
  const t = fromStart / piece.length;
  const wx = sx + (ex - sx) * t;
  const wy = sy + (ey - sy) * t;
  return worldToCanvas(wx, wy, zoom, panX, panY);
}

export function snapHolePosition(piece: Piece, worldX: number, worldY: number): number {
  const { sx, sy, ex, ey } = getPieceEndpoints(piece);
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return 0;
  const tx = worldX - sx;
  const ty = worldY - sy;
  const t = Math.max(0, Math.min(1, (tx * dx + ty * dy) / (len * len)));
  return t * piece.length;
}

export function hitTestPiece(piece: Piece, wx: number, wy: number): boolean {
  if (piece.orientation === 'upright') {
    const dx = wx - piece.x;
    const dy = wy - piece.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.5;
  }

  if (piece.type === 'sheet' || piece.type === 'plate') {
    const rad = getAngleRad(piece);
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const dx = wx - piece.x;
    const dy = wy - piece.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    return Math.abs(lx) <= piece.length / 2 + 0.2 && Math.abs(ly) <= piece.height / 2 + 0.2;
  }

  const rad = getAngleRad(piece);
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const dx = wx - piece.x;
  const dy = wy - piece.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const halfH = getVisualHeight(piece) / 2;
  return Math.abs(lx) <= piece.length / 2 + 0.2 && Math.abs(ly) <= halfH + 0.2;
}
