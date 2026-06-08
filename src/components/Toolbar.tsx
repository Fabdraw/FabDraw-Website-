import React from 'react'
import { Undo2, Redo2, Copy, Clipboard, Trash2, MousePointer2, Hand, ZoomIn, ZoomOut, FileText, Download, Sparkles } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { toast } from 'sonner'

export default function Toolbar() {
  const { name, setName, pieces, connections, zoom, panX, panY, setPanZoom, setPieces, setConnections } = useProjectStore()
  const { mode, setMode, selectedIds, setSelectedIds, setShowTitleBlockModal, setShowAIModal, clipboard, setClipboard } = useUIStore()
  const historyStore = useHistoryStore()

  const handleUndo = () => {
    const snap = historyStore.undo()
    if (snap) { setPieces(snap.pieces); setConnections(snap.connections) }
  }
  const handleRedo = () => {
    const snap = historyStore.redo()
    if (snap) { setPieces(snap.pieces); setConnections(snap.connections) }
  }
  const handleCopy = () => {
    const sel = pieces.filter(p => selectedIds.includes(p.id))
    setClipboard(sel)
    if (sel.length) toast.success(`Copied ${sel.length} piece${sel.length>1?'s':''}`)
  }
  const handlePaste = () => {
    if (clipboard.length) {
      historyStore.push({pieces, connections})
      const newPieces = clipboard.map(p => ({...p, id: crypto.randomUUID(), x: p.x+4, y: p.y+4}))
      newPieces.forEach(p => useProjectStore.getState().addPiece(p))
      setSelectedIds(newPieces.map(p => p.id))
      toast.success(`Pasted ${newPieces.length} piece${newPieces.length>1?'s':''}`)
    }
  }
  const handleDelete = () => {
    if (selectedIds.length) {
      historyStore.push({pieces, connections})
      useProjectStore.getState().deletePieces(selectedIds)
      setSelectedIds([])
    }
  }
  const handleZoomIn = () => {
    const newZ = Math.min(8, zoom * 1.25)
    setPanZoom(panX, panY, newZ)
  }
  const handleZoomOut = () => {
    const newZ = Math.max(0.1, zoom * 0.8)
    setPanZoom(panX, panY, newZ)
  }
  const handleFit = () => {
    setPanZoom(240, 120, 1)
  }

  const btnBase = 'flex items-center justify-center rounded transition-all duration-150 cursor-pointer select-none'
  const iconBtn = `${btnBase} w-8 h-8 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30`
  const modeBtn = (active: boolean) => `${btnBase} w-8 h-8 ${active ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'hover:bg-white/10 text-slate-400 hover:text-white'}`

  return (
    <div className="flex items-center gap-1 px-3" style={{height:'48px',background:'#111827',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-7 h-7 rounded flex items-center justify-center text-sm font-bold" style={{background:'linear-gradient(135deg,#f97316,#ea580c)',color:'white'}}>F</div>
        <span className="font-semibold text-sm text-white hidden sm:block">FabDraw</span>
      </div>

      <div style={{width:'1px',height:'28px',background:'rgba(255,255,255,0.08)',margin:'0 4px'}} />

      {/* Project name */}
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="bg-transparent text-sm text-slate-300 font-medium outline-none border border-transparent hover:border-white/10 focus:border-orange-500/40 rounded px-2 py-1 transition-all"
        style={{minWidth:'120px',maxWidth:'200px'}}
      />

      <div style={{width:'1px',height:'28px',background:'rgba(255,255,255,0.08)',margin:'0 4px'}} />

      {/* Undo/Redo */}
      <button className={iconBtn} onClick={handleUndo} disabled={!historyStore.canUndo} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
      <button className={iconBtn} onClick={handleRedo} disabled={!historyStore.canRedo} title="Redo (Ctrl+Y)"><Redo2 size={15} /></button>

      <div style={{width:'1px',height:'28px',background:'rgba(255,255,255,0.08)',margin:'0 4px'}} />

      {/* Copy/Paste/Delete */}
      <button className={iconBtn} onClick={handleCopy} disabled={!selectedIds.length} title="Copy (Ctrl+C)"><Copy size={15} /></button>
      <button className={iconBtn} onClick={handlePaste} disabled={!clipboard.length} title="Paste (Ctrl+V)"><Clipboard size={15} /></button>
      <button className={iconBtn} onClick={handleDelete} disabled={!selectedIds.length} title="Delete (Del)"><Trash2 size={15} /></button>

      <div style={{width:'1px',height:'28px',background:'rgba(255,255,255,0.08)',margin:'0 4px'}} />

      {/* Mode */}
      <button className={modeBtn(mode==='select')} onClick={()=>setMode('select')} title="Select (V)"><MousePointer2 size={15} /></button>
      <button className={modeBtn(mode==='pan')} onClick={()=>setMode('pan')} title="Pan (H)"><Hand size={15} /></button>

      <div style={{width:'1px',height:'28px',background:'rgba(255,255,255,0.08)',margin:'0 4px'}} />

      {/* Zoom */}
      <button className={iconBtn} onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={15} /></button>
      <button
        className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 cursor-pointer transition-all"
        onClick={handleFit}
        title="Reset zoom"
        style={{minWidth:'46px',textAlign:'center'}}
      >
        {Math.round(zoom*100)}%
      </button>
      <button className={iconBtn} onClick={handleZoomIn} title="Zoom In"><ZoomIn size={15} /></button>

      <div className="flex-1" />

      {/* AI */}
      <button
        className={`${btnBase} px-3 h-8 gap-2 text-sm font-medium rounded`}
        style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'white'}}
        onClick={()=>setShowAIModal(true)}
        title="AI Generator"
      >
        <Sparkles size={14} />
        <span className="hidden sm:block">AI</span>
      </button>

      <button
        className={`${btnBase} ml-1 px-2 h-8 gap-1 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded`}
        onClick={()=>setShowTitleBlockModal(true)}
        title="Title Block"
      >
        <FileText size={14} />
      </button>

      <button
        className={`${btnBase} ml-1 px-3 h-8 gap-2 text-sm font-semibold rounded`}
        style={{background:'#f97316',color:'white'}}
        onClick={()=>toast.info('PDF export coming soon')}
        title="Export PDF"
      >
        <Download size={14} />
        <span className="hidden sm:block">Export</span>
      </button>
    </div>
  )
}
