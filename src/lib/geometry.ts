import type { Piece } from '../types'
import { getOD, getHeight, getWall } from './materials'

export const SCALE = 8
export const SNAP_DIST = 20

export interface SnapPoint {
  id: string
  pieceId: string
  x: number
  y: number
  label: 'start' | 'end' | 'mid' | 'q1' | 'q3' | 'corner_tl' | 'corner_tr' | 'corner_bl' | 'corner_br' | 'edge_t' | 'edge_b' | 'edge_l' | 'edge_r' | 'center'
  color: string
}

export interface SnapResult {
  myPoint: SnapPoint
  targetPoint: SnapPoint
  dx: number
  dy: number
}

export function worldToCanvas(wx: number, wy: number, panX: number, panY: number, zoom: number): [number,number] {
  return [wx * zoom * SCALE + panX, wy * zoom * SCALE + panY]
}

export function canvasToWorld(cx: number, cy: number, panX: number, panY: number, zoom: number): [number,number] {
  return [(cx - panX) / (zoom * SCALE), (cy - panY) / (zoom * SCALE)]
}

export function getVisualHeight(piece: Piece, zoom: number): number {
  const { type, sizeIdx, customH } = piece
  const s = SCALE * zoom
  switch (type) {
    case 'square_tube': return Math.max(8, getOD(type, sizeIdx) * s)
    case 'round_tube': return Math.max(8, getOD(type, sizeIdx) * s)
    case 'pipe': return Math.max(8, getOD(type, sizeIdx) * s)
    case 'rect_tube': return Math.max(8, getHeight(type, sizeIdx) * s)
    case 'angle': return Math.max(6, getOD(type, sizeIdx) * s)
    case 'channel': return Math.max(8, getOD(type, sizeIdx) * s)
    case 'ibeam': return Math.max(8, getOD(type, sizeIdx) * s)
    case 'flat_bar': return Math.max(4, getOD(type, sizeIdx) * s * 0.3)
    case 'sheet': return Math.max(12, (customH ?? 48) * s)
    case 'plate': return Math.max(12, (customH ?? 12) * s)
    default: return 8
  }
}

export function getPieceEndpointsWorld(piece: Piece): {sx:number,sy:number,ex:number,ey:number} {
  if (piece.upright) return {sx:piece.x,sy:piece.y,ex:piece.x,ey:piece.y}
  const rad = piece.angle * Math.PI / 180
  const halfLen = piece.length / 2
  return {
    sx: piece.x - Math.cos(rad)*halfLen,
    sy: piece.y - Math.sin(rad)*halfLen,
    ex: piece.x + Math.cos(rad)*halfLen,
    ey: piece.y + Math.sin(rad)*halfLen,
  }
}

export function getSnapPoints(piece: Piece, panX: number, panY: number, zoom: number): SnapPoint[] {
  if (piece.upright) {
    const [cx,cy] = worldToCanvas(piece.x, piece.y, panX, panY, zoom)
    return [{id:`${piece.id}_c`,pieceId:piece.id,x:cx,y:cy,label:'center',color:'#22c55e'}]
  }

  if (piece.type === 'sheet' || piece.type === 'plate') {
    const rad = piece.angle * Math.PI / 180
    const hw = piece.length / 2
    const hh = (piece.customH ?? 48) / 2
    const cos = Math.cos(rad), sin = Math.sin(rad)
    const pc = Math.cos(rad + Math.PI/2), ps = Math.sin(rad + Math.PI/2)
    const pts = [
      [piece.x-cos*hw-pc*hh, piece.y-sin*hw-ps*hh],
      [piece.x+cos*hw-pc*hh, piece.y+sin*hw-ps*hh],
      [piece.x-cos*hw+pc*hh, piece.y-sin*hw+ps*hh],
      [piece.x+cos*hw+pc*hh, piece.y+sin*hw+ps*hh],
      [piece.x-pc*hh, piece.y-ps*hh],
      [piece.x+pc*hh, piece.y+ps*hh],
      [piece.x-cos*hw, piece.y-sin*hw],
      [piece.x+cos*hw, piece.y+sin*hw],
      [piece.x, piece.y],
    ]
    const labels: SnapPoint['label'][] = ['corner_tl','corner_tr','corner_bl','corner_br','edge_t','edge_b','edge_l','edge_r','center']
    const colors = ['#f97316','#f97316','#f97316','#f97316','#3b82f6','#3b82f6','#3b82f6','#3b82f6','#22c55e']
    return pts.map((pt, i) => {
      const [cx,cy] = worldToCanvas(pt[0],pt[1],panX,panY,zoom)
      return {id:`${piece.id}_${labels[i]}`,pieceId:piece.id,x:cx,y:cy,label:labels[i],color:colors[i]}
    })
  }

  const {sx,sy,ex,ey} = getPieceEndpointsWorld(piece)
  const [scx,scy] = worldToCanvas(sx,sy,panX,panY,zoom)
  const [ecx,ecy] = worldToCanvas(ex,ey,panX,panY,zoom)
  const [mcx,mcy] = worldToCanvas((sx+ex)/2,(sy+ey)/2,panX,panY,zoom)
  const q1wx=(sx*3+ex)/4, q1wy=(sy*3+ey)/4
  const q3wx=(sx+ex*3)/4, q3wy=(sy+ey*3)/4
  const [q1cx,q1cy] = worldToCanvas(q1wx,q1wy,panX,panY,zoom)
  const [q3cx,q3cy] = worldToCanvas(q3wx,q3wy,panX,panY,zoom)

  return [
    {id:`${piece.id}_s`,pieceId:piece.id,x:scx,y:scy,label:'start',color:'#f97316'},
    {id:`${piece.id}_e`,pieceId:piece.id,x:ecx,y:ecy,label:'end',color:'#f97316'},
    {id:`${piece.id}_m`,pieceId:piece.id,x:mcx,y:mcy,label:'mid',color:'#22c55e'},
    {id:`${piece.id}_q1`,pieceId:piece.id,x:q1cx,y:q1cy,label:'q1',color:'#3b82f6'},
    {id:`${piece.id}_q3`,pieceId:piece.id,x:q3cx,y:q3cy,label:'q3',color:'#3b82f6'},
  ]
}

export function findSnap(dragging: Piece, others: Piece[], panX: number, panY: number, zoom: number): SnapResult | null {
  const myPts = getSnapPoints(dragging, panX, panY, zoom).filter(p => p.label === 'start' || p.label === 'end' || p.label === 'mid')
  let best: SnapResult | null = null
  let bestDist = SNAP_DIST

  for (const other of others) {
    if (other.id === dragging.id) continue
    const theirPts = getSnapPoints(other, panX, panY, zoom)
    for (const mp of myPts) {
      for (const tp of theirPts) {
        const dx = tp.x - mp.x
        const dy = tp.y - mp.y
        const dist = Math.sqrt(dx*dx+dy*dy)
        if (dist < bestDist) {
          bestDist = dist
          best = {myPoint:mp, targetPoint:tp, dx, dy}
        }
      }
    }
  }
  return best
}

export function hitTestPiece(piece: Piece, wx: number, wy: number, zoom: number): boolean {
  if (piece.upright) {
    const dx = wx - piece.x, dy = wy - piece.y
    return Math.sqrt(dx*dx+dy*dy) < 1
  }
  const rad = piece.angle * Math.PI / 180
  const dx = wx - piece.x, dy = wy - piece.y
  const lx = dx*Math.cos(-rad) - dy*Math.sin(-rad)
  const ly = dx*Math.sin(-rad) + dy*Math.cos(-rad)
  const halfLen = piece.length/2
  const halfH = getVisualHeight(piece, zoom) / (2*SCALE*zoom)
  return Math.abs(lx) <= halfLen+0.5 && Math.abs(ly) <= halfH+0.5
}
