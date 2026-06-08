import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Piece, Connection, TitleBlock } from '../types'

const defaultTitleBlock: TitleBlock = {
  company:'FabDraw Engineering',address:'',phone:'',web:'fabdraw.io',
  project:'New Project',description:'',drawnBy:'',checkedBy:'',
  date:new Date().toLocaleDateString(),scale:'1:1',dwgNo:'DWG-001',revision:'A',
}

interface ProjectState {
  name: string
  pieces: Piece[]
  connections: Connection[]
  titleBlock: TitleBlock
  zoom: number
  panX: number
  panY: number
  savedAt: number | null

  setName: (n:string) => void
  addPiece: (p:Piece) => void
  updatePiece: (id:string, u:Partial<Piece>) => void
  deletePieces: (ids:string[]) => void
  setPieces: (p:Piece[]) => void
  addConnection: (c:Connection) => void
  updateConnectionType: (id:string, type:string) => void
  removeConnectionsForPiece: (pid:string) => void
  removeConnection: (id:string) => void
  setConnections: (c:Connection[]) => void
  updateTitleBlock: (tb:Partial<TitleBlock>) => void
  setZoom: (z:number) => void
  setPan: (x:number,y:number) => void
  setPanZoom: (x:number,y:number,z:number) => void
  markSaved: () => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(persist((set) => ({
  name:'Untitled Project',
  pieces:[],connections:[],
  titleBlock:defaultTitleBlock,
  zoom:1,panX:240,panY:120,
  savedAt:null,

  setName:n=>set({name:n}),
  addPiece:p=>set(s=>({pieces:[...s.pieces,p]})),
  updatePiece:(id,u)=>set(s=>({pieces:s.pieces.map(p=>p.id===id?{...p,...u}:p)})),
  deletePieces:ids=>set(s=>({
    pieces:s.pieces.filter(p=>!ids.includes(p.id)),
    connections:s.connections.filter(c=>!ids.includes(c.p1)&&!ids.includes(c.p2)),
  })),
  setPieces:p=>set({pieces:p}),
  addConnection:c=>set(s=>({connections:[...s.connections,c]})),
  updateConnectionType:(id,type)=>set(s=>({connections:s.connections.map(c=>c.id===id?{...c,type:type as any}:c)})),
  removeConnectionsForPiece:pid=>set(s=>({connections:s.connections.filter(c=>c.p1!==pid&&c.p2!==pid)})),
  removeConnection:id=>set(s=>({connections:s.connections.filter(c=>c.id!==id)})),
  setConnections:c=>set({connections:c}),
  updateTitleBlock:tb=>set(s=>({titleBlock:{...s.titleBlock,...tb}})),
  setZoom:z=>set({zoom:z}),
  setPan:(panX,panY)=>set({panX,panY}),
  setPanZoom:(panX,panY,zoom)=>set({panX,panY,zoom}),
  markSaved:()=>set({savedAt:Date.now()}),
  clearProject:()=>set({pieces:[],connections:[],name:'Untitled Project',titleBlock:defaultTitleBlock}),
}),{name:'fabdraw-v3'}))
