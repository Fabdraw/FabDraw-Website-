import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { getMaterial, getSizeLabel, getWallLabel, getSizeValue, getWall } from '../lib/materials'
import { calcWeight } from '../lib/weights'
import { toFeetInches } from '../lib/geometry'

export default function BOMPanel() {
  const { project } = useProjectStore()
  const { isBOMCollapsed, toggleBOM, setSelectedIds } = useUIStore()

  // Group pieces
  const groups = new Map<string, typeof project.pieces>()
  for (const p of project.pieces) {
    const key = `${p.type}|${p.sizeIdx}|${p.thkIdx}|${p.material}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const totalWeight = project.pieces.reduce((sum, p) => {
    const sv = getSizeValue(p.type, p.sizeIdx)
    const wall = getWall(p.type, p.thkIdx)
    return sum + calcWeight(p, sv, wall)
  }, 0)

  const cols: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '24px 1fr 100px 80px 80px 80px 70px 80px',
    gap: 0,
    alignItems: 'center',
  }

  const cellStyle: React.CSSProperties = {
    fontSize: 11,
    padding: '4px 8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      {/* Header */}
      <div
        onClick={toggleBOM}
        style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 12px', cursor: 'pointer', borderBottom: isBOMCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)', userSelect: 'none' }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill of Materials</span>
          {project.pieces.length > 0 && (
            <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.15)', color: '#f97316', borderRadius: 10, padding: '1px 7px' }}>
              {project.pieces.length} pcs
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isBOMCollapsed && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Total: <span style={{ color: '#f97316', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{totalWeight.toFixed(2)} lbs</span>
            </span>
          )}
          {isBOMCollapsed ? <ChevronUp size={13} color="#475569" /> : <ChevronDown size={13} color="#475569" />}
        </div>
      </div>

      {!isBOMCollapsed && (
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          {/* Column headers */}
          <div style={{ ...cols, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
            {['#', 'TYPE', 'SIZE', 'WALL', 'GRADE', 'LENGTH', 'QTY', 'WEIGHT'].map(h => (
              <div key={h} style={{ ...cellStyle, fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {Array.from(groups.entries()).map(([key, pieces], rowIdx) => {
            const p = pieces[0]
            const mat = getMaterial(p.type)
            const sv = getSizeValue(p.type, p.sizeIdx)
            const wall = getWall(p.type, p.thkIdx)
            const rowWeight = pieces.reduce((sum, pc) => sum + calcWeight(pc, sv, wall), 0)
            const lengths = [...new Set(pieces.map(pc => toFeetInches(pc.length)))].join(', ')

            return (
              <div
                key={key}
                onClick={() => setSelectedIds(pieces.map(pc => pc.id))}
                style={{ ...cols, background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', cursor: 'pointer', transition: 'background 100ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
              >
                <div style={{ ...cellStyle, color: '#475569' }}>{rowIdx + 1}</div>
                <div style={{ ...cellStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: mat.isRound ? '50%' : 1, background: mat.color, flexShrink: 0 }} />
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{mat.label}</span>
                </div>
                <div style={{ ...cellStyle, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                  {mat.isCustomSize ? `${p.customW}x${p.customH}"` : getSizeLabel(p.type, p.sizeIdx)}
                </div>
                <div style={{ ...cellStyle, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                  {getWallLabel(p.type, p.thkIdx)}
                </div>
                <div style={{ ...cellStyle, color: '#64748b' }}>{p.material.replace('_', ' ')}</div>
                <div style={{ ...cellStyle, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>{lengths}</div>
                <div style={{ ...cellStyle, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{pieces.length}</div>
                <div style={{ ...cellStyle, color: '#f97316', fontFamily: 'JetBrains Mono, monospace' }}>{rowWeight.toFixed(2)} lb</div>
              </div>
            )
          })}

          {project.pieces.length === 0 && (
            <div style={{ padding: '16px 0', textAlign: 'center', color: '#334155', fontSize: 12 }}>
              No pieces in drawing
            </div>
          )}
        </div>
      )}
    </div>
  )
}
