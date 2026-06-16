import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useProjectStore } from '../store/projectStore'
import { exportPDF } from '../lib/pdfExport'

type ViewKey = 'top' | 'front' | 'side' | 'isometric'

const VIEW_OPTIONS: { key: ViewKey; label: string }[] = [
  { key: 'top', label: 'Top View' },
  { key: 'front', label: 'Front View' },
  { key: 'side', label: 'Side View' },
  { key: 'isometric', label: 'Isometric View' },
]

export default function PDFExportModal() {
  const { setShowPDFExportModal } = useUIStore()
  const { project } = useProjectStore()
  const [selected, setSelected] = useState<Set<ViewKey>>(new Set(['top']))

  const toggle = (key: ViewKey) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key) // keep at least one
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleExport = () => {
    const views = VIEW_OPTIONS.map(v => v.key).filter(k => selected.has(k))
    const url = exportPDF(
      project.members,
      project.titleBlock,
      project.name,
      project.dimensions ?? [],
      views,
    )
    window.open(url, '_blank')
    setShowPDFExportModal(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={() => setShowPDFExportModal(false)}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden"
        style={{
          background: '#1a1d27',
          border: '1px solid #2e3350',
          width: 320,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #2e3350' }}>
          <span className="text-sm font-semibold text-slate-100">Export PDF</span>
          <button
            className="flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            onClick={() => setShowPDFExportModal(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-4">Select which views to include in the export:</p>
          <div className="flex flex-col gap-3">
            {VIEW_OPTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="accent-orange-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm text-slate-200 group-hover:text-slate-100 transition-colors">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            className="px-4 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            onClick={() => setShowPDFExportModal(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{ background: '#f97316', color: '#fff' }}
            onClick={handleExport}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
