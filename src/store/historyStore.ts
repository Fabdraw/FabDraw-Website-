import { create } from 'zustand'
import type { Piece, Connection } from '../types'

interface Snapshot { pieces: Piece[]; connections: Connection[] }

interface HistoryState {
  snapshots: Snapshot[]
  index: number
  canUndo: boolean
  canRedo: boolean
  push: (s: Snapshot) => void
  undo: () => Snapshot | null
  redo: () => Snapshot | null
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  snapshots: [],
  index: -1,
  canUndo: false,
  canRedo: false,

  push: (s) => set(state => {
    const newSnaps = [...state.snapshots.slice(0, state.index+1), s].slice(-80)
    const newIdx = newSnaps.length - 1
    return { snapshots: newSnaps, index: newIdx, canUndo: newIdx > 0, canRedo: false }
  }),

  undo: () => {
    const { snapshots, index } = get()
    if (index <= 0) return null
    const newIdx = index - 1
    set({ index: newIdx, canUndo: newIdx > 0, canRedo: true })
    return snapshots[newIdx]
  },

  redo: () => {
    const { snapshots, index } = get()
    if (index >= snapshots.length-1) return null
    const newIdx = index + 1
    set({ index: newIdx, canUndo: true, canRedo: newIdx < snapshots.length-1 })
    return snapshots[newIdx]
  },

  clear: () => set({ snapshots: [], index: -1, canUndo: false, canRedo: false }),
}))
