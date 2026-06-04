import { create } from 'zustand';
import type { Piece } from '../types';

export type Mode = 'select' | 'pan' | 'hole_add';
export type ActiveView = '2d' | '3d';
export type ActiveRightTab = 'props' | 'holes' | 'notes';

interface HolePreview {
  pieceId: string;
  fromStart: number;
  x: number;
  y: number;
}

interface ContextMenu {
  x: number;
  y: number;
  type: 'piece' | 'connection' | 'canvas';
  pieceId?: string;
  connectionId?: string;
}

interface UIState {
  mode: Mode;
  selectedIds: string[];
  selectedConnectionId: string | null;
  activeView: ActiveView;
  activeRightTab: ActiveRightTab;
  isBOMCollapsed: boolean;
  clipboard: Piece[];
  holeAddMode: boolean;
  holePreview: HolePreview | null;
  showTitleBlockModal: boolean;
  showAIModal: boolean;
  contextMenu: ContextMenu | null;
  snapPreview: { x: number; y: number } | null;

  setMode: (mode: Mode) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  setSelectedConnectionId: (id: string | null) => void;
  setActiveView: (view: ActiveView) => void;
  setActiveRightTab: (tab: ActiveRightTab) => void;
  toggleBOM: () => void;
  setClipboard: (pieces: Piece[]) => void;
  setHoleAddMode: (v: boolean) => void;
  setHolePreview: (h: HolePreview | null) => void;
  setShowTitleBlockModal: (v: boolean) => void;
  setShowAIModal: (v: boolean) => void;
  setContextMenu: (m: ContextMenu | null) => void;
  setSnapPreview: (p: { x: number; y: number } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'select',
  selectedIds: [],
  selectedConnectionId: null,
  activeView: '2d',
  activeRightTab: 'props',
  isBOMCollapsed: false,
  clipboard: [],
  holeAddMode: false,
  holePreview: null,
  showTitleBlockModal: false,
  showAIModal: false,
  contextMenu: null,
  snapPreview: null,

  setMode: (mode) => set({ mode }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelectedId: (id) => set(s => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter(x => x !== id)
      : [...s.selectedIds, id]
  })),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setActiveView: (activeView) => set({ activeView }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  toggleBOM: () => set(s => ({ isBOMCollapsed: !s.isBOMCollapsed })),
  setClipboard: (clipboard) => set({ clipboard }),
  setHoleAddMode: (holeAddMode) => set({ holeAddMode }),
  setHolePreview: (holePreview) => set({ holePreview }),
  setShowTitleBlockModal: (showTitleBlockModal) => set({ showTitleBlockModal }),
  setShowAIModal: (showAIModal) => set({ showAIModal }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setSnapPreview: (snapPreview) => set({ snapPreview }),
}));
