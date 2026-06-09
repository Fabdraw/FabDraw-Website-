import React, { useState } from 'react'
import { X, Sparkles, Send } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { toast } from 'sonner'
import type { Piece } from '../types'

const EXAMPLE_PROMPTS = [
  'Create a 4x4 square tube frame 48" wide x 36" tall',
  'Add 3 cross braces for a welding table',
  'Generate a simple A-frame structure',
  'Create a trailer hitch receiver mount',
]

export default function AIModal() {
  const { project, addPiece } = useProjectStore()
  const { setShowAIModal } = useUIStore()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')

  async function handleGenerate() {
    if (!prompt.trim()) return
    setLoading(true)
    setResponse('')

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

    if (!apiKey) {
      toast.error('VITE_ANTHROPIC_API_KEY not set in .env')
      setLoading(false)
      return
    }

    try {
      const systemPrompt = `You are FabDraw AI. Return ONLY a raw JSON array of piece objects. No markdown. No code blocks. No text before or after. Just the JSON array starting with [ and ending with ].
Each piece object must have these exact fields: id (short random string), type (one of: square_tube round_tube rect_tube pipe angle channel ibeam flat_bar sheet plate), sizeIdx (number 0-10), thkIdx (number 0-8), material (mild_steel or stainless or aluminum), length (number in inches), x (number in inches), y (number in inches), angle (number in degrees 0 is horizontal), upright (boolean), zOffset (number in inches from floor), customW (number for sheet width default 48), customH (number for sheet height default 48), holes (empty array []), note (empty string), weldSymbol (empty string).
For a table with width W depth D height H using 2 inch square tube:
4 legs: type=square_tube sizeIdx=5 thkIdx=1 upright=true length=H zOffset=0, placed at corners x=0,y=0 then x=W,y=0 then x=0,y=D then x=W,y=D
4 rails: type=square_tube upright=false zOffset=H-2, two horizontal length=W at angle=0 centered between leg pairs, two depth-wise length=D at angle=90
1 sheet: type=sheet customW=W customH=D x=W/2 y=D/2 zOffset=H length=W
Never add more than 4 legs. Never add diagonal braces unless asked.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error: ${res.status} ${err}`)
      }

      const data = await res.json()
      let text = data.content?.[0]?.text ?? ''
      setResponse(text)

      // Strip markdown code fences if present
      text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

      const pieces = JSON.parse(text)
      if (!Array.isArray(pieces)) throw new Error('Expected JSON array')

      let added = 0
      for (const p of pieces) {
        addPiece({
          type: p.type ?? 'square_tube',
          sizeIdx: p.sizeIdx ?? 5,
          thkIdx: p.thkIdx ?? 1,
          material: p.material ?? 'mild_steel',
          length: p.length ?? 24,
          x: (p.x ?? 0) + Math.random() * 2,
          y: (p.y ?? 0) + Math.random() * 2,
          angle: p.angle ?? 0,
          upright: p.upright ?? false,
          zOffset: p.zOffset ?? 0,
          customW: p.customW ?? 24,
          customH: p.customH ?? 24,
          holes: p.holes ?? [],
          note: p.note ?? '',
          weldSymbol: p.weldSymbol ?? '',
        })
        added++
      }

      toast.success(`AI added ${added} piece${added !== 1 ? 's' : ''} to drawing`)
      setShowAIModal(false)
    } catch (e) {
      console.error(e)
      toast.error(`AI error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#111827', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, width: 560, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={16} color="#8b5cf6" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>AI Fabrication Assistant</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Describe what you want to build</div>
          </div>
          <button onClick={() => setShowAIModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Examples */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Examples</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXAMPLE_PROMPTS.map(ex => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                style={{ padding: '4px 10px', borderRadius: 14, border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.06)', color: '#a78bfa', fontSize: 11, cursor: 'pointer' }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate() }}
            placeholder="Describe the structure you want to create..."
            style={{
              width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 6, color: '#f1f5f9', padding: '10px 12px', fontSize: 13,
              outline: 'none', resize: 'none', fontFamily: 'inherit',
              minHeight: 100,
            }}
            rows={4}
          />

          {response && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 160, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Response</div>
              <pre style={{ fontSize: 11, color: '#64748b', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{response}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setShowAIModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: loading ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.8)',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, opacity: !prompt.trim() ? 0.5 : 1,
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <Send size={14} />
            )}
            {loading ? 'Generating...' : 'Generate (Ctrl+Enter)'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
