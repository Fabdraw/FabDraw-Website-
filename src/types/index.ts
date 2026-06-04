export type MaterialType = 'square_tube' | 'round_tube' | 'rect_tube' | 'pipe' | 'angle' | 'channel' | 'ibeam' | 'flat_bar' | 'sheet' | 'plate';
export type MaterialGrade = 'mild_steel' | 'stainless' | 'aluminum';
export type Orientation = 'horizontal' | 'vertical' | 'upright';
export type HoleType = 'through' | 'tapped' | 'countersink';
export type ConnectionType = 'butt' | 'miter' | 'cope' | 'fish' | 'gusset' | 'flange';

export interface Hole {
  id: string;
  pieceId: string;
  snapTo: 'start' | 'end' | 'custom';
  fromStart: number;
  type: HoleType;
  diameter: number;
}

export interface Connection {
  id: string;
  pieceAId: string;
  pieceBId: string;
  snapPointA: string;
  snapPointB: string;
  type: ConnectionType;
}

export interface SnapPoint {
  id: string;
  pieceId: string;
  x: number;
  y: number;
  label: 'start' | 'end' | 'mid' | 'quarter1' | 'quarter3' | 'corner_tl' | 'corner_tr' | 'corner_bl' | 'corner_br' | 'edge_t' | 'edge_b' | 'edge_l' | 'edge_r' | 'center';
  color: string;
}

export interface SnapResult {
  snapPoint: SnapPoint;
  targetPoint: SnapPoint;
  dx: number;
  dy: number;
}

export interface Piece {
  id: string;
  type: MaterialType;
  grade: MaterialGrade;
  width: number;
  height: number;
  wall: number;
  length: number;
  x: number;
  y: number;
  angle: number;
  orientation: Orientation;
  zHeight: number;
  notes: string;
  weldSymbol: string;
  holes: Hole[];
}

export interface TitleBlock {
  company: string;
  address: string;
  phone: string;
  web: string;
  project: string;
  description: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  scale: string;
  dwgNo: string;
  revision: string;
}

export interface MaterialDef {
  type: MaterialType;
  label: string;
  sizes: string[];
  walls: number[];
  color: string;
  svgIcon: string;
}

export interface Project {
  id: string;
  name: string;
  pieces: Piece[];
  connections: Connection[];
  titleBlock: TitleBlock;
  createdAt: string;
  updatedAt: string;
}
