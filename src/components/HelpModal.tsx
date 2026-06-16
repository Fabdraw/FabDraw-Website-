import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useUIStore } from '../store/uiStore'

const TABS = ['Tools', 'Shortcuts', 'Tips'] as const
type Tab = typeof TABS[number]

const TOOLS = [
  { icon: '↖', name: 'Select', desc: 'Click to select, Shift+click adds to selection, drag to move, right-click drag for selection box.' },
  { icon: '↔', name: 'Dimension (D)', desc: 'Click start point then end point — snaps to member endpoints, shows arrowhead line with label. Click to select, Delete to remove.' },
  { icon: '⊕', name: 'Connect (C)', desc: 'Click member A then member B, choose Weld/Bolted/Flanged. Shows colored dot at joint in 2D and 3D.' },
  { icon: '⬡', name: 'Templates', desc: 'Pick a template, set Width/Depth/Height, click Generate to build it with AI.' },
  { icon: '✨', name: 'AI Assistant', desc: 'Describe a structure to build, or adjustments to make ("make it 6 inches taller"). Mic button for voice input.' },
  { icon: '📷', name: 'Photo to Drawing', desc: 'Upload a photo of a structure — AI analyzes and adds members to canvas.' },
  { icon: '💾', name: 'Save', desc: 'Downloads project as .fabdraw.json file.' },
  { icon: '📂', name: 'Load', desc: 'Opens .fabdraw.json and restores the full project.' },
  { icon: '📄', name: 'Export PDF', desc: 'Choose views (Top/Front/Side/Isometric), exports multi-view engineering drawing.' },
  { icon: '🏷', name: 'Title Block', desc: 'Edit project name, company, drawn by, revision, sheet number.' },
  { icon: '⬛', name: '2D/3D Toggle', desc: 'Switch between 2D plan view and 3D perspective view.' },
]

const SHORTCUTS = [
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Shift+Z', 'Redo'],
  ['Ctrl+A', 'Select all'],
  ['Ctrl+C', 'Copy'],
  ['Ctrl+V', 'Paste'],
  ['Ctrl+D', 'Duplicate'],
  ['Ctrl+G', 'Group selected'],
  ['Ctrl+Shift+G', 'Ungroup'],
  ['Delete', 'Delete selected'],
  ['Escape', 'Deselect / cancel'],
  ['F', 'Zoom to fit'],
  ['Space+drag', 'Pan'],
  ['Scroll', 'Zoom'],
  ['Middle click', 'Pan'],
  ['Right drag', 'Selection rect'],
  ['Shift+click', 'Add/remove from selection'],
  ['1', 'Select tool'],
  ['2', 'Dimension tool'],
  ['3', 'Connect tool'],
]

const TIPS = [
  'To make an upright post: add a member then click "Upright" in the Properties panel.',
  'To select multiple members: right-click drag on empty canvas to draw a selection box.',
  'Snapping: drag slowly near another member endpoint and it snaps automatically.',
  'Adjust AI drawing: open AI Assistant and say "make it taller" or "add cross braces".',
  'Alignment guides: drag a member and look for red/blue dashed lines showing alignment.',
  'Groups move as one unit — right-click to group/ungroup.',
]

export default function HelpModal() {
  const { setShowHelpModal } = useUIStore()
  const [tab, setTab] = useState<Tab>('Tools')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={() => setShowHelpModal(false)}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden"
        style={{
          background: '#1a1d27',
          border: '1px solid #2e3350',
          width: 560,
          maxHeight: '80vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '1px solid #2e3350' }}>
          <span className="text-sm font-semibold text-slate-100">Help</span>
          <button
            className="flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            onClick={() => setShowHelpModal(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 px-4 pt-3 gap-1" style={{ borderBottom: '1px solid #2e3350' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 text-xs font-medium rounded-t transition-colors"
              style={{
                background: tab === t ? '#21253a' : 'transparent',
                color: tab === t ? '#f97316' : '#64748b',
                borderBottom: tab === t ? '2px solid #f97316' : '2px solid transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'Tools' && (
            <div className="flex flex-col gap-3">
              {TOOLS.map(tool => (
                <div key={tool.name} className="flex gap-3">
                  <div
                    className="flex items-center justify-center shrink-0 rounded text-base"
                    style={{ width: 32, height: 32, background: '#21253a', border: '1px solid #2e3350' }}
                  >
                    {tool.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{tool.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Shortcuts' && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {SHORTCUTS.map(([key, action]) => (
                <div key={key} className="flex items-center gap-2">
                  <kbd
                    className="text-xs px-1.5 py-0.5 rounded font-mono shrink-0"
                    style={{ background: '#21253a', border: '1px solid #2e3350', color: '#f97316' }}
                  >
                    {key}
                  </kbd>
                  <span className="text-xs text-slate-400">{action}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'Tips' && (
            <ul className="flex flex-col gap-3">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                  <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
