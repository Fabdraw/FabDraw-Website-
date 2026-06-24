import React, { useRef, useState } from 'react'
import {
  MousePointer2, Hand, Undo2, Redo2, Trash2, Copy, Clipboard,
  LayoutGrid, Sparkles, Camera, ZoomIn, ZoomOut, Maximize2,
  Save, FolderOpen, FileText, Ruler, Link2, LayoutTemplate, HelpCircle,
  Menu, PanelRight,
} from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { Project } from '../types'

export default function Toolbar({ onToggleSidebar, onToggleProps }: {
  onToggleSidebar?: () => void
  onToggleProps?: () => void
}) {
  const { project, setProjectName, deleteMembers, addMember, setProject } = useProjectStore()
  const { members, connections } = project
  const {
    mode, setMode, selectedIds, setSelectedIds,
    clipboard, setClipboard,
    activeView, setActiveView,
    setShowTitleBlockModal, setShowAIModal, setShowPhotoModal, setShowTemplateModal,
    setShowHelpModal, setShowPDFExportModal,
    zoom, setZoom, setPan,
  } = useUIStore()
  const { canUndo, canRedo, undo, redo, push } = useHistoryStore()
  const [editingName, setEditingName] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUndo = () => {
    const entry = undo()
    if (entry) setProject({ ...project, members: entry.members, connections: entry.connections, dimensions: entry.dimensions ?? project.dimensions, groupNames: entry.groupNames ?? project.groupNames })
  }
  const handleRedo = () => {
    const entry = redo()
    if (entry) setProject({ ...project, members: entry.members, connections: entry.connections, dimensions: entry.dimensions ?? project.dimensions, groupNames: entry.groupNames ?? project.groupNames })
  }
  const handleDelete = () => {
    if (selectedIds.length === 0) return
    push({ members, connections })
    deleteMembers(selectedIds)
    setSelectedIds([])
  }
  const handleCopy = () => setClipboard(members.filter(m => selectedIds.includes(m.id)))
  const handlePaste = () => {
    if (clipboard.length === 0) return
    push({ members, connections })
    const newMembers = clipboard.map(m => ({
      ...m, id: crypto.randomUUID(),
      position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 },
    }))
    newMembers.forEach(m => addMember(m))
    setSelectedIds(newMembers.map(m => m.id))
  }
  const handleFitView = () => {
    if (members.length === 0) { setZoom(1); setPan(200, 200); return }
    const canvas = document.querySelector('canvas')
    const W = canvas?.offsetWidth ?? 800, H = canvas?.offsetHeight ?? 600
    const S = 8
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
    for (const m of members) {
      mnX = Math.min(mnX, m.position.x - m.length / 2)
      mnY = Math.min(mnY, m.position.y - 2)
      mxX = Math.max(mxX, m.position.x + m.length / 2)
      mxY = Math.max(mxY, m.position.y + 2)
    }
    const nz = Math.max(0.05, Math.min(8, Math.min(W / ((mxX - mnX + 10) * S), H / ((mxY - mnY + 10) * S))))
    setPan(W / 2 - ((mnX + mxX) / 2) * nz * S, H / 2 - ((mnY + mxY) / 2) * nz * S)
    setZoom(nz)
  }

  const handleSave = () => {
    const data = JSON.stringify(project, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}.fabdraw.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoad = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Project
        if (!data.members || !Array.isArray(data.members)) throw new Error('Invalid .fabdraw file')
        if (members.length > 0 && !window.confirm('Replace current project with loaded file?')) return
        push({ members, connections })
        setProject(data)
      } catch (err) {
        alert(`Failed to load: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Button variants — min 44×44px on mobile for touch, compact on desktop
  const base = 'flex items-center justify-center min-w-[44px] min-h-[44px] lg:w-7 lg:h-7 lg:min-w-0 lg:min-h-0 rounded transition-colors focus:outline-none'
  const btn = `${base} text-slate-400 hover:bg-white/5 hover:text-slate-200`
  const btnActive = `${base} bg-orange-500/15 text-orange-400`
  const btnDisabled = `${base} text-slate-700 cursor-not-allowed`
  const div = <div className="w-px h-4 mx-0.5 lg:mx-1.5 bg-[#2e3350] shrink-0" />

  return (
    <div
      className="flex items-center gap-0.5 px-2 lg:px-3 select-none shrink-0"
      style={{ height: '48px', background: '#0f1117', borderBottom: '1px solid #2e3350' }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="lg:hidden flex items-center justify-center w-11 h-11 rounded text-slate-400 hover:bg-white/5 hover:text-slate-200 mr-1"
        onClick={onToggleSidebar}
        title="Library"
      >
        <Menu size={18} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 mr-2 lg:mr-3 shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="8" height="8" rx="1.5" fill="#f97316" />
          <rect x="10" width="8" height="8" rx="1.5" fill="#f97316" opacity=".5" />
          <rect y="10" width="8" height="8" rx="1.5" fill="#f97316" opacity=".5" />
          <rect x="10" y="10" width="8" height="8" rx="1.5" fill="#f97316" opacity=".25" />
        </svg>
        <span className="text-sm font-bold tracking-widest text-slate-100 hidden lg:inline">FABDRAW</span>
      </div>

      {/* Project name — hidden on mobile */}
      <input
        className="hidden lg:block bg-transparent text-slate-200 text-sm focus:outline-none w-36 px-1 rounded"
        style={{
          border: 'none',
          borderBottom: editingName ? '1px solid #f97316' : '1px solid transparent',
          transition: 'border-color 150ms',
        }}
        value={project.name}
        onChange={e => setProjectName(e.target.value)}
        onFocus={() => setEditingName(true)}
        onBlur={() => setEditingName(false)}
      />

      {div}

      {/* Undo / Redo */}
      <button className={canUndo ? btn : btnDisabled} onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={14} />
      </button>
      <button className={canRedo ? btn : btnDisabled} onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={14} />
      </button>

      {div}

      {/* Edit */}
      <button className={selectedIds.length > 0 ? btn : btnDisabled} onClick={handleCopy} disabled={!selectedIds.length} title="Copy (Ctrl+C)">
        <Copy size={14} />
      </button>
      <button className={clipboard.length > 0 ? btn : btnDisabled} onClick={handlePaste} disabled={!clipboard.length} title="Paste (Ctrl+V)">
        <Clipboard size={14} />
      </button>
      <button
        className={selectedIds.length > 0
          ? `${base} text-red-400 hover:bg-red-500/10`
          : btnDisabled}
        onClick={handleDelete}
        disabled={!selectedIds.length}
        title="Delete (Del)"
      >
        <Trash2 size={14} />
      </button>

      {div}

      {/* Mode */}
      <button className={mode === 'select' ? btnActive : btn} onClick={() => setMode('select')} title="Select (V)">
        <MousePointer2 size={14} />
      </button>
      <button className={mode === 'pan' ? btnActive : btn} onClick={() => setMode('pan')} title="Pan (H / Space)">
        <Hand size={14} />
      </button>
      <button className={mode === 'dimension' ? btnActive : btn} onClick={() => setMode('dimension')} title="Dimension (D)">
        <Ruler size={14} />
      </button>
      <button className={mode === 'connect' ? btnActive : btn} onClick={() => setMode('connect')} title="Connect (C)">
        <Link2 size={14} />
      </button>

      {div}

      {/* Zoom */}
      <button className={btn} onClick={() => setZoom(Math.max(0.05, zoom * 0.8))} title="Zoom Out (-)">
        <ZoomOut size={14} />
      </button>
      <span
        className="hidden lg:inline text-slate-500 text-xs tabular-nums w-10 text-center"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}
      >
        {(zoom * 100).toFixed(0)}%
      </span>
      <button className={btn} onClick={() => setZoom(Math.min(10, zoom * 1.25))} title="Zoom In (+)">
        <ZoomIn size={14} />
      </button>
      <button className={btn} onClick={handleFitView} title="Fit View (F)">
        <Maximize2 size={14} />
      </button>

      {div}

      {/* View */}
      <button
        className={activeView === '2d' ? btnActive : btn}
        onClick={() => setActiveView('2d')}
        style={{ fontSize: '11px', fontWeight: 700, width: '32px' }}
      >
        2D
      </button>
      <button
        className={activeView === '3d' ? btnActive : btn}
        onClick={() => setActiveView('3d')}
        style={{ fontSize: '11px', fontWeight: 700, width: '32px' }}
      >
        3D
      </button>

      {div}

      {/* Title block */}
      <button className={btn} onClick={() => setShowTitleBlockModal(true)} title="Title Block">
        <LayoutGrid size={14} />
      </button>

      {/* Templates */}
      <button className={btn} onClick={() => setShowTemplateModal(true)} title="Template Library">
        <LayoutTemplate size={14} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* File ops */}
      <button className={btn} onClick={handleSave} title="Save (.fabdraw.json)">
        <Save size={14} />
      </button>
      <button className={btn} onClick={handleLoad} title="Load (.fabdraw.json)">
        <FolderOpen size={14} />
      </button>
      <button className={btn} onClick={() => setShowPDFExportModal(true)} title="Export PDF">
        <FileText size={14} />
      </button>

      {div}

      {/* AI */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors hover:bg-orange-500/10 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 justify-center"
        style={{ border: '1px solid #f97316', color: '#f97316' }}
        onClick={() => setShowAIModal(true)}
      >
        <Sparkles size={12} />
        <span className="hidden lg:inline">AI</span>
      </button>

      {/* Photo */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ml-1 transition-colors hover:bg-teal-500/10 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 justify-center"
        style={{ border: '1px solid #14b8a6', color: '#14b8a6' }}
        onClick={() => setShowPhotoModal(true)}
      >
        <Camera size={12} />
        <span className="hidden lg:inline">Photo</span>
      </button>

      {/* Properties panel toggle — mobile only */}
      <button
        className="lg:hidden flex items-center justify-center w-11 h-11 rounded text-slate-400 hover:bg-white/5 hover:text-slate-200"
        onClick={onToggleProps}
        title="Properties"
      >
        <PanelRight size={16} />
      </button>

      {/* Help */}
      <button
        className={`${btn} ml-1`}
        onClick={() => setShowHelpModal(true)}
        title="Help (?)"
      >
        <HelpCircle size={14} />
      </button>

      <input ref={fileInputRef} type="file" accept=".json,.fabdraw.json" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
