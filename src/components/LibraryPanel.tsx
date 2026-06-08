import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { MATERIALS, getSizeValue } from '../lib/materials'
import type { MaterialType, MaterialGrade, Piece } from '../types'

const GROUPS = [
  { label: 'STRUCTURAL TUBE', types: ['square_tube','round_tube','rect_tube','pipe'] as MaterialType[] },
  { label: 'STRUCTURAL STEEL', types: ['angle','channel','ibeam'] as MaterialType[] },
  { label: 'FLAT STOCK', types: ['flat_bar','sheet','plate'] as MaterialType[] },
]

export default function LibraryPanel() {
  const [selectedType, setSelectedType] = useState<MaterialType>('square_tube')
  const [sizeIdx, setSizeIdx] = useState(5)
  const [thkIdx, setThkIdx] = useState(1)
  const [length, setLength] = useState(24)
  const [matGrade, setMatGrade] = useState<MaterialGrade>('mild_steel')
  const [customW, setCustomW] = useState(48)
  const [customH, setCustomH] = useState(48)
  const [angle, setAngle] = useState(0)

  const { pieces, connections, panX, panY, zoom } = useProjectStore()
  const { setSelectedIds } = useUIStore()
  const historyStore = useHistoryStore()

  const mat = MATERIALS[selectedType]

  const handleTypeSelect = (t: MaterialType) => {
    setSelectedType(t)
    const m = MATERIALS[t]
    setSizeIdx(m.defaultSizeIdx)
    setThkIdx(m.defaultThkIdx)
  }

  const handleAdd = () => {
    const sv = getSizeValue(selectedType, sizeIdx)
    const newPiece: Piece = {
      id: crypto.randomUUID(),
      type: selectedType,
      sizeIdx,
      thkIdx,
      material: matGrade,
      length,
      x: (window.innerWidth / 2 - panX) / (zoom * 8) + (Math.random()-0.5)*4,
      y: (window.innerHeight / 2 - panY) / (zoom * 8) + (Math.random()-0.5)*4,
      angle,
      upright: false,
      zOffset: 0,
      customW: (selectedType==='sheet'||selectedType==='plate') ? customW : undefined,
      customH: (selectedType==='sheet'||selectedType==='plate') ? customH : undefined,
      holes: [],
      note: '',
      weldSymbol: '',
    }
    historyStore.push({pieces, connections})
    useProjectStore.getState().addPiece(newPiece)
    setSelectedIds([newPiece.id])
  }

  // ft/in display
  const ft = Math.floor(length/12)
  const inch = length%12
  const lenLabel = ft>0 ? `${ft}'-${inch}"` : `${inch}"`

  const gradePill = (g: MaterialGrade, label: string) => (
    <button
      key={g}
      onClick={() => setMatGrade(g)}
      className="flex-1 py-1 rounded text-xs font-medium transition-all"
      style={{
        background: matGrade===g ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
        color: matGrade===g ? '#f97316' : '#94a3b8',
        border: matGrade===g ? '1px solid rgba(249,115,22,0.4)' : '1px solid transparent',
      }}
    >{label}</button>
  )

  return (
    <div className="flex flex-col flex-shrink-0" style={{width:'200px',background:'#111827',borderRight:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
      {/* Material type list */}
      <div className="flex-1 overflow-y-auto py-1">
        {GROUPS.map(grp => (
          <div key={grp.label}>
            <div className="px-3 pt-3 pb-1" style={{fontSize:'9px',color:'#475569',letterSpacing:'0.08em',fontWeight:600}}>{grp.label}</div>
            {grp.types.map(t => {
              const m = MATERIALS[t]
              const active = selectedType === t
              return (
                <button
                  key={t}
                  onClick={() => handleTypeSelect(t)}
                  className="w-full flex items-center gap-2 px-3 py-2 transition-all text-left"
                  style={{
                    background: active ? 'rgba(249,115,22,0.1)' : 'transparent',
                    borderLeft: active ? '2px solid #f97316' : '2px solid transparent',
                  }}
                >
                  <span dangerouslySetInnerHTML={{__html: m.svgIcon}} style={{flexShrink:0,display:'flex'}} />
                  <span className="text-xs font-medium" style={{color: active ? '#f97316' : '#94a3b8'}}>{m.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Config section */}
      <div className="flex-shrink-0 border-t p-3 flex flex-col gap-2" style={{borderColor:'rgba(255,255,255,0.06)',background:'#0d1117'}}>
        {/* Size */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Size</div>
          <select
            value={sizeIdx}
            onChange={e => setSizeIdx(Number(e.target.value))}
            className="w-full rounded px-2 py-1 text-xs text-white outline-none"
            style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)'}}
          >
            {mat.sizes.map((s,i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        </div>

        {(selectedType==='sheet'||selectedType==='plate') && (
          <div className="flex gap-1">
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">W"</div>
              <input type="number" value={customW} onChange={e=>setCustomW(Number(e.target.value))} min={1}
                className="w-full rounded px-2 py-1 text-xs text-white outline-none"
                style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 mb-1">H"</div>
              <input type="number" value={customH} onChange={e=>setCustomH(Number(e.target.value))} min={1}
                className="w-full rounded px-2 py-1 text-xs text-white outline-none"
                style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
          </div>
        )}

        {/* Wall */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Wall / Thickness</div>
          <select
            value={thkIdx}
            onChange={e => setThkIdx(Number(e.target.value))}
            className="w-full rounded px-2 py-1 text-xs text-white outline-none"
            style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.1)'}}
          >
            {mat.thicknesses.map((t,i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
        </div>

        {/* Length */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">Length</span>
            <span className="text-xs font-mono text-orange-400">{lenLabel}</span>
          </div>
          <input
            type="range" min={1} max={240} value={length}
            onChange={e => setLength(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex gap-1 mt-1">
            {[12,24,48,96].map(l => (
              <button key={l} onClick={()=>setLength(l)}
                className="flex-1 py-0.5 rounded text-xs transition-all"
                style={{
                  background: length===l ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                  color: length===l ? '#f97316' : '#64748b',
                  fontSize:'10px',
                }}>
                {l<12?`${l}"`:`${l/12}'`}
              </button>
            ))}
          </div>
        </div>

        {/* Angle */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-500">Angle</span>
            <span className="text-xs font-mono text-slate-400">{angle}°</span>
          </div>
          <input type="range" min={-90} max={90} value={angle}
            onChange={e=>setAngle(Number(e.target.value))} className="w-full accent-orange-500" />
        </div>

        {/* Material grade */}
        <div>
          <div className="text-xs text-slate-500 mb-1">Material</div>
          <div className="flex gap-1">
            {gradePill('mild_steel','Mild')}
            {gradePill('stainless','SS')}
            {gradePill('aluminum','Alum')}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 py-2 rounded font-semibold text-sm transition-all hover:brightness-110 active:scale-95"
          style={{background:'#f97316',color:'white'}}
        >
          <Plus size={16} />
          Add to Drawing
        </button>
      </div>
    </div>
  )
}
