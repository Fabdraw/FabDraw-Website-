import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';

interface TitleBlock {
  company: string;
  address: string;
  phone: string;
  web: string;
  project: string;
  description: string;
  drawnBy: string;
  checkedBy: string;
  date: string;
  scale: string;
  dwgNo: string;
  revision: string;
}

const DEFAULT_TITLE_BLOCK: TitleBlock = {
  company: '',
  address: '',
  phone: '',
  web: '',
  project: '',
  description: '',
  drawnBy: '',
  checkedBy: '',
  date: new Date().toLocaleDateString(),
  scale: '1:1',
  dwgNo: 'DWG-001',
  revision: 'A',
};

export default function TitleBlockModal() {
  const { project } = useProjectStore();
  const { setShowTitleBlockModal } = useUIStore();

  // Title block is stored as part of project name for now; use local state
  const [titleBlock, setTitleBlock] = useState<TitleBlock>(DEFAULT_TITLE_BLOCK);

  const updateTitleBlock = (patch: Partial<TitleBlock>) => {
    setTitleBlock(prev => ({ ...prev, ...patch }));
  };

  const field = (label: string, key: keyof TitleBlock, placeholder = '') => (
    <div className="grid grid-cols-5 gap-3 items-center">
      <label className="col-span-2 text-xs text-slate-400 text-right">{label}</label>
      <input
        className="col-span-3 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-orange-500"
        value={titleBlock[key]}
        placeholder={placeholder}
        onChange={e => updateTitleBlock({ [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1d2e] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <div className="text-base font-semibold text-slate-100">Title Block</div>
            <div className="text-xs text-slate-500">Drawing header information</div>
          </div>
          <button
            className="text-slate-500 hover:text-slate-200 transition-colors"
            onClick={() => setShowTitleBlockModal(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Company</div>
          {field('Company Name', 'company', 'Your Company')}
          {field('Address', 'address', '123 Main St')}
          {field('Phone', 'phone', '(555) 000-0000')}
          {field('Website', 'web', 'www.example.com')}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">Project</div>
          {field('Project Name', 'project', 'Project Name')}
          {field('Description', 'description', 'Brief description')}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4 mb-2">Drawing Info</div>
          {field('Drawn By', 'drawnBy', 'Name')}
          {field('Checked By', 'checkedBy', 'Name')}
          {field('Date', 'date', new Date().toLocaleDateString())}
          {field('Scale', 'scale', '1:1')}
          {field('DWG No', 'dwgNo', 'DWG-001')}
          {field('Revision', 'revision', 'A')}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => setShowTitleBlockModal(false)}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded transition-colors"
            onClick={() => setShowTitleBlockModal(false)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
