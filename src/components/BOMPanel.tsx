import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight, totalWeight } from '../lib/weights';

export default function BOMPanel() {
  const { pieces } = useProjectStore();
  const { isBOMCollapsed, toggleBOM, selectedIds, setSelectedIds } = useUIStore();

  const tw = useMemo(() => totalWeight(pieces), [pieces]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; totalWeight: number; piece: typeof pieces[0]; ids: string[] }>();
    for (const p of pieces) {
      const key = `${p.type}|${p.width}x${p.height}|${p.wall}|${p.length}|${p.grade}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.totalWeight += calcWeight(p);
        existing.ids.push(p.id);
      } else {
        map.set(key, { count: 1, totalWeight: calcWeight(p), piece: p, ids: [p.id] });
      }
    }
    return Array.from(map.values());
  }, [pieces]);

  if (isBOMCollapsed) {
    return (
      <div className="flex items-center gap-3 px-4 py-1.5 bg-[#1a1d2e] border-t border-slate-800 cursor-pointer" onClick={toggleBOM}>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">BOM</span>
        <span className="text-xs text-slate-500">{pieces.length} pieces • {formatWeight(tw)}</span>
        <ChevronUp size={12} className="text-slate-600" />
      </div>
    );
  }

  return (
    <div className="bg-[#1a1d2e] border-t border-slate-800 h-44 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-800 shrink-0 cursor-pointer" onClick={toggleBOM}>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Bill of Materials</span>
        <span className="text-xs text-slate-500">{pieces.length} piece{pieces.length !== 1 ? 's' : ''}</span>
        <span className="text-xs font-mono text-yellow-400 ml-auto">Total: {formatWeight(tw)}</span>
        <ChevronDown size={12} className="text-slate-600" />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs text-left">
          <thead className="sticky top-0 bg-[#1a1d2e] border-b border-slate-800">
            <tr>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider w-8">#</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Type</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Grade</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Size</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Wall</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Length</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider w-12">Qty</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Unit Wt</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Total Wt</th>
              <th className="px-3 py-1.5 text-slate-500 font-semibold uppercase tracking-wider">Holes</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ count, totalWeight: tw2, piece, ids }, i) => {
              const mat = MATERIALS[piece.type];
              const isSelected = ids.some(id => selectedIds.includes(id));
              return (
                <tr
                  key={i}
                  className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/10' : 'hover:bg-slate-800/30'
                  }`}
                  onClick={() => setSelectedIds(ids)}
                >
                  <td className="px-3 py-1 text-slate-500 font-mono">{i + 1}</td>
                  <td className="px-3 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: mat.color }} />
                      <span className="text-slate-200">{mat.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1 text-slate-400">{piece.grade.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-1 text-slate-300 font-mono">{piece.width}" × {piece.height}"</td>
                  <td className="px-3 py-1 text-slate-400 font-mono">{piece.wall}"</td>
                  <td className="px-3 py-1 text-slate-300 font-mono">
                    {Math.floor(piece.length / 12)}' {(piece.length % 12).toFixed(2).replace(/\.?0+$/, '')}"
                  </td>
                  <td className="px-3 py-1 text-center">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200 font-semibold">{count}</span>
                  </td>
                  <td className="px-3 py-1 text-slate-400 font-mono">{formatWeight(tw2 / count)}</td>
                  <td className="px-3 py-1 font-mono text-yellow-400">{formatWeight(tw2)}</td>
                  <td className="px-3 py-1 text-slate-500">{piece.holes?.length || 0}</td>
                </tr>
              );
            })}
            {pieces.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-600">
                  Add pieces from the Library to start your BOM
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
