import React from 'react'
import { Save, FolderOpen, Undo2, Redo2, MousePointer2, Hand, ZoomIn, ZoomOut, Maximize2, FileText, Download, Sparkles, Camera, DollarSign, PenLine } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { exportPDF } from '../lib/pdfExport'
import { toast } from 'sonner'
import type { RefObject } from 'react'
import type Konva from 'konva'

interface ToolbarProps {
  stageRef?: RefObject<Konva.Stage>
}

export default function Toolbar({ stageRef }: ToolbarProps) {
  const { project, setProjectName, setPanZoom, updateTitleBlock } = useProjectStore()
  const {
    mode, setMode, activeView, setActiveView,
    setShowTitleBlockModal, setShowAIModal, setShowPhotoModal, setShowCostCalculator,
    clearSketch
  } = useUIStore()
  const { canUndo, canRedo, undo, redo } = useHistoryStore()

  const zoom = project.zoom

  function handleSave() {
    const data = JSON.stringify(project, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(project.name || 'fabdraw').replace(/\s+/g, '_')}.fabdraw.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Project saved')
  }

  function handleLoad() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.fabdraw.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          if (data.name) setProjectName(data.name)
          if (data.pieces) useProjectStore.setState(s => ({ project: { ...s.project, pieces: data.pieces } }))
          if (data.connections) useProjectStore.setState(s => ({ project: { ...s.project, connections: data.connections } }))
          if (data.titleBlock) updateTitleBlock(data.titleBlock)
          if (data.panX !== undefined && data.panY !== undefined && data.zoom !== undefined) {
            setPanZoom(data.panX, data.panY, data.zoom)
          }
          toast.success('Project loaded')
        } catch {
          toast.error('Failed to load project')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  function handleUndo() {
    const snap = undo()
    if (snap) {
      useProjectStore.setState(s => ({ project: { ...s.project, pieces: snap.pieces, connections: snap.connections } }))
    }
  }

  function handleRedo() {
    const snap = redo()
    if (snap) {
      useProjectStore.setState(s => ({ project: { ...s.project, pieces: snap.pieces, connections: snap.connections } }))
    }
  }

  const btnStyle = (active = false): React.CSSProperties => ({
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
    color: active ? '#f97316' : '#94a3b8',
    transition: 'all 150ms',
  })

  const sep = () => (
    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px', flexShrink: 0 }} />
  )

  return (
    <div style={{ height: 52, background: '#0f1117', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 2, flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="16" height="2" fill="#f97316" />
          <rect x="2" y="2" width="2" height="16" fill="#f97316" />
          <rect x="2" y="16" width="10" height="2" fill="#f97316" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.5px', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>FABDRAW</span>
      </div>
      {sep()}

      {/* Project name */}
      <input
        value={project.name}
        onChange={e => setProjectName(e.target.value)}
        style={{ background: 'transparent', border: 'none', outline: 'none', color: '#94a3b8', fontSize: 13, width: 180, borderBottom: '1px solid transparent', transition: 'border-color 150ms' }}
        onFocus={e => (e.target.style.borderBottomColor = '#f97316')}
        onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
      />
      {sep()}

      {/* Save / Load */}
      <button style={btnStyle()} title="Save Project (.fabdraw.json)" onClick={handleSave}>
        <Save size={14} />
      </button>
      <button style={btnStyle()} title="Load Project" onClick={handleLoad}>
        <FolderOpen size={14} />
      </button>
      {sep()}

      {/* History */}
      <button
        style={{ ...btnStyle(), opacity: canUndo() ? 1 : 0.4, cursor: canUndo() ? 'pointer' : 'not-allowed' }}
        title="Undo (Ctrl+Z)"
        onClick={handleUndo}
        disabled={!canUndo()}
      >
        <Undo2 size={14} />
      </button>
      <button
        style={{ ...btnStyle(), opacity: canRedo() ? 1 : 0.4, cursor: canRedo() ? 'pointer' : 'not-allowed' }}
        title="Redo (Ctrl+Y)"
        onClick={handleRedo}
        disabled={!canRedo()}
      >
        <Redo2 size={14} />
      </button>
      {sep()}

      {/* Mode */}
      <button style={btnStyle(mode === 'select')} title="Select (V)" onClick={() => setMode('select')}>
        <MousePointer2 size={14} />
      </button>
      <button style={btnStyle(mode === 'pan')} title="Pan (H)" onClick={() => setMode('pan')}>
        <Hand size={14} />
      </button>
      <button style={btnStyle(mode === 'sketch')} title="Sketch (S)" onClick={() => {
        if (mode === 'sketch') { clearSketch(); setMode('select') }
        else setMode('sketch')
      }}>
        <PenLine size={14} />
      </button>
      {sep()}

      {/* Zoom */}
      <button style={btnStyle()} title="Zoom Out" onClick={() => { const nz = Math.max(0.15, zoom * 0.9); setPanZoom(project.panX, project.panY, nz) }}>
        <ZoomOut size={14} />
      </button>
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#94a3b8', width: 44, textAlign: 'center', flexShrink: 0 }}>
        {Math.round(zoom * 100)}%
      </span>
      <button style={btnStyle()} title="Zoom In" onClick={() => { const nz = Math.min(8, zoom * 1.1); setPanZoom(project.panX, project.panY, nz) }}>
        <ZoomIn size={14} />
      </button>
      <button style={btnStyle()} title="Fit to Screen (F)" onClick={() => setPanZoom(400, 300, 1)}>
        <Maximize2 size={14} />
      </button>
      {sep()}

      {/* View toggle - pill style */}
      <div style={{ display: 'flex', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button
          onClick={() => setActiveView('2d')}
          title="2D View"
          style={{
            padding: '0 12px', height: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: activeView === '2d' ? '#f97316' : 'transparent',
            color: activeView === '2d' ? '#ffffff' : '#475569',
          }}
        >2D</button>
        <button
          onClick={() => setActiveView('3d')}
          title="3D View"
          style={{
            padding: '0 12px', height: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: activeView === '3d' ? '#f97316' : 'transparent',
            color: activeView === '3d' ? '#ffffff' : '#475569',
          }}
        >3D</button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right side */}
      <button style={btnStyle()} title="Cost Calculator" onClick={() => setShowCostCalculator(true)}>
        <DollarSign size={14} />
      </button>

      <button
        onClick={() => setShowTitleBlockModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 30, borderRadius: 5, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12, cursor: 'pointer', marginLeft: 4, flexShrink: 0 }}
      >
        <FileText size={12} />
        Title Block
      </button>

      <button
        onClick={async () => {
          try {
            await exportPDF(project, stageRef ?? { current: null })
            toast.success('PDF exported')
          } catch (e) {
            toast.error('PDF export failed')
            console.error(e)
          }
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 34, borderRadius: 6, background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 4, flexShrink: 0, boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}
      >
        <Download size={12} />
        Export PDF
      </button>

      <button
        onClick={() => setShowAIModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 30, borderRadius: 5, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 4, flexShrink: 0 }}
      >
        <Sparkles size={12} />
        AI
      </button>

      <button
        onClick={() => setShowPhotoModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 30, borderRadius: 5, background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.3)', color: '#14b8a6', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 4, flexShrink: 0 }}
      >
        <Camera size={12} />
        Photo
      </button>
    </div>
  )
}
