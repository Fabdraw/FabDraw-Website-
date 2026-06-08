import React from 'react'
import { Trash2, Copy, RotateCcw, Plus, X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { getMaterial, getSizeLabel, getWallLabel, MATERIALS } from '../lib/materials'
import { calcWeight } from '../lib/weights'
import { getSizeValue, getWall } from '../lib/materials'
import type { MaterialType, MaterialGrade, JointType, Piece } from '../types'
import { v4 as uuid } from 'uuid'
import { toast } from 'sonner'

const GRADES: { value: MaterialGrade; label: string }[] = [
  { value: 'mild_steel', label: 'Mild Steel' },
  { value: 'stainless', label: 'Stainless' },
  { value: 'aluminum', label: 'Aluminum' },
]

const JOINT_TYPES: { value: JointType; label: string }[] = [
  { value: 'butt_weld', label: 'Butt Weld' },
  { value: 'miter_weld', label: 'Miter Weld' },
  { value: 'fillet_weld', label: 'Fillet Weld' },
  { value: 'cope_cut', label: 'Cope Cut' },
  { value: 'bolted', label: 'Bolted' },
  { value: 'flanged', label: 'Flanged' },
]

export default function PropertiesPanel() {
  const { project, updatePiece, deletePieces, addPiece, updateConnectionType } = useProjectStore()
  const { selectedIds, setSelectedIds, activeRightTab, setActiveRightTab, selectedConnectionId } = useUIStore()
  const { push } = useHistoryStore()

  const selectedPiece = selectedIds.length === 1 ? project.pieces.find(p => p.id === selectedIds[0]) : null
  const selectedConn = selectedConnectionId ? project.connections.find(c => c.id === selectedConnectionId) : null

  const labelStyle: React.CSSProperties = { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, display: 'block' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#f1f5f9', padding: '5px 8px', fontSize: 12, outline: 'none' }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  function upd(field: keyof Piece, value: unknown) {
    if (!selectedPiece) return
    updatePiece(selectedPiece.id, { [field]: value } as Partial<Piece>)
  }

  function handleDelete() {
    if (!selectedIds.length) return
    deletePieces(selectedIds)
    setSelectedIds([])
    push({ pieces: project.pieces.filter(p => !selectedIds.includes(p.id)), connections: project.connections })
    toast.success(`Deleted ${selectedIds.length} piece(s)`)
  }

  function handleDuplicate() {
    if (!selectedPiece) return
    const id = addPiece({ ...selectedPiece, x: selectedPiece.x + 5, y: selectedPiece.y + 5, holes: [] })
    setSelectedIds([id])
    toast.success('Duplicated')
  }

  function addHole() {
    if (!selectedPiece) return
    const newHole = { id: uuid(), type: 'circle' as const, posInches: selectedPiece.length / 2, diameter: 0.5, height: undefined }
    updatePiece(selectedPiece.id, { holes: [...selectedPiece.holes, newHole] })
  }

  function removeHole(holeId: string) {
    if (!selectedPiece) return
    updatePiece(selectedPiece.id, { holes: selectedPiece.holes.filter(h => h.id !== holeId) })
  }

  if (selectedIds.length === 0 && !selectedConnectionId) {
    return (
      <div style={{ width: 240, background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', color: '#334155', padding: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#9881;</div>
          <div style={{ fontSize: 12 }}>Select a piece to edit properties</div>
        </div>
      </div>
    )
  }

  if (selectedIds.length > 1) {
    return (
      <div style={{ width: 240, background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 14, flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{selectedIds.length} pieces selected</div>
        <button onClick={handleDelete} style={{ width: '100%', padding: '7px 0', borderRadius: 5, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Trash2 size={13} /> Delete Selected
        </button>
      </div>
    )
  }

  if (selectedConn && !selectedPiece) {
    return (
      <div style={{ width: 240, background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 14, flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connection</div>
        <label style={labelStyle}>Joint Type</label>
        <select
          value={selectedConn.type}
          onChange={e => updateConnectionType(selectedConn.id, e.target.value as JointType)}
          style={selectStyle}
        >
          {JOINT_TYPES.map(jt => <option key={jt.value} value={jt.value}>{jt.label}</option>)}
        </select>
      </div>
    )
  }

  if (!selectedPiece) return null

  const mat = getMaterial(selectedPiece.type)
  const sv = getSizeValue(selectedPiece.type, selectedPiece.sizeIdx)
  const wall = getWall(selectedPiece.type, selectedPiece.thkIdx)
  const weight = calcWeight(selectedPiece, sv, wall)

  const tabs = ['Props', 'Holes', 'Notes']

  return (
    <div style={{ width: 240, background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveRightTab(tab.toLowerCase() as any)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: 'transparent',
              color: activeRightTab === tab.toLowerCase() ? '#f97316' : '#64748b',
              borderBottom: activeRightTab === tab.toLowerCase() ? '2px solid #f97316' : '2px solid transparent',
              transition: 'all 150ms',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Actions bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button onClick={handleDuplicate} style={{ flex: 1, padding: '5px 0', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Copy size={11} /> Dup
        </button>
        <button onClick={handleDelete} style={{ flex: 1, padding: '5px 0', borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Trash2 size={11} /> Del
        </button>
      </div>

      {/* Weight display */}
      <div style={{ padding: '6px 14px', background: 'rgba(249,115,22,0.05)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Est. Weight: </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f97316', fontFamily: 'JetBrains Mono, monospace' }}>{weight.toFixed(2)} lbs</span>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {activeRightTab === 'props' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Type */}
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={selectedPiece.type}
                onChange={e => upd('type', e.target.value as MaterialType)}
                style={selectStyle}
              >
                {MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            {/* Grade */}
            <div>
              <label style={labelStyle}>Grade</label>
              <select value={selectedPiece.material} onChange={e => upd('material', e.target.value as MaterialGrade)} style={selectStyle}>
                {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>

            {/* Size */}
            {!mat.isCustomSize && (
              <div>
                <label style={labelStyle}>Size</label>
                <select value={selectedPiece.sizeIdx} onChange={e => upd('sizeIdx', Number(e.target.value))} style={selectStyle}>
                  {mat.sizes.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
                </select>
              </div>
            )}

            {/* Custom size */}
            {mat.isCustomSize && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <label style={labelStyle}>Width</label>
                  <input type="number" value={selectedPiece.customW} onChange={e => upd('customW', Number(e.target.value))} style={inputStyle} min={1} />
                </div>
                <div>
                  <label style={labelStyle}>Height</label>
                  <input type="number" value={selectedPiece.customH} onChange={e => upd('customH', Number(e.target.value))} style={inputStyle} min={1} />
                </div>
              </div>
            )}

            {/* Wall / Thickness */}
            <div>
              <label style={labelStyle}>Wall / Thickness</label>
              <select value={selectedPiece.thkIdx} onChange={e => upd('thkIdx', Number(e.target.value))} style={selectStyle}>
                {mat.thicknesses.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
              </select>
            </div>

            {/* Length */}
            {!mat.isCustomSize && (
              <div>
                <label style={labelStyle}>Length (in)</label>
                <input type="number" value={selectedPiece.length} onChange={e => upd('length', Math.max(0.5, Number(e.target.value)))} style={inputStyle} min={0.5} step={0.5} />
              </div>
            )}

            {/* Position */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div>
                <label style={labelStyle}>X (in)</label>
                <input type="number" value={Math.round(selectedPiece.x * 10) / 10} onChange={e => upd('x', Number(e.target.value))} style={inputStyle} step={0.5} />
              </div>
              <div>
                <label style={labelStyle}>Y (in)</label>
                <input type="number" value={Math.round(selectedPiece.y * 10) / 10} onChange={e => upd('y', Number(e.target.value))} style={inputStyle} step={0.5} />
              </div>
            </div>

            {/* Angle */}
            <div>
              <label style={labelStyle}>Rotation (deg)</label>
              <input type="number" value={selectedPiece.angle} onChange={e => upd('angle', Number(e.target.value))} style={inputStyle} step={15} />
            </div>

            {/* Z Offset */}
            <div>
              <label style={labelStyle}>Z Offset (in)</label>
              <input type="number" value={selectedPiece.zOffset} onChange={e => upd('zOffset', Number(e.target.value))} style={inputStyle} step={0.25} />
            </div>

            {/* Upright */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => upd('upright', !selectedPiece.upright)}
                style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: selectedPiece.upright ? '#f97316' : 'rgba(255,255,255,0.1)', transition: 'background 200ms' }}
              >
                <span style={{ position: 'absolute', top: 2, left: selectedPiece.upright ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 200ms' }} />
              </button>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Cross-section</span>
            </div>

            {/* Weld symbol */}
            <div>
              <label style={labelStyle}>Weld Symbol</label>
              <input type="text" value={selectedPiece.weldSymbol} onChange={e => upd('weldSymbol', e.target.value)} style={inputStyle} placeholder="e.g. 1/4 fillet" />
            </div>
          </div>
        )}

        {activeRightTab === 'holes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{selectedPiece.holes.length} hole(s)</span>
              <button onClick={addHole} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: 11, cursor: 'pointer' }}>
                <Plus size={11} /> Add Hole
              </button>
            </div>
            {selectedPiece.holes.map((hole, idx) => (
              <div key={hole.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 10, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>Hole #{idx + 1}</span>
                  <button onClick={() => removeHole(hole.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
                    <X size={12} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select
                      value={hole.type}
                      onChange={e => {
                        const newHoles = selectedPiece.holes.map(h => h.id === hole.id ? { ...h, type: e.target.value as 'circle' | 'square' | 'rect' } : h)
                        updatePiece(selectedPiece.id, { holes: newHoles })
                      }}
                      style={selectStyle}
                    >
                      <option value="circle">Circle</option>
                      <option value="square">Square</option>
                      <option value="rect">Rect</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Dia (in)</label>
                    <input
                      type="number"
                      value={hole.diameter}
                      onChange={e => {
                        const newHoles = selectedPiece.holes.map(h => h.id === hole.id ? { ...h, diameter: Number(e.target.value) } : h)
                        updatePiece(selectedPiece.id, { holes: newHoles })
                      }}
                      style={inputStyle}
                      min={0.0625}
                      step={0.0625}
                    />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>Position (in from start)</label>
                    <input
                      type="number"
                      value={hole.posInches}
                      onChange={e => {
                        const newHoles = selectedPiece.holes.map(h => h.id === hole.id ? { ...h, posInches: Number(e.target.value) } : h)
                        updatePiece(selectedPiece.id, { holes: newHoles })
                      }}
                      style={inputStyle}
                      min={0}
                      step={0.25}
                    />
                  </div>
                </div>
              </div>
            ))}
            {selectedPiece.holes.length === 0 && (
              <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, padding: '20px 0' }}>No holes. Click "Add Hole" to get started.</div>
            )}
          </div>
        )}

        {activeRightTab === 'notes' && (
          <div>
            <label style={labelStyle}>Fabrication Notes</label>
            <textarea
              value={selectedPiece.note}
              onChange={e => upd('note', e.target.value)}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Add notes, tolerances, finish requirements..."
            />
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Weld Symbol</label>
              <input
                type="text"
                value={selectedPiece.weldSymbol}
                onChange={e => upd('weldSymbol', e.target.value)}
                style={inputStyle}
                placeholder="e.g. 1/4 fillet weld all around"
              />
            </div>
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Info</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                <div>Type: <span style={{ color: '#94a3b8' }}>{getMaterial(selectedPiece.type).label}</span></div>
                <div>Grade: <span style={{ color: '#94a3b8' }}>{selectedPiece.material.replace('_', ' ')}</span></div>
                <div>Holes: <span style={{ color: '#94a3b8' }}>{selectedPiece.holes.length}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
