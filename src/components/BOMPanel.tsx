import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight, totalWeight } from '../lib/weights';

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

export default function BOMPanel() {
  const { project } = useProjectStore();
  const { members } = project;
  const { isBOMCollapsed, toggleBOM, selectedIds, setSelectedIds } = useUIStore();

  const tw = useMemo(() => totalWeight(members), [members]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; totalWeight: number; member: typeof members[0]; ids: string[] }>();
    for (const m of members) {
      const key = `${m.type}|${m.size}|${m.wallThickness}|${m.grade}|${Math.round(m.length * 100)}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.totalWeight += calcWeight(m);
        existing.ids.push(m.id);
      } else {
        map.set(key, { count: 1, totalWeight: calcWeight(m), member: m, ids: [m.id] });
      }
    }
    return Array.from(map.values());
  }, [members]);

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
          {members.length}
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
          {members.length}
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
              {['#','TYPE','SIZE','WALL','GRADE','LENGTH','QTY','WEIGHT'].map(h => (
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
            {grouped.map(({ count, totalWeight: tw2, member, ids }, i) => {
              const mat = MATERIALS[member.type];
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
                  <td className="px-2 py-1" style={{ color: '#f1f5f9' }}>{member.size}"</td>
                  <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{member.wallThickness}"</td>
                  <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{member.grade}</td>
                  <td className="px-2 py-1" style={{ color: '#f1f5f9' }}>
                    {Math.floor(member.length / 12)}' {(member.length % 12).toFixed(2).replace(/\.?0+$/, '')}"
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
            {members.length > 0 && (
              <tr style={{ background: 'rgba(249,115,22,0.08)' }}>
                <td colSpan={7} className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                  TOTAL
                </td>
                <td className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                  {formatWeight(tw)}
                </td>
              </tr>
            )}
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center" style={{ color: '#475569' }}>
                  Add members from the Library to start your BOM
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
