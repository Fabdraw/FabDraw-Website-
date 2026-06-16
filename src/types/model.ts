export type MemberType = 'square_tube' | 'round_tube' | 'rect_tube' | 'pipe' | 'angle' | 'channel' | 'i_beam' | 'flat_bar' | 'sheet' | 'plate'
export type Grade = 'mild' | 'stainless' | 'aluminum'

export interface Hole {
  id: string
  type: 'circle' | 'slot'
  diameter: number
  positionAlongMember: number // inches from start
  face: 'top' | 'front' | 'side'
}

export interface Member {
  id: string
  type: MemberType
  size: string // e.g. "2x2", "1.5", "4x2"
  wallThickness: string // e.g. "0.120", "0.083"
  grade: Grade
  length: number
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number } // degrees
  holes: Hole[]
  groupId?: string
}

export interface Dimension {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  offset: number // perpendicular offset in inches (positive = above)
}

export interface Connection {
  id: string
  memberAId: string
  memberBId: string
  type: 'weld' | 'bolted' | 'flanged'
  pointA: { x: number; y: number; z: number }
  pointB: { x: number; y: number; z: number }
}

export interface TitleBlock {
  title: string
  drawnBy: string
  checkedBy: string
  date: string
  revision: string
  company: string
  address: string
  phone: string
  web: string
  project: string
  description: string
  scale: string
  sheet: string
  dwgNo: string
  notes: string
}

export const DEFAULT_TITLE_BLOCK: TitleBlock = {
  title: '',
  drawnBy: '',
  checkedBy: '',
  date: new Date().toLocaleDateString(),
  revision: 'A',
  company: '',
  address: '',
  phone: '',
  web: '',
  project: '',
  description: '',
  scale: '1:1',
  sheet: '1 of 1',
  dwgNo: 'DWG-001',
  notes: '',
}

export interface Project {
  id: string
  name: string
  members: Member[]
  connections: Connection[]
  dimensions: Dimension[]
  groupNames: Record<string, string>
  titleBlock: TitleBlock
}
