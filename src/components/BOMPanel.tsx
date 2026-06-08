import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { MATERIALS } from '../lib/materials'
import { calcWeight, formatWeight, totalWeight } from '../lib/weights'
import type { Piece } from '../types'

interface BOMRow {
  key: string
  type: string
  label: string
  sizeLabel: string
  thkLabel: string
  material: string
  length: number
  qty: number
  totalWeight: number
  color: string
  ids: string[]
}

function groupPieces(pieces: Piece[]): BOMRow[] {
  const map = new Map<string, BOMRow>()
  for (const p of pieces) {
    const mat = MATERIALS[p.type]
    const sz = mat.sizes[p.sizeIdx]?.label ?? ''
    const thk = mat.thicknesses[p.thkIdx]?.label ?? ''
    const key = `${p.type}|${p.sizeIdx}|${p.thkIdx}|${p.material}|${p.length}`
    if (map.has(key)) {
      const row = map.get(key)!
      row.qty++
      row.totalWeight += calcWeight(p)
      row.ids.push(p.id)
    } else {
      map.set(key, {
        key,
        type: p.type,
        label: mat.label,
        sizeLabel: sz,
        thkLabel: thk,
        material: p.material === 'mild_steel' ? 'A36' : p.material === 'stainless' ? 'SS304' : '6061',
        length: p.length,
        qty: 1,
        totalWeight: calcWeight(p),
        color: mat.color,
        ids: [p.id],
      })
    }
  }
  return Array.from(map.values())
}

export default function BOMPanel() {
  const { pieces } = useProjectStore()
  const { isBOMCollapsed, toggleBOM, setSelectedIds } = useUIStore()
  const rows = groupPieces(pieces)
  const total = totalWeight(pieces)

  return (
    <div className="flex-shrink-0" style={{background:'#111827',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 cursor-pointer"
        style={{height:'32px',background:'rgba(249,115,22,0.08)',borderBottom:'1px solid rgba(249,115,22,0.15)'}}
        onClick={toggleBOM}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-orange-400">BILL OF MATERIALS</span>
          <span className="text-xs text-slate-500">{pieces.length} pieces • {rows.length} line items • {formatWeight(total)} total</span>
        </div>
        {isBOMCollapsed ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </div>

      {!isBOMCollapsed && (
        <div style={{height:'128px',overflowY:'auto'}}>
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-600">No pieces in drawing</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.03)',position:'sticky',top:0}}>
                  <th className="text-left px-3 py-1 text-slate-500 font-medium">Material</th>
                  <th className="text-left px-2 py-1 text-slate-500 font-medium">Size</th>
                  <th className="text-left px-2 py-1 text-slate-500 font-medium">Wall</th>
                  <th className="text-left px-2 py-1 text-slate-500 font-medium">Grade</th>
                  <th className="text-right px-2 py-1 text-slate-500 font-medium">Len"</th>
                  <th className="text-right px-2 py-1 text-slate-500 font-medium">Qty</th>
                  <th className="text-right px-3 py-1 text-slate-500 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr
                    key={r.key}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setSelectedIds(r.ids)}
                    style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}
                  >
                    <td className="px-3 py-1 font-medium" style={{color:r.color}}>{r.label}</td>
                    <td className="px-2 py-1 text-slate-400 font-mono">{r.sizeLabel}</td>
                    <td className="px-2 py-1 text-slate-500 font-mono">{r.thkLabel}</td>
                    <td className="px-2 py-1 text-slate-500">{r.material}</td>
                    <td className="px-2 py-1 text-slate-400 font-mono text-right">{r.length}"</td>
                    <td className="px-2 py-1 text-white font-semibold text-right">{r.qty}</td>
                    <td className="px-3 py-1 text-slate-400 font-mono text-right">{formatWeight(r.totalWeight)}</td>
                  </tr>
                ))}
                <tr style={{background:'rgba(249,115,22,0.06)',borderTop:'1px solid rgba(249,115,22,0.2)'}}>
                  <td colSpan={5} className="px-3 py-1 text-orange-400 font-semibold">TOTAL</td>
                  <td className="px-2 py-1 text-orange-400 font-bold text-right">{pieces.length}</td>
                  <td className="px-3 py-1 text-orange-400 font-bold font-mono text-right">{formatWeight(total)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
