import React, { useState } from 'react'
import { Sparkles, X, Loader2, Plus, RefreshCw } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { toast } from 'sonner'
import type { Piece, MaterialType, MaterialGrade } from '../types'

const EXAMPLE_PROMPTS = [
  '4-leg welding table 4x2 feet with 2x2 square tube legs and 3/16" plate top',
  'Simple A-frame horse stand 3 feet tall from 1.5" angle iron',
  'Trailer tongue with 2x4 rect tube and hitch plate',
]

interface AIResult {
  pieces: Partial<Piece>[]
  description: string
}

export default function AIModal() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIResult|null>(null)
  const [error, setError] = useState('')

  const { pieces, connections } = useProjectStore()
  const { setShowAIModal } = useUIStore()
  const historyStore = useHistoryStore()

  const generate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('No API key set. Add VITE_ANTHROPIC_API_KEY to .env')

      const systemPrompt = `You are a fabrication CAD assistant. Generate piece layouts for metal fabrication drawings.
Return ONLY valid JSON with this structure:
{
  "description": "brief description of what was generated",
  "pieces": [
    {
      "type": "square_tube|round_tube|rect_tube|pipe|angle|channel|ibeam|flat_bar|sheet|plate",
      "sizeIdx": 5,
      "thkIdx": 1,
      "material": "mild_steel|stainless|aluminum",
      "length": 24,
      "x": 0,
      "y": 0,
      "angle": 0,
      "upright": false,
      "zOffset": 0
    }
  ]
}
sizeIdx and thkIdx are indices into the material's sizes/thicknesses arrays (0-based).
For square_tube sizes: 0=0.5", 1=0.75", 2=1", 3=1.25", 4=1.5", 5=2", 6=2.5", 7=3", 8=4"
For square_tube thicknesses: 0=16ga, 1=14ga, 2=13ga, 3=11ga, 4=10ga, 5=3/16", 6=1/4"
Position x,y in inches on the drawing. length in inches.
Space pieces so they don't overlap. Use realistic dimensions.`

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{role:'user',content:prompt}],
          system: systemPrompt,
        })
      })

      if (!resp.ok) throw new Error(`API error: ${resp.status}`)
      const data = await resp.json()
      const text = data.content?.[0]?.text ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = JSON.parse(jsonMatch[0]) as AIResult
      setResult(parsed)
    } catch (e: any) {
      setError(e.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  const addToDrawing = (replace = false) => {
    if (!result) return
    historyStore.push({pieces, connections})
    if (replace) useProjectStore.getState().clearProject()

    const newPieces: Piece[] = result.pieces.map((p, i) => ({
      id: crypto.randomUUID(),
      type: (p.type || 'square_tube') as MaterialType,
      sizeIdx: p.sizeIdx ?? 5,
      thkIdx: p.thkIdx ?? 1,
      material: (p.material || 'mild_steel') as MaterialGrade,
      length: p.length ?? 24,
      x: (p.x ?? 0) + (replace ? 0 : 4),
      y: (p.y ?? 0) + (replace ? 0 : 4),
      angle: p.angle ?? 0,
      upright: p.upright ?? false,
      zOffset: p.zOffset ?? 0,
      holes: [],
      note: '',
      weldSymbol: '',
    }))
    newPieces.forEach(p => useProjectStore.getState().addPiece(p))
    toast.success(`Added ${newPieces.length} pieces from AI`)
    setShowAIModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="relative flex flex-col rounded-xl overflow-hidden" style={{width:'560px',maxHeight:'90vh',background:'#111827',border:'1px solid rgba(255,255,255,0.1)'}}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.08)',background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(109,40,217,0.1))'}}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
              <Sparkles size={16} color="white" />
            </div>
            <div>
              <div className="font-semibold text-white">AI Layout Generator</div>
              <div className="text-xs text-slate-500">Describe your fabrication project</div>
            </div>
          </div>
          <button onClick={()=>setShowAIModal(false)} className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Prompt */}
          <div>
            <textarea
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. 4x4 welding table with 2x2 square tube legs and plate top..."
              className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none"
              style={{background:'#1f2937',border:'1px solid rgba(255,255,255,0.12)',userSelect:'text',color:'white',caretColor:'white'}}
              onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)generate()}}
            />
          </div>

          {/* Examples */}
          <div>
            <div className="text-xs text-slate-500 mb-2">Examples:</div>
            <div className="flex flex-col gap-1">
              {EXAMPLE_PROMPTS.map((ex,i) => (
                <button key={i} onClick={()=>setPrompt(ex)}
                  className="text-left text-xs px-3 py-2 rounded transition-all hover:bg-white/5 text-slate-400 hover:text-slate-300"
                  style={{border:'1px solid rgba(255,255,255,0.06)'}}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-red-400" style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)'}}>
              {error}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div className="rounded-lg p-3 flex flex-col gap-2" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div className="text-xs font-semibold text-green-400">{result.description}</div>
              <div className="text-xs text-slate-400">{result.pieces.length} pieces generated:</div>
              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                {result.pieces.map((p,i) => (
                  <div key={i} className="text-xs text-slate-500 font-mono">
                    {p.type} — {p.length}" @ {p.x?.toFixed(1)},{p.y?.toFixed(1)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t" style={{borderColor:'rgba(255,255,255,0.08)'}}>
          {result ? (
            <>
              <button onClick={()=>setResult(null)}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm text-slate-400 hover:bg-white/10 transition-all">
                <RefreshCw size={14}/> Regenerate
              </button>
              <button onClick={()=>addToDrawing(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{background:'rgba(249,115,22,0.8)'}}>
                <Plus size={14}/> Add to Drawing
              </button>
              <button onClick={()=>addToDrawing(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{background:'#f97316'}}>
                Replace Drawing
              </button>
            </>
          ) : (
            <>
              <button onClick={()=>setShowAIModal(false)}
                className="flex-1 py-2 rounded text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all border" style={{borderColor:'rgba(255,255,255,0.1)'}}>
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={!prompt.trim()||loading}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{background:'linear-gradient(135deg,#7c3aed,#6d28d9)'}}>
                {loading ? <><Loader2 size={14} className="animate-spin"/>Generating...</> : <><Sparkles size={14}/>Generate (Ctrl+Enter)</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
