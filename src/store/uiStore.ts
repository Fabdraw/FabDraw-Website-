import { create } from 'zustand';
import type { Member } from '../types';

export type Mode = 'select' | 'pan' | 'hole_add';
export type ActiveView = '2d' | '3d';
export type ActiveRightTab = 'props' | 'holes' | 'notes';

interface ContextMenu {
  x: number;
  y: number;
  type: 'member' | 'connection' | 'canvas';
  memberId?: string;
  connectionId?: string;
}

interface UIState {
  mode: Mode;
  selectedIds: string[];
  selectedConnectionId: string | null;
  activeView: ActiveView;
  activeRightTab: ActiveRightTab;
  isBOMCollapsed: boolean;
  clipboard: Member[];
  showTitleBlockModal: boolean;
  showAIModal: boolean;
  contextMenu: ContextMenu | null;

  // Pan/zoom (separate from project data)
  panX: number;
  panY: number;
  zoom: number;

  setMode: (mode: Mode) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  setSelectedConnectionId: (id: string | null) => void;
  setActiveView: (view: ActiveView) => void;
  setActiveRightTab: (tab: ActiveRightTab) => void;
  toggleBOM: () => void;
  setClipboard: (members: Member[]) => void;
  setShowTitleBlockModal: (v: boolean) => void;
  setShowAIModal: (v: boolean) => void;
  holeAddMode: boolean
  holeTargetMemberId: string | null
  setHoleAddMode: (active: boolean, memberId?: string | null) => void
  setContextMenu: (m: ContextMenu | null) => void;
  setPanZoom: (x: number, y: number, z: number) => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'select',
  selectedIds: [],
  selectedConnectionId: null,
  activeView: '2d',
  activeRightTab: 'props',
  isBOMCollapsed: false,
  clipboard: [],
  showTitleBlockModal: false,
  showAIModal: false,
  contextMenu: null,
  holeAddMode: false,
  holeTargetMemberId: null,
  panX: 400,
  panY: 300,
  zoom: 1,

  setMode: (mode) => set({ mode }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelectedId: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setActiveView: (activeView) => set({ activeView }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  toggleBOM: () => set((s) => ({ isBOMCollapsed: !s.isBOMCollapsed })),
  setClipboard: (clipboard) => set({ clipboard }),
  setShowTitleBlockModal: (showTitleBlockModal) => set({ showTitleBlockModal }),
  setShowAIModal: (showAIModal) => set({ showAIModal }),
  setHoleAddMode: (active, memberId = null) => set({ holeAddMode: active, holeTargetMemberId: memberId ?? null }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setPanZoom: (x, y, z) => set({ panX: x, panY: y, zoom: z }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),
}));
