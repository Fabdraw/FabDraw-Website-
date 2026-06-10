import React, { useState, memo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { MATERIALS, getSizeValue, getMaterial, SHEET_SIZE_PRESETS } from '../lib/materials'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { MaterialType, MaterialGrade } from '../types'
import { toast } from 'sonner'

const GRADES: { value: MaterialGrade; label: string }[] = [
  { value: 'mild_steel', label: 'Mild Steel' },
  { value: 'stainless', label: 'Stainless' },
  { value: 'aluminum', label: 'Aluminum' },
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
    // Place at canvas center area
    const cx = (project.panX === 0 ? 400 : project.panX)
    const cy = (project.panY === 0 ? 300 : project.panY)
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
    push({ pieces: [...project.pieces, { id, type: selectedType, sizeIdx, thkIdx, material: grade, length, x: wx, y: wy, angle, upright, zOffset: 0, customW, customH, holes: [], bendLines: [], note: '', weldSymbol: '' }], connections: project.connections })
    toast.success(`Added ${mat.label} to drawing`)
  }

  const labelStyle: React.CSSProperties = { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: '#f1f5f9', padding: '5px 8px', fontSize: 12, outline: 'none' }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ width: 220, background: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Materials</div>
      </div>

      {/* Material type grid */}
      <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {MATERIALS.map(m => (
            <button
              key={m.id}
              onClick={() => handleTypeChange(m.id)}
              style={{
                padding: '6px 8px',
                borderRadius: 5,
                border: `1px solid ${selectedType === m.id ? m.color : 'rgba(255,255,255,0.07)'}`,
                background: selectedType === m.id ? `${m.color}22` : 'rgba(0,0,0,0.2)',
                color: selectedType === m.id ? m.color : '#64748b',
                fontSize: 11,
                fontWeight: selectedType === m.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 150ms',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: m.isRound ? '50%' : 2, background: m.color, flexShrink: 0 }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

      {/* Settings */}
      <div style={{ padding: '8px 14px', overflowY: 'auto', flex: 1 }}>
        {/* Grade */}
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Grade</label>
          <select value={grade} onChange={e => setGrade(e.target.value as MaterialGrade)} style={selectStyle}>
            {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

        {/* Size */}
        {!mat.isCustomSize && (
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Size</label>
            <select value={sizeIdx} onChange={e => setSizeIdx(Number(e.target.value))} style={selectStyle}>
              {mat.sizes.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
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
                {SHEET_SIZE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
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
            {mat.thicknesses.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
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
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
              background: upright ? '#f97316' : 'rgba(255,255,255,0.1)',
              transition: 'background 200ms',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: upright ? 18 : 2, width: 16, height: 16,
              borderRadius: '50%', background: 'white', transition: 'left 200ms',
            }} />
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Cross-section view</span>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          style={{
            width: '100%', padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: 'white', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
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
