import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { useProjectStore } from '../store/projectStore'
import { exportPDFFromImages } from '../lib/pdfExport'
import type { Canvas3DHandle } from './Canvas3D'

interface Props {
  canvas3dRef: React.RefObject<Canvas3DHandle | null>
}

export default function PDFExportModal({ canvas3dRef }: Props) {
  const { setShowPDFExportModal } = useUIStore()
  const { project } = useProjectStore()
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (project.members.length === 0) {
      alert('No members to export. Add some members first.')
      return
    }
    setLoading(true)
    try {
      const capturer = canvas3dRef.current
      if (!capturer) throw new Error('3D renderer not ready')
      const views = await capturer.captureViews()
      const url = exportPDFFromImages(views, project.members, project.titleBlock, project.name)
      window.open(url, '_blank')
      setShowPDFExportModal(false)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={() => !loading && setShowPDFExportModal(false)}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden"
        style={{ background: '#1a1d27', border: '1px solid #2e3350', width: 320 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #2e3350' }}>
          <span className="text-sm font-semibold text-slate-100">Export PDF</span>
          <button
            className="flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            onClick={() => !loading && setShowPDFExportModal(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-xs text-slate-400 mb-1">
            Exports a letter landscape PDF with 4 views:
          </p>
          <ul className="text-xs text-slate-500 space-y-0.5 mb-4 ml-3">
            <li>• Top View (orthographic)</li>
            <li>• Front View (orthographic)</li>
            <li>• Side View (orthographic)</li>
            <li>• Isometric View (perspective)</li>
          </ul>
          <p className="text-xs text-slate-500">
            Views are captured directly from the 3D renderer.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-4">
          <button
            className="px-4 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            onClick={() => !loading && setShowPDFExportModal(false)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-2"
            style={{ background: loading ? '#7c3a1a' : '#f97316', color: '#fff' }}
            onClick={handleExport}
            disabled={loading}
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Capturing…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
