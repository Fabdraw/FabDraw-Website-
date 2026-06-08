import React, { useEffect, useCallback } from 'react'
import { Toaster, toast } from 'sonner'
import Toolbar from './components/Toolbar'
import LibraryPanel from './components/LibraryPanel'
import Canvas2D from './components/Canvas2D'
import Canvas3D from './components/Canvas3D'
import PropertiesPanel from './components/PropertiesPanel'
import BOMPanel from './components/BOMPanel'
import TitleBlockModal from './components/TitleBlockModal'
import AIModal from './components/AIModal'
import ContextMenu from './components/ContextMenu'
import { useProjectStore } from './store/projectStore'
import { useUIStore } from './store/uiStore'
import { useHistoryStore } from './store/historyStore'

export default function App() {
  const { pieces, connections, setPieces, setConnections, deletePieces } = useProjectStore()
  const { mode, setMode, selectedIds, setSelectedIds, activeView, setActiveView,
    showTitleBlockModal, showAIModal, contextMenu, setContextMenu,
    setShowAIModal, setShowTitleBlockModal, clipboard, setClipboard } = useUIStore()
  const historyStore = useHistoryStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.key === 'v' || e.key === 'V') { setMode('select'); return }
    if (e.key === 'h' || e.key === 'H') { setMode('pan'); return }

    if (e.key === 'Escape') { setSelectedIds([]); setContextMenu(null); return }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.length > 0) {
        historyStore.push({ pieces, connections })
        deletePieces(selectedIds)
        setSelectedIds([])
      }
      return
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault()
        const snap = historyStore.undo()
        if (snap) { setPieces(snap.pieces); setConnections(snap.connections) }
        return
      }
      if (e.key === 'y') {
        e.preventDefault()
        const snap = historyStore.redo()
        if (snap) { setPieces(snap.pieces); setConnections(snap.connections) }
        return
      }
      if (e.key === 'a') {
        e.preventDefault()
        setSelectedIds(pieces.map(p => p.id))
        return
      }
      if (e.key === 'c') {
        e.preventDefault()
        const sel = pieces.filter(p => selectedIds.includes(p.id))
        setClipboard(sel)
        if (sel.length) toast.success(`Copied ${sel.length} piece${sel.length>1?'s':''}`)
        return
      }
      if (e.key === 'v') {
        e.preventDefault()
        if (clipboard.length) {
          historyStore.push({ pieces, connections })
          const newPieces = clipboard.map(p => ({ ...p, id: crypto.randomUUID(), x: p.x+4, y: p.y+4 }))
          newPieces.forEach(p => useProjectStore.getState().addPiece(p))
          setSelectedIds(newPieces.map(p => p.id))
          toast.success(`Pasted ${newPieces.length} piece${newPieces.length>1?'s':''}`)
        }
        return
      }
      if (e.key === 's') {
        e.preventDefault()
        useProjectStore.getState().markSaved()
        toast.success('Project saved')
        return
      }
    }

    // Arrow nudge
    const nudge = e.shiftKey ? 6 : 1
    const arrows: Record<string,{dx:number,dy:number}> = {
      ArrowLeft:{dx:-nudge,dy:0},ArrowRight:{dx:nudge,dy:0},
      ArrowUp:{dx:0,dy:-nudge},ArrowDown:{dx:0,dy:nudge}
    }
    if (arrows[e.key] && selectedIds.length) {
      e.preventDefault()
      const {dx,dy} = arrows[e.key]
      selectedIds.forEach(id => {
        const p = pieces.find(q=>q.id===id)
        if(p) useProjectStore.getState().updatePiece(id,{x:p.x+dx,y:p.y+dy})
      })
    }
  }, [pieces, connections, selectedIds, clipboard, mode, historyStore,
    setMode, setSelectedIds, setContextMenu, deletePieces, setPieces, setConnections, setClipboard])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:'#0a0d14'}}>
      <Toolbar />

      {/* View tabs */}
      <div className="flex items-center px-3 gap-1" style={{height:'34px',background:'#111827',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {(['2d','3d'] as const).map(v => (
          <button key={v} onClick={()=>setActiveView(v)}
            className="px-4 py-1 rounded text-xs font-medium transition-all"
            style={{
              background: activeView===v ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: activeView===v ? '#f97316' : '#475569',
              border: activeView===v ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
            }}>
            {v.toUpperCase()} {v==='2d'?'Layout':'View'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2" style={{fontSize:'11px',color:'#475569'}}>
          <span>{pieces.length} pieces</span>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <LibraryPanel />
        <div className="flex-1 relative overflow-hidden">
          {activeView === '2d' ? <Canvas2D /> : <Canvas3D />}
        </div>
        <PropertiesPanel />
      </div>

      <BOMPanel />

      {showTitleBlockModal && <TitleBlockModal />}
      {showAIModal && <AIModal />}
      {contextMenu && <ContextMenu />}

      <Toaster
        position="bottom-right"
        toastOptions={{style:{background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)',color:'#f1f5f9'}}}
      />
    </div>
  )
}
