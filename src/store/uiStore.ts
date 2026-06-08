import { create } from 'zustand'
import type { Piece } from '../types'

export type Mode = 'select' | 'pan'
export type ActiveView = '2d' | '3d'
export type RightTab = 'props' | 'holes' | 'notes'

interface ContextMenuState {
  x: number; y: number
  type: 'piece' | 'canvas' | 'connection'
  id?: string
}

interface UIState {
  mode: Mode
  selectedIds: string[]
  selectedConnectionId: string | null
  activeView: ActiveView
  rightTab: RightTab
  isBOMCollapsed: boolean
  clipboard: Piece[]
  holeAddMode: boolean
  holePreview: {pieceId:string;posInches:number;x:number;y:number} | null
  showTitleBlockModal: boolean
  showAIModal: boolean
  showPhotoModal: boolean
  showCostCalc: boolean
  showCommandPalette: boolean
  contextMenu: ContextMenuState | null
  snapPreview: {x:number;y:number;label:string} | null

  setMode: (m:Mode) => void
  setSelectedIds: (ids:string[]) => void
  addSelectedId: (id:string) => void
  toggleSelectedId: (id:string) => void
  setSelectedConnectionId: (id:string|null) => void
  setActiveView: (v:ActiveView) => void
  setRightTab: (t:RightTab) => void
  toggleBOM: () => void
  setClipboard: (p:Piece[]) => void
  setHoleAddMode: (v:boolean) => void
  setHolePreview: (h:UIState['holePreview']) => void
  setShowTitleBlockModal: (v:boolean) => void
  setShowAIModal: (v:boolean) => void
  setShowPhotoModal: (v:boolean) => void
  setShowCostCalc: (v:boolean) => void
  setShowCommandPalette: (v:boolean) => void
  setContextMenu: (m:ContextMenuState|null) => void
  setSnapPreview: (s:UIState['snapPreview']) => void
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'select',
  selectedIds: [],
  selectedConnectionId: null,
  activeView: '2d',
  rightTab: 'props',
  isBOMCollapsed: false,
  clipboard: [],
  holeAddMode: false,
  holePreview: null,
  showTitleBlockModal: false,
  showAIModal: false,
  showPhotoModal: false,
  showCostCalc: false,
  showCommandPalette: false,
  contextMenu: null,
  snapPreview: null,

  setMode: m => set({mode:m}),
  setSelectedIds: ids => set({selectedIds:ids}),
  addSelectedId: id => set(s => ({selectedIds:[...s.selectedIds,id]})),
  toggleSelectedId: id => set(s => ({
    selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter(x=>x!==id) : [...s.selectedIds,id]
  })),
  setSelectedConnectionId: id => set({selectedConnectionId:id}),
  setActiveView: v => set({activeView:v}),
  setRightTab: t => set({rightTab:t}),
  toggleBOM: () => set(s=>({isBOMCollapsed:!s.isBOMCollapsed})),
  setClipboard: p => set({clipboard:p}),
  setHoleAddMode: v => set({holeAddMode:v}),
  setHolePreview: h => set({holePreview:h}),
  setShowTitleBlockModal: v => set({showTitleBlockModal:v}),
  setShowAIModal: v => set({showAIModal:v}),
  setShowPhotoModal: v => set({showPhotoModal:v}),
  setShowCostCalc: v => set({showCostCalc:v}),
  setShowCommandPalette: v => set({showCommandPalette:v}),
  setContextMenu: m => set({contextMenu:m}),
  setSnapPreview: s => set({snapPreview:s}),
}))
