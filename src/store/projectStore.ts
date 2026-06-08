import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { Project, Piece, Connection, TitleBlock, JointType } from '../types'

const DEFAULT_TITLE_BLOCK: TitleBlock = {
  company: 'FabDraw Engineering',
  address: '',
  phone: '',
  web: '',
  project: 'New Project',
  description: '',
  drawnBy: '',
  checkedBy: '',
  date: new Date().toLocaleDateString(),
  scale: 'NTS',
  dwgNo: '001',
  revision: 'A',
}

function defaultProject(): Project {
  return {
    id: uuid(),
    name: 'New Project',
    pieces: [],
    connections: [],
    titleBlock: { ...DEFAULT_TITLE_BLOCK },
    zoom: 1,
    panX: 400,
    panY: 300,
  }
}

interface ProjectStore {
  project: Project
  initProject: () => void
  setProjectName: (name: string) => void
  addPiece: (piece: Omit<Piece, 'id'>) => string
  updatePiece: (id: string, updates: Partial<Piece>) => void
  deletePieces: (ids: string[]) => void
  addConnection: (conn: Omit<Connection, 'id'>) => void
  updateConnectionType: (id: string, type: JointType) => void
  removeConnectionsForPiece: (pieceId: string) => void
  updateTitleBlock: (updates: Partial<TitleBlock>) => void
  setPanZoom: (panX: number, panY: number, zoom: number) => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      project: defaultProject(),
      initProject: () => set({ project: defaultProject() }),
      setProjectName: (name) => set(s => ({ project: { ...s.project, name } })),
      addPiece: (piece) => {
        const id = uuid()
        set(s => ({ project: { ...s.project, pieces: [...s.project.pieces, { ...piece, id }] } }))
        return id
      },
      updatePiece: (id, updates) => set(s => ({
        project: {
          ...s.project,
          pieces: s.project.pieces.map(p => p.id === id ? { ...p, ...updates } : p)
        }
      })),
      deletePieces: (ids) => set(s => ({
        project: {
          ...s.project,
          pieces: s.project.pieces.filter(p => !ids.includes(p.id)),
          connections: s.project.connections.filter(c => !ids.includes(c.p1) && !ids.includes(c.p2))
        }
      })),
      addConnection: (conn) => set(s => ({
        project: {
          ...s.project,
          connections: [...s.project.connections, { ...conn, id: uuid() }]
        }
      })),
      updateConnectionType: (id, type) => set(s => ({
        project: {
          ...s.project,
          connections: s.project.connections.map(c => c.id === id ? { ...c, type } : c)
        }
      })),
      removeConnectionsForPiece: (pieceId) => set(s => ({
        project: {
          ...s.project,
          connections: s.project.connections.filter(c => c.p1 !== pieceId && c.p2 !== pieceId)
        }
      })),
      updateTitleBlock: (updates) => set(s => ({
        project: { ...s.project, titleBlock: { ...s.project.titleBlock, ...updates } }
      })),
      setPanZoom: (panX, panY, zoom) => set(s => ({
        project: { ...s.project, panX, panY, zoom }
      })),
    }),
    { name: 'fabdraw-v4' }
  )
)
