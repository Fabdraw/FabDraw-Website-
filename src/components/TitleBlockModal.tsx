import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import type { TitleBlock } from '../types';

export default function TitleBlockModal() {
  const { project, updateTitleBlock } = useProjectStore();
  const { setShowTitleBlockModal } = useUIStore();

  const [local, setLocal] = useState<TitleBlock>({ ...project.titleBlock });

  const patch = (key: keyof TitleBlock, value: string) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    updateTitleBlock(local);
    setShowTitleBlockModal(false);
  };

  const field = (label: string, key: keyof TitleBlock, placeholder = '') => (
    <div className="grid grid-cols-5 gap-3 items-center" key={key}>
      <label className="col-span-2 text-xs text-slate-400 text-right">{label}</label>
      <input
        className="col-span-3 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none transition-colors"
        style={{ background: '#21253a', border: '1px solid #2e3350' }}
        onFocus={e => (e.target.style.borderColor = '#f97316')}
        onBlur={e => (e.target.style.borderColor = '#2e3350')}
        value={local[key]}
        placeholder={placeholder}
        onChange={e => patch(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl shadow-2xl" style={{ background: '#1a1d27', border: '1px solid #2e3350' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2e3350' }}>
          <div>
            <div className="text-base font-semibold text-slate-100">Title Block</div>
            <div className="text-xs text-slate-500">Drawing header information — saved to project</div>
          </div>
          <button className="text-slate-500 hover:text-slate-200 transition-colors" onClick={() => setShowTitleBlockModal(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Company</div>
          {field('Company Name', 'company', 'Your Company')}
          {field('Address', 'address', '123 Main St')}
          {field('Phone', 'phone', '(555) 000-0000')}
          {field('Website', 'web', 'www.example.com')}

          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">Project</div>
          {field('Project Name', 'project', 'Project Name')}
          {field('Description', 'description', 'Brief description')}

          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">Drawing Info</div>
          {field('Drawn By', 'drawnBy', 'Name')}
          {field('Checked By', 'checkedBy', 'Name')}
          {field('Date', 'date', new Date().toLocaleDateString())}
          {field('Scale', 'scale', '1:1')}
          {field('DWG No', 'dwgNo', 'DWG-001')}
          {field('Revision', 'revision', 'A')}
          {field('Sheet', 'sheet', '1 of 1')}
          {field('Notes', 'notes', '')}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid #2e3350' }}>
          <button
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => setShowTitleBlockModal(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-white text-sm font-semibold rounded transition-colors"
            style={{ background: '#f97316' }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#ea6c0a')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f97316')}
            onClick={handleSave}
          >
            Save to Project
          </button>
        </div>
      </div>
    </div>
  );
}
