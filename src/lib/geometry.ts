import type { Member, Connection } from '../types';
import { parseSizeString } from './materials';
export { SCALE } from './constants';
import { SCALE } from './constants';

export interface SnapPoint {
  id: string
  memberId: string
  x: number
  y: number
  label: string
  color: string
}

export interface SnapResult {
  snapPoint: SnapPoint
  targetPoint: SnapPoint
  dx: number
  dy: number
}

export function worldToCanvas(wx: number, wy: number, zoom: number, panX: number, panY: number): [number, number] {
  return [wx * zoom * SCALE + panX, wy * zoom * SCALE + panY];
}

export function canvasToWorld(cx: number, cy: number, zoom: number, panX: number, panY: number): [number, number] {
  return [(cx - panX) / (zoom * SCALE), (cy - panY) / (zoom * SCALE)];
}

export function isUpright(m: Member): boolean {
  return Math.abs(m.rotation.x) >= 45;
}

export function getMemberAngleRad(m: Member): number {
  return (m.rotation.y * Math.PI) / 180;
}

export function getMemberVisualHeight(m: Member): number {
  const { width, height } = parseSizeString(m.type, m.size);
  if (m.type === 'sheet' || m.type === 'plate') return height;
  if (m.type === 'round_tube' || m.type === 'pipe') return width;
  if (m.type === 'angle') return width;
  if (m.type === 'i_beam') return height;
  return height;
}

export function getMemberEndpoints(m: Member): { sx: number; sy: number; ex: number; ey: number } {
  if (isUpright(m)) {
    return { sx: m.position.x, sy: m.position.y, ex: m.position.x, ey: m.position.y };
  }
  const rad = getMemberAngleRad(m);
  const halfLen = m.length / 2;
  return {
    sx: m.position.x - Math.cos(rad) * halfLen,
    sy: m.position.y - Math.sin(rad) * halfLen,
    ex: m.position.x + Math.cos(rad) * halfLen,
    ey: m.position.y + Math.sin(rad) * halfLen,
  };
}

export function getSnapPoints(m: Member): SnapPoint[] {
  if (isUpright(m)) {
    return [{
      id: `${m.id}_center`,
      memberId: m.id,
      x: m.position.x,
      y: m.position.y,
      label: 'center',
      color: '#15803d',
    }];
  }

  const { sx, sy, ex, ey } = getMemberEndpoints(m);
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const q1x = (sx + mx) / 2;
  const q1y = (sy + my) / 2;
  const q3x = (mx + ex) / 2;
  const q3y = (my + ey) / 2;

  return [
    { id: `${m.id}_start`, memberId: m.id, x: sx, y: sy, label: 'start', color: '#c94010' },
    { id: `${m.id}_end`, memberId: m.id, x: ex, y: ey, label: 'end', color: '#c94010' },
    { id: `${m.id}_mid`, memberId: m.id, x: mx, y: my, label: 'mid', color: '#15803d' },
    { id: `${m.id}_q1`, memberId: m.id, x: q1x, y: q1y, label: 'quarter1', color: '#1d4ed8' },
    { id: `${m.id}_q3`, memberId: m.id, x: q3x, y: q3y, label: 'quarter3', color: '#1d4ed8' },
  ];
}

export function getInsets(
  member: Member,
  connections: Connection[],
  members: Member[]
): { startInset: number; endInset: number } {
  if (member.type === 'sheet' || member.type === 'plate' || isUpright(member)) {
    return { startInset: 0, endInset: 0 };
  }

  let startInset = 0;
  let endInset = 0;

  for (const conn of connections) {
    const isA = conn.memberAId === member.id;
    const isB = conn.memberBId === member.id;
    if (!isA && !isB) continue;

    const otherId = isA ? conn.memberBId : conn.memberAId;
    const other = members.find(m => m.id === otherId);
    if (!other) continue;
    if (other.type === 'sheet' || other.type === 'plate' || isUpright(other)) continue;

    const myAngle = member.rotation.y % 180;
    const otherAngle = other.rotation.y % 180;
    const diff = Math.abs(myAngle - otherAngle) % 180;
    const isPerpendicular = diff > 45 && diff < 135;
    if (!isPerpendicular) continue;

    const inset = getMemberVisualHeight(other) / 2;
    const myPoint = isA ? conn.pointA : conn.pointB;
    const { sx, sy } = getMemberEndpoints(member);
    const distToStart = Math.hypot(myPoint.x - sx, myPoint.y - sy);
    if (distToStart < member.length * 0.25) startInset = Math.max(startInset, inset);
    else endInset = Math.max(endInset, inset);
  }

  return { startInset, endInset };
}

export function findSnap(
  dragging: Member,
  allMembers: Member[],
  snapRadius: number,
  zoom: number
): SnapResult | null {
  const myPoints = getSnapPoints(dragging);
  const radiusWorld = snapRadius / (zoom * SCALE);

  let best: SnapResult | null = null;
  let bestDist = radiusWorld;

  for (const other of allMembers) {
    if (other.id === dragging.id) continue;
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

export function hitTestMember(m: Member, wx: number, wy: number): boolean {
  if (isUpright(m)) {
    const dx = wx - m.position.x;
    const dy = wy - m.position.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.5;
  }

  const rad = getMemberAngleRad(m);
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  const dx = wx - m.position.x;
  const dy = wy - m.position.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const halfH = getMemberVisualHeight(m) / 2;
  return Math.abs(lx) <= m.length / 2 + 0.2 && Math.abs(ly) <= halfH + 0.2;
}
