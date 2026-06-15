import React, { useRef, useState } from 'react'
import { MousePointer2, Hand, Undo2, Redo2, Trash2, Copy, Clipboard, LayoutGrid, Sparkles, Camera, ZoomIn, ZoomOut, Maximize2, Save, FolderOpen, FileText } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { exportPDF } from '../lib/pdfExport'
import type { Project } from '../types'

export default function Toolbar() {
  const { project, setProjectName, deleteMembers, addMember, setProject } = useProjectStore()
  const { members, connections } = project
  const {
    mode, setMode, selectedIds, setSelectedIds,
    clipboard, setClipboard,
    activeView, setActiveView,
    setShowTitleBlockModal, setShowAIModal, setShowPhotoModal,
    zoom, setZoom, setPan,
  } = useUIStore()
  const { canUndo, canRedo, undo, redo, push } = useHistoryStore()
  const [editingName, setEditingName] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUndo = () => {
    const entry = undo()
    if (entry) setProject({ ...project, members: entry.members, connections: entry.connections })
  }
  const handleRedo = () => {
    const entry = redo()
    if (entry) setProject({ ...project, members: entry.members, connections: entry.connections })
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
    const newMembers = clipboard.map(m => ({ ...m, id: crypto.randomUUID(), position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 } }))
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
        alert(`Failed to load file: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportPDF = () => {
    const url = exportPDF(members, project.titleBlock, project.name)
    window.open(url, '_blank')
  }

  const btn = 'flex items-center justify-center w-[30px] h-[30px] rounded-md transition-colors focus:outline-none text-[#475569] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#94a3b8]'
  const btnA = 'flex items-center justify-center w-[30px] h-[30px] rounded-md focus:outline-none bg-[rgba(249,115,22,0.15)] text-[#f97316]'
  const btnD = 'flex items-center justify-center w-[30px] h-[30px] rounded-md text-[#2d3748] cursor-not-allowed'
  const Div = () => <div className="w-px h-5 mx-2" style={{ background: 'rgba(255,255,255,0.08)' }} />

  return (
    <div className="flex items-center gap-1 px-3 select-none shrink-0"
      style={{ height: '48px', background: '#0f1117', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mr-2">
        <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: '#f97316' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#f1f5f9' }}>FABDRAW</span>
      </div>
      <input
        className="focus:outline-none bg-transparent text-[#f1f5f9] text-[13px] w-32"
        style={{ border: 'none', borderBottom: editingName ? '1px solid #f97316' : '1px solid transparent' }}
        value={project.name}
        onChange={e => setProjectName(e.target.value)}
        onFocus={() => setEditingName(true)}
        onBlur={() => setEditingName(false)}
      />
      <Div />
      <button className={canUndo ? btn : btnD} onClick={handleUndo} disabled={!canUndo} title="Undo"><Undo2 size={15} /></button>
      <button className={canRedo ? btn : btnD} onClick={handleRedo} disabled={!canRedo} title="Redo"><Redo2 size={15} /></button>
      <Div />
      <button className={selectedIds.length > 0 ? btn : btnD} onClick={handleCopy} disabled={!selectedIds.length} title="Copy"><Copy size={15} /></button>
      <button className={clipboard.length > 0 ? btn : btnD} onClick={handlePaste} disabled={!clipboard.length} title="Paste"><Clipboard size={15} /></button>
      <button className={selectedIds.length > 0 ? 'flex items-center justify-center w-[30px] h-[30px] rounded-md text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)]' : btnD}
        onClick={handleDelete} disabled={!selectedIds.length} title="Delete"><Trash2 size={15} /></button>
      <Div />
      <button className={mode === 'select' ? btnA : btn} onClick={() => setMode('select')} title="Select"><MousePointer2 size={15} /></button>
      <button className={mode === 'pan' ? btnA : btn} onClick={() => setMode('pan')} title="Pan"><Hand size={15} /></button>
      <Div />
      <button className={btn} onClick={() => setZoom(Math.max(0.05, zoom * 0.8))} title="Zoom Out"><ZoomOut size={15} /></button>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94a3b8', width: '42px', textAlign: 'center' }}>
        {(zoom * 100).toFixed(0)}%
      </span>
      <button className={btn} onClick={() => setZoom(Math.min(10, zoom * 1.25))} title="Zoom In"><ZoomIn size={15} /></button>
      <button className={btn} onClick={handleFitView} title="Fit View"><Maximize2 size={15} /></button>
      <Div />
      <button className={activeView === '2d' ? btnA : btn} onClick={() => setActiveView('2d')} style={{ fontSize: '11px', fontWeight: 700 }}>2D</button>
      <button className={activeView === '3d' ? btnA : btn} onClick={() => setActiveView('3d')} style={{ fontSize: '11px', fontWeight: 700 }}>3D</button>
      <Div />
      <button className={btn} onClick={() => setShowTitleBlockModal(true)} title="Title Block"><LayoutGrid size={15} /></button>
      <div className="flex-1" />
      <button className={btn} onClick={handleSave} title="Save (.fabdraw.json)"><Save size={15} /></button>
      <button className={btn} onClick={handleLoad} title="Load (.fabdraw.json)"><FolderOpen size={15} /></button>
      <button className={btn} onClick={handleExportPDF} title="Export PDF"><FileText size={15} /></button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ml-1"
        style={{ border: '1px solid #f97316', color: '#f97316', background: 'transparent' }}
        onClick={() => setShowAIModal(true)}>
        <Sparkles size={13} /> AI
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ml-1"
        style={{ border: '1px solid #14b8a6', color: '#14b8a6', background: 'transparent' }}
        onClick={() => setShowPhotoModal(true)}>
        <Camera size={13} /> Photo
      </button>
      <input ref={fileInputRef} type="file" accept=".json,.fabdraw.json" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
