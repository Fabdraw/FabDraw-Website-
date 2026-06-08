import React, { useState } from 'react'
import { X, DollarSign } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { getMaterial, getSizeValue, getWall } from '../lib/materials'
import { calcWeight } from '../lib/weights'
import { toFeetInches } from '../lib/geometry'

const MATERIAL_COSTS: Record<string, number> = {
  mild_steel: 0.85,
  stainless: 3.20,
  aluminum: 2.10,
}

const LABOR_RATES: Record<string, number> = {
  welding: 85,
  cutting: 65,
  grinding: 55,
  assembly: 75,
}

export default function CostCalculator() {
  const { project } = useProjectStore()
  const { setShowCostCalculator } = useUIStore()
  const [laborHours, setLaborHours] = useState(4)
  const [laborRate, setLaborRate] = useState(75)
  const [weldingHours, setWeldingHours] = useState(2)
  const [overhead, setOverhead] = useState(1.3)
  const [markup, setMarkup] = useState(1.25)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4, color: '#f1f5f9', padding: '5px 8px', fontSize: 12, outline: 'none',
  }
  const labelStyle: React.CSSProperties = { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, display: 'block' }

  // Calculate material costs
  const matCosts = project.pieces.map(p => {
    const sv = getSizeValue(p.type, p.sizeIdx)
    const wall = getWall(p.type, p.thkIdx)
    const weight = calcWeight(p, sv, wall)
    const rate = MATERIAL_COSTS[p.material] ?? 0.85
    return { piece: p, weight, cost: weight * rate }
  })

  const totalMatCost = matCosts.reduce((s, m) => s + m.cost, 0)
  const totalWeight = matCosts.reduce((s, m) => s + m.weight, 0)
  const laborCost = laborHours * laborRate
  const weldingCost = weldingHours * LABOR_RATES.welding
  const subtotal = (totalMatCost + laborCost + weldingCost) * overhead
  const total = subtotal * markup

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 540, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={16} color="#22c55e" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Cost Calculator</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{project.pieces.length} pieces, {totalWeight.toFixed(2)} lbs total</div>
          </div>
          <button onClick={() => setShowCostCalculator(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left - inputs */}
          <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px 14px', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Labor</div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Misc Labor Hours</label>
              <input type="number" value={laborHours} onChange={e => setLaborHours(Number(e.target.value))} style={inputStyle} min={0} step={0.5} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Labor Rate ($/hr)</label>
              <input type="number" value={laborRate} onChange={e => setLaborRate(Number(e.target.value))} style={inputStyle} min={0} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Welding Hours</label>
              <input type="number" value={weldingHours} onChange={e => setWeldingHours(Number(e.target.value))} style={inputStyle} min={0} step={0.5} />
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
            <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Overhead & Markup</div>

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Overhead Multiplier</label>
              <input type="number" value={overhead} onChange={e => setOverhead(Number(e.target.value))} style={inputStyle} min={1} step={0.05} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Markup Multiplier</label>
              <input type="number" value={markup} onChange={e => setMarkup(Number(e.target.value))} style={inputStyle} min={1} step={0.05} />
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
            <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>Material Rates ($/lb)</div>
            {Object.entries(MATERIAL_COSTS).map(([grade, rate]) => (
              <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                <span>{grade.replace('_', ' ')}</span>
                <span style={{ color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' }}>${rate.toFixed(2)}/lb</span>
              </div>
            ))}
          </div>

          {/* Right - breakdown */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Material Breakdown</div>

            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
              {matCosts.map(({ piece, weight, cost }) => (
                <div key={piece.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{getMaterial(piece.type).label}</div>
                    <div style={{ fontSize: 10, color: '#475569' }}>{toFeetInches(piece.length)} | {weight.toFixed(2)} lbs | {piece.material.replace('_', ' ')}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                    ${cost.toFixed(2)}
                  </div>
                </div>
              ))}
              {project.pieces.length === 0 && (
                <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No pieces in drawing</div>
              )}
            </div>

            {/* Totals */}
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                ['Materials', `$${totalMatCost.toFixed(2)}`],
                ['Labor', `$${laborCost.toFixed(2)}`],
                ['Welding', `$${weldingCost.toFixed(2)}`],
                ['Overhead', `${((overhead - 1) * 100).toFixed(0)}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>TOTAL</span>
                <span style={{ fontSize: 18, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>${total.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: 10, color: '#334155', marginTop: 4, textAlign: 'right' }}>
                incl. {((markup - 1) * 100).toFixed(0)}% markup
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
