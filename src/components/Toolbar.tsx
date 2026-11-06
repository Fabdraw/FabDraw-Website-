import React, { useRef, useState } from 'react'
import {
  MousePointer2, Hand, Undo2, Redo2, Trash2, Copy, Clipboard,
  LayoutGrid, Sparkles, Camera, ZoomIn, ZoomOut, Maximize2,
  Save, FolderOpen, FileText, Ruler, Link2, LayoutTemplate, HelpCircle,
} from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { Project } from '../types'

export default function Toolbar() {
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

  // Button variants
  const base = 'flex items-center justify-center rounded transition-colors focus:outline-none'
  const sz = 'w-7 h-7'
  const btn = `${base} ${sz} text-[#8b96a8] hover:bg-white/[0.05] hover:text-[#e2e8f0]`
  const btnActive = `${base} ${sz} bg-[#4f80ff]/10 text-[#4f80ff]`
  const btnDisabled = `${base} ${sz} text-[#2e3a50] cursor-not-allowed`
  const sep = <div className="w-px h-5 mx-1.5 bg-[#252d3d] shrink-0" />

  return (
    <div
      className="flex items-center gap-0.5 px-3 select-none shrink-0"
      style={{ height: '48px', background: '#111318', borderBottom: '1px solid #252d3d' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4 shrink-0">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="8" height="8" rx="1.5" fill="#4f80ff" />
          <rect x="10" width="8" height="8" rx="1.5" fill="#4f80ff" opacity=".5" />
          <rect y="10" width="8" height="8" rx="1.5" fill="#4f80ff" opacity=".5" />
          <rect x="10" y="10" width="8" height="8" rx="1.5" fill="#4f80ff" opacity=".25" />
        </svg>
        <span className="text-[13px] font-semibold tracking-wide" style={{ color: '#e2e8f0' }}>FabDraw</span>
      </div>

      {/* Project name */}
      <input
        className="bg-transparent text-sm focus:outline-none w-36 px-1 rounded"
        style={{
          color: '#c0cad8',
          border: 'none',
          borderBottom: editingName ? '1px solid #4f80ff' : '1px solid transparent',
          transition: 'border-color 150ms',
        }}
        value={project.name}
        onChange={e => setProjectName(e.target.value)}
        onFocus={() => setEditingName(true)}
        onBlur={() => setEditingName(false)}
      />

      {sep}

      {/* Undo / Redo */}
      <button className={canUndo ? btn : btnDisabled} onClick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={14} />
      </button>
      <button className={canRedo ? btn : btnDisabled} onClick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={14} />
      </button>

      {sep}

      {/* Edit */}
      <button className={selectedIds.length > 0 ? btn : btnDisabled} onClick={handleCopy} disabled={!selectedIds.length} title="Copy (Ctrl+C)">
        <Copy size={14} />
      </button>
      <button className={clipboard.length > 0 ? btn : btnDisabled} onClick={handlePaste} disabled={!clipboard.length} title="Paste (Ctrl+V)">
        <Clipboard size={14} />
      </button>
      <button
        className={selectedIds.length > 0
          ? `${base} ${sz} text-[#f87171] hover:bg-red-500/10`
          : btnDisabled}
        onClick={handleDelete}
        disabled={!selectedIds.length}
        title="Delete (Del)"
      >
        <Trash2 size={14} />
      </button>

      {sep}

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

      {sep}

      {/* Zoom */}
      <button className={btn} onClick={() => setZoom(Math.max(0.05, zoom * 0.8))} title="Zoom Out (-)">
        <ZoomOut size={14} />
      </button>
      <span
        className="tabular-nums w-10 text-center"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#4c5768' }}
      >
        {(zoom * 100).toFixed(0)}%
      </span>
      <button className={btn} onClick={() => setZoom(Math.min(10, zoom * 1.25))} title="Zoom In (+)">
        <ZoomIn size={14} />
      </button>
      <button className={btn} onClick={handleFitView} title="Fit View (F)">
        <Maximize2 size={14} />
      </button>

      {sep}

      {/* View */}
      <button
        className={activeView === '2d' ? btnActive : btn}
        onClick={() => setActiveView('2d')}
        style={{ fontSize: '11px', fontWeight: 600 }}
      >
        2D
      </button>
      <button
        className={activeView === '3d' ? btnActive : btn}
        onClick={() => setActiveView('3d')}
        style={{ fontSize: '11px', fontWeight: 600 }}
      >
        3D
      </button>

      {sep}

      {/* Title block + Templates */}
      <button className={btn} onClick={() => setShowTitleBlockModal(true)} title="Title Block">
        <LayoutGrid size={14} />
      </button>
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

      {sep}

      {/* AI */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:bg-[#4f80ff]/10"
        style={{ border: '1px solid #4f80ff', color: '#4f80ff' }}
        onClick={() => setShowAIModal(true)}
      >
        <Sparkles size={12} />
        AI
      </button>

      {/* Photo */}
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ml-1.5 transition-colors hover:bg-teal-500/10"
        style={{ border: '1px solid #2dd4bf', color: '#2dd4bf' }}
        onClick={() => setShowPhotoModal(true)}
      >
        <Camera size={12} />
        Photo
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
