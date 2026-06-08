import { create } from 'zustand'
import type { Piece, Connection } from '../types'

interface Snapshot {
  pieces: Piece[]
  connections: Connection[]
}

interface HistoryStore {
  snapshots: Snapshot[]
  index: number
  push: (s: Snapshot) => void
  undo: () => Snapshot | null
  redo: () => Snapshot | null
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  snapshots: [],
  index: -1,
  push: (s) => set(state => {
    const trimmed = state.snapshots.slice(0, state.index + 1)
    const next = [...trimmed, s].slice(-80)
    return { snapshots: next, index: next.length - 1 }
  }),
  undo: () => {
    const { snapshots, index } = get()
    if (index <= 0) return null
    const newIdx = index - 1
    set({ index: newIdx })
    return snapshots[newIdx]
  },
  redo: () => {
    const { snapshots, index } = get()
    if (index >= snapshots.length - 1) return null
    const newIdx = index + 1
    set({ index: newIdx })
    return snapshots[newIdx]
  },
  canUndo: () => get().index > 0,
  canRedo: () => get().index < get().snapshots.length - 1,
}))
