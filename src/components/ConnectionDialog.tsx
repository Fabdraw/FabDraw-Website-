import React from 'react'
import { X } from 'lucide-react'

interface Props {
  onSelect: (type: 'weld' | 'bolted' | 'flanged') => void
  onCancel: () => void
}

const OPTIONS: { type: 'weld' | 'bolted' | 'flanged'; label: string; color: string; desc: string }[] = [
  { type: 'weld', label: 'Weld', color: '#f97316', desc: 'Fillet or butt weld joint' },
  { type: 'bolted', label: 'Bolted', color: '#22c55e', desc: 'Bolted flange or plate connection' },
  { type: 'flanged', label: 'Flanged', color: '#a855f7', desc: 'Flanged pipe or structural connection' },
]

export default function ConnectionDialog({ onSelect, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-72 rounded-xl shadow-2xl"
        style={{ background: '#1a1d27', border: '1px solid #2e3350' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid #2e3350' }}
        >
          <span className="text-sm font-semibold text-slate-100">Connection Type</span>
          <button className="text-slate-500 hover:text-slate-200" onClick={onCancel}>
            <X size={15} />
          </button>
        </div>
        <div className="p-3 space-y-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.type}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={{ background: '#21253a', border: '1px solid #2e3350' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = opt.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2e3350')}
              onClick={() => onSelect(opt.type)}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: opt.color }} />
              <div>
                <div className="text-sm font-medium text-slate-200">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
