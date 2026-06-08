import React from 'react'
import { X } from 'lucide-react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'

export default function TitleBlockModal() {
  const { project, updateTitleBlock } = useProjectStore()
  const { setShowTitleBlockModal } = useUIStore()
  const tb = project.titleBlock

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4, color: '#f1f5f9', padding: '7px 10px', fontSize: 13, outline: 'none',
  }
  const labelStyle: React.CSSProperties = { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' }

  function field(label: string, key: keyof typeof tb, placeholder = '') {
    return (
      <div>
        <label style={labelStyle}>{label}</label>
        <input
          type="text"
          value={tb[key]}
          onChange={e => updateTitleBlock({ [key]: e.target.value })}
          style={inputStyle}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 540, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Title Block</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Drawing metadata and company info</div>
          </div>
          <button onClick={() => setShowTitleBlockModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('Company Name', 'company', 'FabDraw Engineering')}
            {field('Phone', 'phone', '+1 (555) 000-0000')}
            {field('Address', 'address', '123 Main St, City, ST 12345')}
            {field('Website', 'web', 'www.company.com')}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Project</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('Project Name', 'project', 'New Project')}
            {field('Drawing Number', 'dwgNo', '001')}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={tb.description}
                onChange={e => updateTitleBlock({ description: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                rows={2}
                placeholder="Brief description of the drawing..."
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Approval</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('Drawn By', 'drawnBy', 'Engineer Name')}
            {field('Checked By', 'checkedBy', 'Checker Name')}
            {field('Date', 'date', new Date().toLocaleDateString())}
            {field('Scale', 'scale', 'NTS')}
            {field('Revision', 'revision', 'A')}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowTitleBlockModal(false)}
            style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
