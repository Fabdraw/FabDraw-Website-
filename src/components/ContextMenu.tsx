import React, { useEffect, useRef } from 'react'
import { Copy, Trash2, ArrowUpDown, RotateCw } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { toast } from 'sonner'

export default function ContextMenu() {
  const ref = useRef<HTMLDivElement>(null)
  const { pieces, connections, deletePieces, updatePiece } = useProjectStore()
  const { contextMenu, setContextMenu, selectedIds, setSelectedIds, clipboard, setClipboard } = useUIStore()
  const historyStore = useHistoryStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [setContextMenu])

  if (!contextMenu) return null

  const close = () => setContextMenu(null)

  const piece = contextMenu.id ? pieces.find(p=>p.id===contextMenu.id) : null

  const handleDelete = () => {
    const ids = contextMenu.id ? [contextMenu.id] : selectedIds
    if (ids.length) {
      historyStore.push({pieces, connections})
      deletePieces(ids)
      setSelectedIds([])
    }
    close()
  }
  const handleDuplicate = () => {
    if (!piece) return
    historyStore.push({pieces, connections})
    const newP = {...piece, id:crypto.randomUUID(), x:piece.x+4, y:piece.y+4}
    useProjectStore.getState().addPiece(newP)
    setSelectedIds([newP.id])
    toast.success('Duplicated')
    close()
  }
  const handleToggleUpright = () => {
    if (!piece) return
    updatePiece(piece.id, {upright:!piece.upright})
    close()
  }
  const handleFit = () => {
    useProjectStore.getState().setPanZoom(240, 120, 1)
    close()
  }
  const handleClear = () => {
    historyStore.push({pieces, connections})
    useProjectStore.getState().clearProject()
    setSelectedIds([])
    close()
  }

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(contextMenu.x, window.innerWidth - 180),
    top: Math.min(contextMenu.y, window.innerHeight - 200),
    zIndex: 1000,
    background: '#1f2937',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    minWidth: '170px',
    padding: '4px',
  }
  const itemStyle = (danger=false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    color: danger ? '#f87171' : '#d1d5db',
    cursor: 'pointer',
    transition: 'background 0.1s',
    width: '100%',
    border: 'none',
    background: 'transparent',
  })

  return (
    <div ref={ref} style={menuStyle} onContextMenu={e=>e.preventDefault()}>
      {contextMenu.type==='piece' && piece && (
        <>
          <button style={itemStyle()} onClick={handleDuplicate} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <Copy size={13}/> Duplicate
          </button>
          <button style={itemStyle()} onClick={handleToggleUpright} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <ArrowUpDown size={13}/> {piece.upright ? 'Set Horizontal' : 'Set Upright'}
          </button>
          <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'4px 0'}}/>
          <button style={itemStyle(true)} onClick={handleDelete} onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.1)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <Trash2 size={13}/> Delete
          </button>
        </>
      )}
      {contextMenu.type==='canvas' && (
        <>
          <button style={itemStyle()} onClick={handleFit} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <RotateCw size={13}/> Reset View
          </button>
          <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'4px 0'}}/>
          <button style={itemStyle(true)} onClick={handleClear} onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.1)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <Trash2 size={13}/> Clear Drawing
          </button>
        </>
      )}
    </div>
  )
}
