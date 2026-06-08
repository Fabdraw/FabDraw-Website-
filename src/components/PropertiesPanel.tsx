import React from 'react'
import { Trash2, RotateCcw, Plus, X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { MATERIALS } from '../lib/materials'
import { calcWeight, formatWeight } from '../lib/weights'
import type { Piece } from '../types'

const WELD_SYMBOLS = ['', 'V', 'X', 'O', '\\', '/', '△', '□', '⌓']

export default function PropertiesPanel() {
  const { pieces, connections, updatePiece, deletePieces, removeConnection } = useProjectStore()
  const { selectedIds, setSelectedIds, selectedConnectionId, setSelectedConnectionId, rightTab, setRightTab, holeAddMode, setHoleAddMode } = useUIStore()
  const historyStore = useHistoryStore()

  const selectedPieces = pieces.filter(p => selectedIds.includes(p.id))
  const piece: Piece | null = selectedPieces.length === 1 ? selectedPieces[0] : null
  const selectedConn = connections.find(c => c.id === selectedConnectionId)

  const tabBtn = (tab: 'props'|'holes'|'notes', label: string) => (
    <button
      key={tab}
      onClick={() => setRightTab(tab)}
      className="flex-1 py-2 text-xs font-medium transition-all"
      style={{
        color: rightTab===tab ? '#f97316' : '#64748b',
        borderBottom: rightTab===tab ? '2px solid #f97316' : '2px solid transparent',
      }}
    >{label}</button>
  )

  const inp = "w-full rounded px-2 py-1 text-xs text-white outline-none"
  const inpStyle = {background:'#0d1117',border:'1px solid rgba(255,255,255,0.1)'}

  const handleDelete = () => {
    if (!piece) return
    historyStore.push({pieces, connections})
    deletePieces([piece.id])
    setSelectedIds([])
  }

  const handleUpdate = (u: Partial<Piece>) => {
    if (!piece) return
    updatePiece(piece.id, u)
  }

  if (selectedConn && !piece) {
    const pA = pieces.find(p=>p.id===selectedConn.p1)
    const pB = pieces.find(p=>p.id===selectedConn.p2)
    return (
      <div className="flex flex-col flex-shrink-0" style={{width:'200px',background:'#111827',borderLeft:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="px-3 pt-3 pb-2 border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="text-xs font-semibold text-slate-300">Connection</div>
          <div className="text-xs text-slate-500 mt-0.5">{pA?.type} → {pB?.type}</div>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <div className="text-xs text-slate-500">Type</div>
          <select
            value={selectedConn.type}
            onChange={e=>useProjectStore.getState().updateConnectionType(selectedConn.id,e.target.value)}
            className={inp} style={inpStyle}
          >
            {['butt_weld','miter_weld','fillet_weld','cope_cut','bolted','flanged'].map(t=>(
              <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
            ))}
          </select>
          <button onClick={()=>{removeConnection(selectedConn.id);setSelectedConnectionId(null)}}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/10 transition-all">
            <X size={12} /> Remove Connection
          </button>
        </div>
      </div>
    )
  }

  if (!piece) {
    return (
      <div className="flex flex-col flex-shrink-0 items-center justify-center" style={{width:'200px',background:'#111827',borderLeft:'1px solid rgba(255,255,255,0.06)'}}>
        {selectedPieces.length > 1 ? (
          <div className="text-center p-4">
            <div className="text-sm font-semibold text-slate-300 mb-1">{selectedPieces.length} pieces</div>
            <div className="text-xs text-slate-500">Multi-select</div>
            <button onClick={()=>{historyStore.push({pieces,connections});deletePieces(selectedIds);setSelectedIds([])}}
              className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={12}/> Delete All
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-600 text-center px-4">Click a piece to see its properties</div>
        )}
      </div>
    )
  }

  const mat = MATERIALS[piece.type]
  const wt = calcWeight(piece)

  return (
    <div className="flex flex-col flex-shrink-0" style={{width:'200px',background:'#111827',borderLeft:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b flex items-start justify-between" style={{borderColor:'rgba(255,255,255,0.06)'}}>
        <div>
          <div className="text-xs font-semibold" style={{color:mat.color}}>{mat.label}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-mono">{formatWeight(wt)}</div>
        </div>
        <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-all"><Trash2 size={13}/></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
        {tabBtn('props','Props')}
        {tabBtn('holes','Holes')}
        {tabBtn('notes','Notes')}
      </div>

      <div className="flex-1 overflow-y-auto">
        {rightTab==='props' && (
          <div className="p-3 flex flex-col gap-3">
            {/* Orientation */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Orientation</div>
              <div className="flex gap-1">
                <button onClick={()=>handleUpdate({upright:false})}
                  className="flex-1 py-1 rounded text-xs transition-all"
                  style={{background:!piece.upright?'rgba(249,115,22,0.2)':'rgba(255,255,255,0.05)',color:!piece.upright?'#f97316':'#64748b',border:!piece.upright?'1px solid rgba(249,115,22,0.4)':'1px solid transparent'}}>
                  Horizontal
                </button>
                <button onClick={()=>handleUpdate({upright:true})}
                  className="flex-1 py-1 rounded text-xs transition-all"
                  style={{background:piece.upright?'rgba(249,115,22,0.2)':'rgba(255,255,255,0.05)',color:piece.upright?'#f97316':'#64748b',border:piece.upright?'1px solid rgba(249,115,22,0.4)':'1px solid transparent'}}>
                  Upright
                </button>
              </div>
            </div>

            {/* Length */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Length (inches)</div>
              <input type="number" value={piece.length} min={0.5} step={0.5}
                onChange={e=>handleUpdate({length:Math.max(0.5,Number(e.target.value))})}
                className={inp} style={inpStyle} />
            </div>

            {/* Angle */}
            {!piece.upright && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Angle (degrees)</div>
                <input type="number" value={piece.angle} step={1}
                  onChange={e=>handleUpdate({angle:Number(e.target.value)})}
                  className={inp} style={inpStyle} />
              </div>
            )}

            {/* Position */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Position</div>
              <div className="flex gap-1">
                <input type="number" value={Math.round(piece.x*10)/10} step={0.5}
                  onChange={e=>handleUpdate({x:Number(e.target.value)})}
                  className={inp} style={inpStyle} placeholder="X" />
                <input type="number" value={Math.round(piece.y*10)/10} step={0.5}
                  onChange={e=>handleUpdate({y:Number(e.target.value)})}
                  className={inp} style={inpStyle} placeholder="Y" />
              </div>
            </div>

            {/* Z Offset */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Z Offset (inches)</div>
              <input type="number" value={piece.zOffset} step={0.25}
                onChange={e=>handleUpdate({zOffset:Number(e.target.value)})}
                className={inp} style={inpStyle} />
            </div>

            {/* Material grade */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Material Grade</div>
              <select value={piece.material} onChange={e=>handleUpdate({material:e.target.value as any})}
                className={inp} style={inpStyle}>
                <option value="mild_steel">Mild Steel</option>
                <option value="stainless">Stainless</option>
                <option value="aluminum">Aluminum</option>
              </select>
            </div>

            {/* Size/Wall */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Size</div>
              <select value={piece.sizeIdx} onChange={e=>handleUpdate({sizeIdx:Number(e.target.value)})}
                className={inp} style={inpStyle}>
                {mat.sizes.map((s,i)=><option key={i} value={i}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Wall / Thickness</div>
              <select value={piece.thkIdx} onChange={e=>handleUpdate({thkIdx:Number(e.target.value)})}
                className={inp} style={inpStyle}>
                {mat.thicknesses.map((t,i)=><option key={i} value={i}>{t.label}</option>)}
              </select>
            </div>

            {(piece.type==='sheet'||piece.type==='plate') && (
              <div className="flex gap-1">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Width"</div>
                  <input type="number" value={piece.customW??48} min={1}
                    onChange={e=>handleUpdate({customW:Number(e.target.value)})}
                    className={inp} style={inpStyle} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Height"</div>
                  <input type="number" value={piece.customH??48} min={1}
                    onChange={e=>handleUpdate({customH:Number(e.target.value)})}
                    className={inp} style={inpStyle} />
                </div>
              </div>
            )}
          </div>
        )}

        {rightTab==='holes' && (
          <div className="p-3 flex flex-col gap-2">
            <button
              onClick={()=>setHoleAddMode(!holeAddMode)}
              className="flex items-center justify-center gap-2 py-2 rounded text-xs font-medium transition-all"
              style={{
                background: holeAddMode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                color: holeAddMode ? '#3b82f6' : '#94a3b8',
                border: holeAddMode ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
              }}
            >
              <Plus size={12}/> {holeAddMode ? 'Click canvas to place hole' : 'Add Hole Mode'}
            </button>
            {piece.holes.length === 0 && (
              <div className="text-xs text-slate-600 text-center py-4">No holes</div>
            )}
            {piece.holes.map((hole, idx) => (
              <div key={hole.id} className="rounded p-2 flex flex-col gap-1" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Hole {idx+1}</span>
                  <button onClick={()=>{
                    const newHoles=piece.holes.filter(h=>h.id!==hole.id)
                    updatePiece(piece.id,{holes:newHoles})
                  }} className="text-red-400 hover:text-red-300"><X size={12}/></button>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <div className="text-xs text-slate-600">Pos"</div>
                    <input type="number" value={Math.round(hole.posInches*100)/100} step={0.1} min={0} max={piece.length}
                      onChange={e=>{
                        const newHoles=piece.holes.map(h=>h.id===hole.id?{...h,posInches:Number(e.target.value)}:h)
                        updatePiece(piece.id,{holes:newHoles})
                      }}
                      className={inp} style={inpStyle} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-600">Dia"</div>
                    <input type="number" value={hole.diameter} step={0.0625} min={0.0625}
                      onChange={e=>{
                        const newHoles=piece.holes.map(h=>h.id===hole.id?{...h,diameter:Number(e.target.value)}:h)
                        updatePiece(piece.id,{holes:newHoles})
                      }}
                      className={inp} style={inpStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rightTab==='notes' && (
          <div className="p-3 flex flex-col gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">Notes</div>
              <textarea
                value={piece.note}
                onChange={e=>handleUpdate({note:e.target.value})}
                rows={4}
                className="w-full rounded px-2 py-1 text-xs text-white outline-none resize-none"
                style={{...inpStyle,userSelect:'text'}}
                placeholder="Add fabrication notes..."
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Weld Symbol</div>
              <select value={piece.weldSymbol} onChange={e=>handleUpdate({weldSymbol:e.target.value})}
                className={inp} style={inpStyle}>
                {WELD_SYMBOLS.map((s,i)=><option key={i} value={s}>{s||'None'}</option>)}
              </select>
            </div>
            {piece.note && (
              <div className="rounded p-2 text-xs text-slate-400" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                {piece.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
