import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Piece, Connection, TitleBlock } from '../types';

const defaultTitleBlock: TitleBlock = {
  company: 'FabDraw Engineering',
  address: '123 Industrial Ave, Suite 100',
  phone: '(555) 123-4567',
  web: 'www.fabdraw.io',
  project: 'New Project',
  description: '',
  drawnBy: '',
  checkedBy: '',
  date: new Date().toLocaleDateString(),
  scale: '1:1',
  dwgNo: 'DWG-001',
  revision: 'A',
};

interface ProjectState {
  name: string;
  pieces: Piece[];
  connections: Connection[];
  titleBlock: TitleBlock;
  zoom: number;
  panX: number;
  panY: number;
  savedAt: number | null;

  setName: (name: string) => void;
  addPiece: (piece: Piece) => void;
  updatePiece: (id: string, updates: Partial<Piece>) => void;
  deletePieces: (ids: string[]) => void;
  setPieces: (pieces: Piece[]) => void;
  addConnection: (conn: Connection) => void;
  updateConnectionType: (id: string, type: string) => void;
  removeConnectionsForPiece: (pieceId: string) => void;
  removeConnection: (id: string) => void;
  setConnections: (conns: Connection[]) => void;
  updateTitleBlock: (tb: Partial<TitleBlock>) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  markSaved: () => void;
  clearProject: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      name: 'Untitled Project',
      pieces: [],
      connections: [],
      titleBlock: defaultTitleBlock,
      zoom: 1,
      panX: 200,
      panY: 200,
      savedAt: null,

      setName: (name) => set({ name }),
      addPiece: (piece) => set(s => ({ pieces: [...s.pieces, piece] })),
      updatePiece: (id, updates) => set(s => ({
        pieces: s.pieces.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      deletePieces: (ids) => set(s => ({
        pieces: s.pieces.filter(p => !ids.includes(p.id)),
        connections: s.connections.filter(c => !ids.includes(c.pieceAId) && !ids.includes(c.pieceBId)),
      })),
      setPieces: (pieces) => set({ pieces }),
      addConnection: (conn) => set(s => {
        const exists = s.connections.some(
          c => (c.pieceAId === conn.pieceAId && c.pieceBId === conn.pieceBId &&
            c.snapPointA === conn.snapPointA && c.snapPointB === conn.snapPointB)
        );
        if (exists) return s;
        return { connections: [...s.connections, conn] };
      }),
      updateConnectionType: (id, type) => set(s => ({
        connections: s.connections.map(c => c.id === id ? { ...c, type: type as any } : c)
      })),
      removeConnectionsForPiece: (pieceId) => set(s => ({
        connections: s.connections.filter(c => c.pieceAId !== pieceId && c.pieceBId !== pieceId)
      })),
      removeConnection: (id) => set(s => ({
        connections: s.connections.filter(c => c.id !== id)
      })),
      setConnections: (connections) => set({ connections }),
      updateTitleBlock: (tb) => set(s => ({ titleBlock: { ...s.titleBlock, ...tb } })),
      setZoom: (zoom) => set({ zoom }),
      setPan: (panX, panY) => set({ panX, panY }),
      markSaved: () => set({ savedAt: Date.now() }),
      clearProject: () => set({
        pieces: [],
        connections: [],
        name: 'Untitled Project',
        titleBlock: defaultTitleBlock,
      }),
    }),
    { name: 'fabdraw-project' }
  )
);
