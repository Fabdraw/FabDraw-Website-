import { create } from 'zustand'

export type AppMode = 'select' | 'pan' | 'sketch'
export type RightTab = 'props' | 'holes' | 'notes'
export type ActiveView = '2d' | '3d'

interface SnapPreview {
  x: number
  y: number
  color: string
  label: string
}

interface ContextMenu {
  x: number
  y: number
  pieceId: string | null
  connectionId: string | null
}

interface UIStore {
  mode: AppMode
  selectedIds: string[]
  selectedConnectionId: string | null
  activeView: ActiveView
  activeRightTab: RightTab
  isBOMCollapsed: boolean
  clipboard: string[]
  holeAddMode: boolean
  holeTargetPieceId: string | null
  snapPreview: SnapPreview | null
  isDragging: boolean
  showTitleBlockModal: boolean
  showAIModal: boolean
  showPhotoModal: boolean
  showCostCalculator: boolean
  showCommandPalette: boolean
  contextMenu: ContextMenu | null
  sketchMode: boolean
  sketchPoints: { x: number; y: number }[]

  setMode: (mode: AppMode) => void
  setSelectedIds: (ids: string[]) => void
  toggleSelectedId: (id: string) => void
  setSelectedConnectionId: (id: string | null) => void
  setActiveView: (v: ActiveView) => void
  setActiveRightTab: (t: RightTab) => void
  toggleBOM: () => void
  setClipboard: (ids: string[]) => void
  setHoleAddMode: (active: boolean, pieceId?: string | null) => void
  setSnapPreview: (snap: SnapPreview | null) => void
  setIsDragging: (v: boolean) => void
  setShowTitleBlockModal: (v: boolean) => void
  setShowAIModal: (v: boolean) => void
  setShowPhotoModal: (v: boolean) => void
  setShowCostCalculator: (v: boolean) => void
  setShowCommandPalette: (v: boolean) => void
  setContextMenu: (menu: ContextMenu | null) => void
  setSketchMode: (v: boolean) => void
  addSketchPoint: (x: number, y: number) => void
  clearSketch: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  mode: 'select',
  selectedIds: [],
  selectedConnectionId: null,
  activeView: '2d',
  activeRightTab: 'props',
  isBOMCollapsed: false,
  clipboard: [],
  holeAddMode: false,
  holeTargetPieceId: null,
  snapPreview: null,
  isDragging: false,
  showTitleBlockModal: false,
  showAIModal: false,
  showPhotoModal: false,
  showCostCalculator: false,
  showCommandPalette: false,
  contextMenu: null,
  sketchMode: false,
  sketchPoints: [],

  setMode: (mode) => set({ mode }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelectedId: (id) => set(s => ({
    selectedIds: s.selectedIds.includes(id)
      ? s.selectedIds.filter(x => x !== id)
      : [...s.selectedIds, id]
  })),
  setSelectedConnectionId: (id) => set({ selectedConnectionId: id }),
  setActiveView: (v) => set({ activeView: v }),
  setActiveRightTab: (t) => set({ activeRightTab: t }),
  toggleBOM: () => set(s => ({ isBOMCollapsed: !s.isBOMCollapsed })),
  setClipboard: (ids) => set({ clipboard: ids }),
  setHoleAddMode: (active, pieceId = null) => set({ holeAddMode: active, holeTargetPieceId: pieceId ?? null }),
  setSnapPreview: (snap) => set({ snapPreview: snap }),
  setIsDragging: (v) => set({ isDragging: v }),
  setShowTitleBlockModal: (v) => set({ showTitleBlockModal: v }),
  setShowAIModal: (v) => set({ showAIModal: v }),
  setShowPhotoModal: (v) => set({ showPhotoModal: v }),
  setShowCostCalculator: (v) => set({ showCostCalculator: v }),
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setSketchMode: (v) => set({ sketchMode: v }),
  addSketchPoint: (x, y) => set(s => ({ sketchPoints: [...s.sketchPoints, { x, y }] })),
  clearSketch: () => set({ sketchPoints: [], sketchMode: false }),
}))
