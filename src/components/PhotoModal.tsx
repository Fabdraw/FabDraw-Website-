import React, { useState, useRef } from 'react'
import { X, Camera, Upload, Loader2, Check } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import type { Member } from '../types'

const SYSTEM_PROMPT = `You are a fabrication CAD assistant for FabDraw. Analyze the photo and identify all structural steel or metal members visible. Return ONLY a valid JSON array of Member objects matching this exact shape — no markdown, no code fences, no explanation. Start with [ and end with ].

Each Member object must have EXACTLY these fields:
{
  "type": one of: "square_tube" | "round_tube" | "rect_tube" | "pipe" | "angle" | "channel" | "i_beam" | "flat_bar" | "sheet" | "plate",
  "size": string like "2x2" for square/rect/angle/channel/i_beam, "2" for round/pipe, "1/4x2" for flat_bar,
  "wallThickness": string like "0.125",
  "grade": one of: "mild" | "stainless" | "aluminum",
  "length": number in inches (estimate from photo context),
  "position": { "x": number, "y": number, "z": number },
  "rotation": { "x": 0, "y": number (degrees), "z": 0 },
  "holes": []
}

Estimate sizes and positions from the photo. Place members in a logical 2D plan view layout. If you cannot identify a specific member type or size, make a reasonable estimate. Return at least the primary visible members.`

type ParsedMember = Omit<Member, 'id'>

function mapMember(obj: Record<string, unknown>): ParsedMember {
  const pos = (obj.position ?? {}) as Record<string, unknown>
  const rot = (obj.rotation ?? {}) as Record<string, unknown>
  return {
    type: (obj.type as Member['type']) || 'square_tube',
    size: typeof obj.size === 'string' ? obj.size : '2x2',
    wallThickness: typeof obj.wallThickness === 'string' ? obj.wallThickness : '0.125',
    grade: (['mild', 'stainless', 'aluminum'].includes(obj.grade as string) ? obj.grade as Member['grade'] : 'mild'),
    length: typeof obj.length === 'number' ? obj.length : 24,
    position: {
      x: typeof pos.x === 'number' ? pos.x : 0,
      y: typeof pos.y === 'number' ? pos.y : 0,
      z: typeof pos.z === 'number' ? pos.z : 0,
    },
    rotation: {
      x: typeof rot.x === 'number' ? rot.x : 0,
      y: typeof rot.y === 'number' ? rot.y : 0,
      z: typeof rot.z === 'number' ? rot.z : 0,
    },
    holes: [],
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix — just the base64 data
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PhotoModal() {
  const { project, addMember } = useProjectStore()
  const { members, connections } = project
  const { setShowPhotoModal, setPanZoom } = useUIStore()
  const { push } = useHistoryStore()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState<ParsedMember[]>([])
  const [result, setResult] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setGenerated([])
    setResult('')
    setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleAnalyze = async () => {
    if (!imageFile) return
    const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) { setError('VITE_ANTHROPIC_API_KEY not set. Add it to your .env file.'); return }

    setLoading(true)
    setError('')
    setResult('')
    setGenerated([])

    try {
      const base64 = await fileToBase64(imageFile)
      const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

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
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Analyze this photo and return the Member JSON array.' },
            ],
          }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error ${res.status}: ${err}`)
      }

      const data = await res.json()
      let text: string = data.content?.[0]?.text ?? ''
      text = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim()
      const arr = JSON.parse(text)
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array')
      const parsed = arr.map((obj: unknown) => mapMember(obj as Record<string, unknown>))
      setGenerated(parsed)
      setResult(`Found ${parsed.length} member${parsed.length !== 1 ? 's' : ''} in photo`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleAddToDrawing = () => {
    push({ members, connections })
    for (const m of generated) addMember(m)

    // Auto-fit canvas
    const all = [...members, ...generated.map(m => ({ ...m, id: '' }))]
    if (all.length > 0) {
      const canvas = document.querySelector('canvas')
      const W = canvas?.offsetWidth ?? 800
      const H = canvas?.offsetHeight ?? 600
      const S = 8
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
      for (const m of all) {
        mnX = Math.min(mnX, m.position.x - m.length / 2)
        mnY = Math.min(mnY, m.position.y - 2)
        mxX = Math.max(mxX, m.position.x + m.length / 2)
        mxY = Math.max(mxY, m.position.y + 2)
      }
      const z = Math.max(0.05, Math.min(8, Math.min(W * 0.8 / ((mxX - mnX + 10) * S), H * 0.8 / ((mxY - mnY + 10) * S))))
      setPanZoom(W / 2 - ((mnX + mxX) / 2) * z * S, H / 2 - ((mnY + mxY) / 2) * z * S, z)
    }

    setShowPhotoModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 max-h-[90vh] flex flex-col rounded-xl shadow-2xl" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #2e3350' }}>
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-teal-400" />
            <div>
              <div className="text-base font-semibold text-slate-100">Photo to Drawing</div>
              <div className="text-xs text-slate-500">Upload a photo to extract members</div>
            </div>
          </div>
          <button className="text-slate-500 hover:text-slate-200" onClick={() => setShowPhotoModal(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed rounded-xl cursor-pointer transition-colors"
            style={{ borderColor: '#2e3350', minHeight: 140 }}
            onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#14b8a6')}
            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2e3350')}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center h-36 text-slate-500 gap-2">
                <Upload size={28} />
                <div className="text-sm">Drop an image here or click to browse</div>
                <div className="text-xs text-slate-600">JPG, PNG, WebP, GIF</div>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            onClick={handleAnalyze}
            disabled={!imageFile || loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            {loading ? 'Analyzing photo...' : 'Analyze Photo'}
          </button>

          {result && generated.length > 0 && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: '#0f1117', border: '1px solid #2e3350' }}>
              <div className="text-xs text-teal-400 font-medium">{result}</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {generated.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-slate-600 w-4">{i + 1}</span>
                    <span className="text-slate-300">{m.type.replace(/_/g, ' ')}</span>
                    <span className="text-slate-600">{m.size} × {m.length}"</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-lg transition-colors"
                onClick={handleAddToDrawing}
              >
                <Check size={13} />
                Add {generated.length} Member{generated.length !== 1 ? 's' : ''} to Drawing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
