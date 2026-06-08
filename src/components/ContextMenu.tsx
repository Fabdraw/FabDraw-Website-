import React, { useEffect, useRef } from 'react'
import { Copy, Trash2, RotateCw, ArrowUp, ArrowDown, Maximize2, Minimize2 } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { toast } from 'sonner'

export default function ContextMenu() {
  const { project, deletePieces, updatePiece, addPiece } = useProjectStore()
  const { contextMenu, setContextMenu, selectedIds, setSelectedIds } = useUIStore()
  const { push } = useHistoryStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu, setContextMenu])

  if (!contextMenu) return null

  const piece = contextMenu.pieceId ? project.pieces.find(p => p.id === contextMenu.pieceId) : null

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      key={label}
      onClick={() => { action(); setContextMenu(null) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px',
        border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        color: danger ? '#ef4444' : '#94a3b8', fontSize: 12,
        transition: 'background 100ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      {label}
    </button>
  )

  const sep = () => <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed', left: contextMenu.x, top: contextMenu.y,
        background: '#1e2535', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, minWidth: 180, zIndex: 2000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: '4px 0',
      }}
    >
      {piece ? (
        <>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {piece.type.replace('_', ' ')}
          </div>
          {sep()}
          {item(<Copy size={13} />, 'Duplicate', () => {
            const id = addPiece({ ...piece, x: piece.x + 5, y: piece.y + 5, holes: [] })
            setSelectedIds([id])
            toast.success('Duplicated')
          })}
          {item(<RotateCw size={13} />, 'Rotate 90°', () => {
            updatePiece(piece.id, { angle: (piece.angle + 90) % 360 })
          })}
          {item(<ArrowUp size={13} />, 'Move Up', () => {
            updatePiece(piece.id, { y: piece.y - 1 })
          })}
          {item(<ArrowDown size={13} />, 'Move Down', () => {
            updatePiece(piece.id, { y: piece.y + 1 })
          })}
          {item(<Maximize2 size={13} />, 'Toggle Cross-Section', () => {
            updatePiece(piece.id, { upright: !piece.upright })
          })}
          {sep()}
          {item(<Trash2 size={13} />, 'Delete', () => {
            const idsToDelete = selectedIds.includes(piece.id) ? selectedIds : [piece.id]
            deletePieces(idsToDelete)
            setSelectedIds([])
            push({ pieces: project.pieces.filter(p => !idsToDelete.includes(p.id)), connections: project.connections })
            toast.success(`Deleted ${idsToDelete.length} piece(s)`)
          }, true)}
        </>
      ) : (
        <>
          <div style={{ padding: '6px 12px 4px', fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Canvas
          </div>
          {sep()}
          {item(<Minimize2 size={13} />, 'Reset View', () => {
            useProjectStore.getState().setPanZoom(400, 300, 1)
          })}
          {item(<Trash2 size={13} />, 'Clear All', () => {
            if (confirm('Delete all pieces?')) {
              deletePieces(project.pieces.map(p => p.id))
              toast.success('Cleared drawing')
            }
          }, true)}
        </>
      )}
    </div>
  )
}
