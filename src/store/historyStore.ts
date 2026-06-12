import { create } from 'zustand';
import type { Member, Connection } from '../types';

interface ProjectSnapshot {
  members: Member[];
  connections: Connection[];
}

interface HistoryState {
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  push: (snapshot: ProjectSnapshot) => void;
  undo: () => ProjectSnapshot | null;
  redo: () => ProjectSnapshot | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  push: (snapshot) => {
    set((state) => {
      const newPast = [...state.past, snapshot].slice(-80);
      return { past: newPast, future: [], canUndo: newPast.length > 0, canRedo: false };
    });
  },

  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const entry = past[past.length - 1];
    set((state) => {
      const newPast = state.past.slice(0, -1);
      const newFuture = [entry, ...state.future];
      return { past: newPast, future: newFuture, canUndo: newPast.length > 0, canRedo: true };
    });
    return past.length >= 2 ? past[past.length - 2] : null;
  },

  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    const entry = future[0];
    set((state) => {
      const newFuture = state.future.slice(1);
      const newPast = [...state.past, entry];
      return { past: newPast, future: newFuture, canUndo: true, canRedo: newFuture.length > 0 };
    });
    return entry;
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}));
