import React, { useState, useRef } from 'react'
import { X, Camera, Upload, Image } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { toast } from 'sonner'

export default function PhotoModal() {
  const { addPiece } = useProjectStore()
  const { setShowPhotoModal } = useUIStore()
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!image) return
    setLoading(true)
    setResult('')

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      toast.error('VITE_ANTHROPIC_API_KEY not set')
      setLoading(false)
      return
    }

    try {
      const base64 = image.split(',')[1]
      const mediaType = image.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

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
          system: `You are a metal fabrication expert analyzing images of metal structures or fabrication drawings.
Identify the metal pieces and their approximate dimensions, then return a JSON array of piece objects for FabDraw.

Each piece:
- type: 'square_tube' | 'round_tube' | 'rect_tube' | 'pipe' | 'angle' | 'channel' | 'ibeam' | 'flat_bar' | 'sheet' | 'plate'
- sizeIdx: 0-8 (rough size estimate)
- thkIdx: 0-6 (rough wall estimate)
- material: 'mild_steel' | 'stainless' | 'aluminum'
- length: estimated length in inches
- x, y: position in world inches
- angle: rotation degrees
- upright: false
- zOffset: 0
- customW: 24
- customH: 24
- holes: []
- note: what you see
- weldSymbol: ''

Return ONLY a JSON array, no markdown, no explanation.`,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Analyze this image and generate FabDraw pieces for the metal structure shown.' },
              ],
            },
          ],
        }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const data = await res.json()
      let text = data.content?.[0]?.text ?? ''
      setResult(text)
      text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()

      const pieces = JSON.parse(text)
      if (!Array.isArray(pieces)) throw new Error('Expected array')

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
          upright: false,
          zOffset: 0,
          customW: p.customW ?? 24,
          customH: p.customH ?? 24,
          holes: [],
          bendLines: [],
          note: p.note ?? '',
          weldSymbol: '',
        })
        added++
      }

      toast.success(`Photo analysis added ${added} piece${added !== 1 ? 's' : ''}`)
      setShowPhotoModal(false)
    } catch (e) {
      toast.error(`Analysis failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#111827', border: '1px solid rgba(20,184,166,0.3)', borderRadius: 10, width: 500, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(20,184,166,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Camera size={16} color="#14b8a6" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Photo to Drawing</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Upload a photo of a metal structure</div>
          </div>
          <button onClick={() => setShowPhotoModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${image ? 'rgba(20,184,166,0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8, padding: 24,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', transition: 'border-color 200ms', background: 'rgba(0,0,0,0.2)',
            }}
          >
            {image ? (
              <img src={image} alt="Upload preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 6 }} />
            ) : (
              <>
                <Image size={32} color="#334155" />
                <div style={{ color: '#64748b', fontSize: 13 }}>Click to upload photo</div>
                <div style={{ color: '#334155', fontSize: 11 }}>PNG, JPG, GIF, WEBP</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

          {image && (
            <button
              onClick={() => setImage(null)}
              style={{ padding: '6px 0', borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}
            >
              Remove image
            </button>
          )}

          {result && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', maxHeight: 120, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Analysis</div>
              <pre style={{ fontSize: 10, color: '#64748b', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{result}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={() => setShowPhotoModal(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!image || loading}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none',
              background: !image || loading ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.8)',
              color: 'white', fontSize: 13, fontWeight: 600, cursor: !image || loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? (
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <Camera size={14} />
            )}
            {loading ? 'Analyzing...' : 'Analyze Photo'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
