import React, { useState } from 'react'
import { Command } from 'cmdk'
import { Plus, Trash2, RotateCw, Save, Download, Sparkles, Camera, DollarSign, FileText, X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { MATERIALS, getMaterial } from '../lib/materials'
import { toast } from 'sonner'
import type { MaterialType } from '../types'

export default function CommandPalette() {
  const { project, addPiece, deletePieces, setPanZoom } = useProjectStore()
  const {
    setShowCommandPalette, setSelectedIds, selectedIds,
    setShowAIModal, setShowPhotoModal, setShowTitleBlockModal, setShowCostCalculator
  } = useUIStore()

  function addMaterial(type: MaterialType) {
    const mat = getMaterial(type)
    const id = addPiece({
      type,
      sizeIdx: mat.defaultSizeIdx,
      thkIdx: mat.defaultThkIdx,
      material: 'mild_steel',
      length: 24,
      x: Math.random() * 20 - 10,
      y: Math.random() * 20 - 10,
      angle: 0,
      upright: false,
      zOffset: 0,
      customW: mat.defaultCustomW ?? 24,
      customH: mat.defaultCustomH ?? 24,
      holes: [],
      bendLines: [],
      note: '',
      weldSymbol: '',
    })
    setSelectedIds([id])
    setShowCommandPalette(false)
    toast.success(`Added ${mat.label}`)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, paddingTop: '12vh' }}>
      <div style={{ width: 540, background: '#111827', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.7)' }}>
        <Command style={{ background: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 10 }}>
            <Command.Input
              placeholder="Type a command or search..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: 15, fontFamily: 'inherit',
              }}
              autoFocus
            />
            <button onClick={() => setShowCommandPalette(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          <Command.List style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0' }}>
            <Command.Empty style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
              No results found.
            </Command.Empty>

            <Command.Group heading="Add Material" style={{ padding: '4px 0' }}>
              {MATERIALS.map(mat => (
                <Command.Item
                  key={mat.id}
                  value={`add ${mat.label} ${mat.id}`}
                  onSelect={() => addMaterial(mat.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: mat.isRound ? '50%' : 2, background: mat.color, flexShrink: 0 }} />
                  <span>Add {mat.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#334155' }}>{mat.id.replace('_', ' ')}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

            <Command.Group heading="Actions">
              {selectedIds.length > 0 && (
                <Command.Item
                  value="delete selected pieces"
                  onSelect={() => {
                    deletePieces(selectedIds)
                    setSelectedIds([])
                    setShowCommandPalette(false)
                    toast.success(`Deleted ${selectedIds.length} piece(s)`)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedIds.length})
                </Command.Item>
              )}
              <Command.Item
                value="reset view fit screen"
                onSelect={() => { setPanZoom(400, 300, 1); setShowCommandPalette(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}
              >
                <RotateCw size={14} />
                Reset View
              </Command.Item>
              <Command.Item
                value="clear all pieces delete all"
                onSelect={() => {
                  if (confirm('Delete all pieces?')) {
                    deletePieces(project.pieces.map(p => p.id))
                    setShowCommandPalette(false)
                    toast.success('Cleared drawing')
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}
              >
                <Trash2 size={14} />
                Clear All Pieces
              </Command.Item>
            </Command.Group>

            <Command.Separator style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

            <Command.Group heading="Tools">
              <Command.Item value="ai generate" onSelect={() => { setShowAIModal(true); setShowCommandPalette(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#8b5cf6' }}>
                <Sparkles size={14} />
                AI Generate Pieces
              </Command.Item>
              <Command.Item value="photo analyze" onSelect={() => { setShowPhotoModal(true); setShowCommandPalette(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#14b8a6' }}>
                <Camera size={14} />
                Analyze Photo
              </Command.Item>
              <Command.Item value="title block drawing info" onSelect={() => { setShowTitleBlockModal(true); setShowCommandPalette(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                <FileText size={14} />
                Edit Title Block
              </Command.Item>
              <Command.Item value="cost calculator estimate" onSelect={() => { setShowCostCalculator(true); setShowCommandPalette(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#22c55e' }}>
                <DollarSign size={14} />
                Cost Calculator
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
