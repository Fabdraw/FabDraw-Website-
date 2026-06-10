export type MaterialType = 'square_tube' | 'round_tube' | 'rect_tube' | 'pipe' | 'angle' | 'channel' | 'ibeam' | 'flat_bar' | 'sheet' | 'plate'
export type MaterialGrade = 'mild_steel' | 'stainless' | 'aluminum'
export type JointType = 'butt_weld' | 'miter_weld' | 'fillet_weld' | 'cope_cut' | 'bolted' | 'flanged'

export interface Hole {
  id: string
  type: 'circle' | 'square' | 'rect'
  posInches: number
  diameter: number
  height?: number
}

export interface BendLine {
  id: string
  posInches: number
  angle: number
  direction: 'up' | 'down'
}

export interface Piece {
  id: string
  type: MaterialType
  sizeIdx: number
  thkIdx: number
  material: MaterialGrade
  length: number
  x: number
  y: number
  angle: number
  upright: boolean
  zOffset: number
  customW: number
  customH: number
  holes: Hole[]
  bendLines: BendLine[]
  note: string
  weldSymbol: string
}

export interface Connection {
  id: string
  p1: string
  e1: string
  p2: string
  e2: string
  type: JointType
}

export interface TitleBlock {
  company: string
  address: string
  phone: string
  web: string
  project: string
  description: string
  drawnBy: string
  checkedBy: string
  date: string
  scale: string
  dwgNo: string
  revision: string
}

export interface Project {
  id: string
  name: string
  pieces: Piece[]
  connections: Connection[]
  titleBlock: TitleBlock
  zoom: number
  panX: number
  panY: number
}
