import React, { useEffect, useRef } from 'react'
import { Toaster } from 'sonner'
import Toolbar from './components/Toolbar'
import LibraryPanel from './components/LibraryPanel'
import Canvas2D from './components/Canvas2D'
import Canvas3D from './components/Canvas3D'
import PropertiesPanel from './components/PropertiesPanel'
import BOMPanel from './components/BOMPanel'
import TitleBlockModal from './components/TitleBlockModal'
import AIModal from './components/AIModal'
import PhotoModal from './components/PhotoModal'
import CostCalculator from './components/CostCalculator'
import CommandPalette from './components/CommandPalette'
import ContextMenu from './components/ContextMenu'
import { useProjectStore } from './store/projectStore'
import { useUIStore } from './store/uiStore'
import { useHistoryStore } from './store/historyStore'
import type Konva from 'konva'

export default function App() {
  const stageRef = useRef<Konva.Stage>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const { project, deletePieces } = useProjectStore()
  const {
    mode, setMode, selectedIds, setSelectedIds, activeView,
    showTitleBlockModal, showAIModal, showPhotoModal, showCostCalculator, showCommandPalette,
    setShowCommandPalette, isBOMCollapsed,
  } = useUIStore()
  const { push } = useHistoryStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            break
          case 'y':
            e.preventDefault()
            break
          case 'k':
            e.preventDefault()
            setShowCommandPalette(true)
            break
          case 's':
            e.preventDefault()
            break
        }
        return
      }

      switch (e.key) {
        case 'v': case 'V': setMode('select'); break
        case 'h': case 'H': setMode('pan'); break
        case 'Escape':
          setSelectedIds([])
          setShowCommandPalette(false)
          break
        case 'Delete':
        case 'Backspace':
          if (selectedIds.length > 0) {
            const remaining = project.pieces.filter(p => !selectedIds.includes(p.id))
            const remainingConns = project.connections.filter(c => !selectedIds.includes(c.p1) && !selectedIds.includes(c.p2))
            deletePieces(selectedIds)
            setSelectedIds([])
            push({ pieces: remaining, connections: remainingConns })
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, project, mode, setMode, setSelectedIds, deletePieces, push, setShowCommandPalette])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0a0d14' }}>
      <Toolbar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
        <LibraryPanel />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeView === '2d' ? (
              <Canvas2D stageRef={stageRef as React.RefObject<Konva.Stage>} containerRef={canvasContainerRef as React.RefObject<HTMLDivElement>} />
            ) : (
              <Canvas3D />
            )}
          </div>
          <BOMPanel />
        </div>

        <PropertiesPanel />
      </div>

      {showTitleBlockModal && <TitleBlockModal />}
      {showAIModal && <AIModal />}
      {showPhotoModal && <PhotoModal />}
      {showCostCalculator && <CostCalculator />}
      {showCommandPalette && <CommandPalette />}
      <ContextMenu />
      <Toaster position="bottom-right" theme="dark" />
    </div>
  )
}
