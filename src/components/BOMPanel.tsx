import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight, totalWeight } from '../lib/weights';

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

export default function BOMPanel() {
  const { pieces } = useProjectStore();
  const { isBOMCollapsed, toggleBOM, selectedIds, setSelectedIds } = useUIStore();

  const tw = useMemo(() => totalWeight(pieces), [pieces]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; totalWeight: number; piece: typeof pieces[0]; ids: string[] }>();
    for (const p of pieces) {
      const key = `${p.type}|${p.width}|${p.height}|${p.wall}|${p.grade}|${Math.round(p.length * 100)}`;
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

  const headerStyle: React.CSSProperties = {
    background: '#161b25',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  };

  if (isBOMCollapsed) {
    return (
      <div
        className="flex items-center gap-3 px-3 cursor-pointer"
        style={{ ...headerStyle, height: '32px' }}
        onClick={toggleBOM}
      >
        <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#f97316' }}>
          BILL OF MATERIALS
        </span>
        <span
          className="rounded-full px-2"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: '11px' }}
        >
          {pieces.length}
        </span>
        <div className="flex-1" />
        <ChevronUp size={12} style={{ color: '#475569' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ ...headerStyle, height: '160px' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 shrink-0 cursor-pointer"
        style={{ height: '32px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        onClick={toggleBOM}
      >
        <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#f97316' }}>
          BILL OF MATERIALS
        </span>
        <span
          className="rounded-full px-2"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: '11px' }}
        >
          {pieces.length}
        </span>
        <div className="flex-1" />
        <span style={{ ...monoStyle, fontSize: '11px', color: '#f97316' }}>
          {formatWeight(tw)}
        </span>
        <ChevronDown size={12} style={{ color: '#475569' }} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left" style={{ ...monoStyle, fontSize: '11px' }}>
          <thead className="sticky top-0" style={{ background: '#161b25' }}>
            <tr>
              {['#','TYPE','SIZE','WALL','MATERIAL','LENGTHS','QTY','WEIGHT'].map(h => (
                <th
                  key={h}
                  className="px-2 py-1"
                  style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569', fontWeight: 400 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ count, totalWeight: tw2, piece, ids }, i) => {
              const mat = MATERIALS[piece.type];
              const isSelected = ids.some(id => selectedIds.includes(id));
              const rowBg = isSelected
                ? 'rgba(249,115,22,0.1)'
                : i % 2 === 0
                ? 'rgba(255,255,255,0.02)'
                : 'transparent';
              return (
                <tr
                  key={i}
                  className="cursor-pointer"
                  style={{ background: rowBg }}
                  onClick={() => setSelectedIds(ids)}
                >
                  <td className="px-2 py-1" style={{ color: '#475569' }}>{i + 1}</td>
                  <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{mat.label}</td>
                  <td className="px-2 py-1" style={{ color: '#f1f5f9' }}>{piece.width}"×{piece.height}"</td>
                  <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{piece.wall}"</td>
                  <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{piece.grade.replace(/_/g, ' ')}</td>
                  <td className="px-2 py-1" style={{ color: '#f1f5f9' }}>
                    {Math.floor(piece.length / 12)}' {(piece.length % 12).toFixed(2).replace(/\.?0+$/, '')}"
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.06)', color: '#f1f5f9' }}
                    >
                      {count}
                    </span>
                  </td>
                  <td className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                    {formatWeight(tw2)}
                  </td>
                </tr>
              );
            })}
            {pieces.length > 0 && (
              <tr style={{ background: 'rgba(249,115,22,0.08)' }}>
                <td colSpan={7} className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                  TOTAL
                </td>
                <td className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                  {formatWeight(tw)}
                </td>
              </tr>
            )}
            {pieces.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center" style={{ color: '#475569' }}>
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
