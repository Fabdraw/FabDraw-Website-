import React, { useState, memo } from 'react'
import { Plus } from 'lucide-react'
import { MATERIALS, getMaterial, SHEET_SIZE_PRESETS } from '../lib/materials'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { MaterialType, MaterialGrade } from '../types'
import { toast } from 'sonner'
import { v4 as uuid } from 'uuid'

const GRADES: { value: MaterialGrade; label: string }[] = [
  { value: 'mild_steel', label: 'Mild' },
  { value: 'stainless', label: 'SS' },
  { value: 'aluminum', label: 'Alum' },
]

// Group definitions
const GROUPS: { label: string; ids: MaterialType[] }[] = [
  { label: 'Structural Tube', ids: ['square_tube', 'round_tube', 'rect_tube', 'pipe'] },
  { label: 'Structural Steel', ids: ['angle', 'channel', 'ibeam'] },
  { label: 'Flat Stock', ids: ['flat_bar', 'sheet', 'plate'] },
]

function LibraryPanel() {
  const { project, addPiece } = useProjectStore()
  const { setSelectedIds } = useUIStore()
  const { push } = useHistoryStore()

  const [selectedType, setSelectedType] = useState<MaterialType>('square_tube')
  const [sizeIdx, setSizeIdx] = useState(5)
  const [thkIdx, setThkIdx] = useState(1)
  const [grade, setGrade] = useState<MaterialGrade>('mild_steel')
  const [length, setLength] = useState(24)
  const [angle, setAngle] = useState(0)
  const [upright, setUpright] = useState(false)
  const [customW, setCustomW] = useState(48)
  const [customH, setCustomH] = useState(48)

  const mat = getMaterial(selectedType)

  function handleTypeChange(type: MaterialType) {
    setSelectedType(type)
    const m = getMaterial(type)
    setSizeIdx(m.defaultSizeIdx)
    setThkIdx(m.defaultThkIdx)
    if (m.defaultCustomW) setCustomW(m.defaultCustomW)
    if (m.defaultCustomH) setCustomH(m.defaultCustomH)
  }

  function handleAdd() {
    const cx = project.panX === 0 ? 400 : project.panX
    const cy = project.panY === 0 ? 300 : project.panY
    const scale = 8 * project.zoom
    const wx = (Math.random() * 100 - 50 + cx) / scale
    const wy = (Math.random() * 60 - 30 + cy) / scale

    const id = addPiece({
      type: selectedType,
      sizeIdx,
      thkIdx,
      material: grade,
      length,
      x: wx,
      y: wy,
      angle,
      upright,
      zOffset: 0,
      customW,
      customH,
      holes: [],
      bendLines: [],
      note: '',
      weldSymbol: '',
    })

    setSelectedIds([id])
    push({
      pieces: [...project.pieces, { id, type: selectedType, sizeIdx, thkIdx, material: grade, length, x: wx, y: wy, angle, upright, zOffset: 0, customW, customH, holes: [], bendLines: [], note: '', weldSymbol: '' }],
      connections: project.connections,
    })
    toast.success(`Added ${mat.label} to drawing`)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#f1f5f9',
    padding: '5px 8px',
    fontSize: 12,
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{
      width: 240,
      background: '#0f1117',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Materials</div>
      </div>

      {/* Material list grouped */}
      <div style={{ overflowY: 'auto', flexShrink: 0 }}>
        {GROUPS.map(group => (
          <div key={group.label}>
            {/* Group label */}
            <div style={{
              fontSize: 9,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '8px 14px 4px',
            }}>
              {group.label}
            </div>
            {/* Rows */}
            {group.ids.map(id => {
              const m = MATERIALS.find(x => x.id === id)
              if (!m) return null
              const isSelected = selectedType === id
              return (
                <button
                  key={id}
                  onClick={() => handleTypeChange(id)}
                  style={{
                    width: '100%',
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 14px',
                    border: 'none',
                    borderLeft: isSelected ? '3px solid #f97316' : '3px solid transparent',
                    background: isSelected ? 'rgba(249,115,22,0.08)' : 'transparent',
                    color: isSelected ? '#f97316' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 100ms',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: m.isRound ? '50%' : 2,
                    background: m.color,
                    flexShrink: 0,
                  }} />
                  {m.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

      {/* Config section */}
      <div style={{ padding: '10px 14px', overflowY: 'auto', flex: 1 }}>
        {/* Grade pills */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Grade</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {GRADES.map(g => (
              <button
                key={g.value}
                onClick={() => setGrade(g.value)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  borderRadius: 4,
                  border: `1px solid ${grade === g.value ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                  background: grade === g.value ? 'rgba(249,115,22,0.15)' : 'rgba(0,0,0,0.3)',
                  color: grade === g.value ? '#f97316' : '#64748b',
                  fontSize: 11,
                  fontWeight: grade === g.value ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        {!mat.isCustomSize && (
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Size</label>
            <select value={sizeIdx} onChange={e => setSizeIdx(Number(e.target.value))} style={selectStyle}>
              {mat.sizes.map((s, i) => (
                <option key={i} value={i}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Custom size for sheet/plate */}
        {mat.isCustomSize && (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Preset</label>
              <select
                style={selectStyle}
                onChange={e => {
                  const preset = SHEET_SIZE_PRESETS.find(p => p.label === e.target.value)
                  if (preset && preset.w > 0) { setCustomW(preset.w); setCustomH(preset.h) }
                }}
              >
                {SHEET_SIZE_PRESETS.map(p => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Width (in)</label>
                <input type="number" value={customW} onChange={e => setCustomW(Number(e.target.value))} style={inputStyle} min={1} />
              </div>
              <div>
                <label style={labelStyle}>Height (in)</label>
                <input type="number" value={customH} onChange={e => setCustomH(Number(e.target.value))} style={inputStyle} min={1} />
              </div>
            </div>
          </>
        )}

        {/* Thickness */}
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>{mat.id === 'sheet' || mat.id === 'plate' ? 'Thickness' : 'Wall / Thickness'}</label>
          <select value={thkIdx} onChange={e => setThkIdx(Number(e.target.value))} style={selectStyle}>
            {mat.thicknesses.map((t, i) => (
              <option key={i} value={i}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Length */}
        {!mat.isCustomSize && (
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Length (inches)</label>
            <input
              type="number"
              value={length}
              onChange={e => setLength(Math.max(0.5, Number(e.target.value)))}
              style={inputStyle}
              min={0.5}
              step={0.5}
            />
          </div>
        )}

        {/* Angle */}
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Rotation (deg)</label>
          <input
            type="number"
            value={angle}
            onChange={e => setAngle(Number(e.target.value))}
            style={inputStyle}
            step={15}
          />
        </div>

        {/* Upright toggle */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setUpright(!upright)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              background: upright ? '#f97316' : 'rgba(255,255,255,0.1)',
              transition: 'background 200ms',
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2,
              left: upright ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: 'white',
              transition: 'left 200ms',
            }} />
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Cross-section view</span>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={15} />
          Add to Drawing
        </button>
      </div>

      {/* Piece count */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#475569', flexShrink: 0 }}>
        {project.pieces.length} piece{project.pieces.length !== 1 ? 's' : ''} in drawing
      </div>
    </div>
  )
}

export default memo(LibraryPanel)
