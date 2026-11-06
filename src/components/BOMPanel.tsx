import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight, totalWeight } from '../lib/weights';

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

const CONNECTION_COLOR: Record<string, string> = {
  weld: '#f97316',
  bolted: '#22c55e',
  flanged: '#a855f7',
}

export default function BOMPanel() {
  const { project } = useProjectStore();
  const { members, connections } = project;
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
    background: '#161a22',
    borderTop: '1px solid #252d3d',
  };

  if (isBOMCollapsed) {
    return (
      <div
        className="flex items-center gap-3 px-3 cursor-pointer"
        style={{ ...headerStyle, height: '32px' }}
        onClick={toggleBOM}
      >
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b96a8' }}>
          Bill of Materials
        </span>
        <span
          className="rounded px-1.5 py-0.5"
          style={{ background: '#1d2231', color: '#8b96a8', fontSize: '10px' }}
        >
          {members.length}
        </span>
        <div className="flex-1" />
        <ChevronUp size={12} style={{ color: '#4c5768' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ ...headerStyle, height: '160px' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 shrink-0 cursor-pointer"
        style={{ height: '32px', borderBottom: '1px solid #252d3d' }}
        onClick={toggleBOM}
      >
        <span style={{ fontSize: '11px', fontWeight: 500, color: '#8b96a8' }}>
          Bill of Materials
        </span>
        <span
          className="rounded px-1.5 py-0.5"
          style={{ background: '#1d2231', color: '#8b96a8', fontSize: '10px' }}
        >
          {members.length}
        </span>
        <div className="flex-1" />
        <span style={{ ...monoStyle, fontSize: '11px', color: '#f97316' }}>
          {formatWeight(tw)}
        </span>
        <ChevronDown size={12} style={{ color: '#4c5768' }} />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left" style={{ ...monoStyle, fontSize: '11px' }}>
          <thead className="sticky top-0" style={{ background: '#161a22' }}>
            <tr>
              {['#','Type','Size','Wall','Grade','Length','Qty','Weight'].map(h => (
                <th
                  key={h}
                  className="px-2 py-1"
                  style={{ fontSize: '10px', color: '#4c5768', fontWeight: 500, fontFamily: 'inherit' }}
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
                ? 'rgba(79,128,255,0.08)'
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
                  <td className="px-2 py-1" style={{ color: '#4c5768' }}>{i + 1}</td>
                  <td className="px-2 py-1" style={{ color: '#8b96a8' }}>{mat.label}</td>
                  <td className="px-2 py-1" style={{ color: '#e2e8f0' }}>{member.size}"</td>
                  <td className="px-2 py-1" style={{ color: '#8b96a8' }}>{member.wallThickness}"</td>
                  <td className="px-2 py-1" style={{ color: '#8b96a8' }}>{member.grade}</td>
                  <td className="px-2 py-1" style={{ color: '#e2e8f0' }}>
                    {Math.floor(member.length / 12)}' {(member.length % 12).toFixed(2).replace(/\.?0+$/, '')}"
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span
                      className="px-1.5 py-0.5 rounded"
                      style={{ background: '#252d3d', color: '#e2e8f0' }}
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
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <td colSpan={7} className="px-2 py-1 font-medium" style={{ color: '#8b96a8' }}>
                  Total
                </td>
                <td className="px-2 py-1 font-medium" style={{ color: '#f97316' }}>
                  {formatWeight(tw)}
                </td>
              </tr>
            )}
            {members.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center" style={{ color: '#4c5768' }}>
                  Add members from the library to start your BOM
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {connections.length > 0 && (
          <table className="w-full text-left border-t" style={{ ...monoStyle, fontSize: '11px', borderColor: '#252d3d' }}>
            <thead className="sticky top-0" style={{ background: '#161a22' }}>
              <tr>
                {['#', 'Type', 'Member A', 'Member B'].map(h => (
                  <th
                    key={h}
                    className="px-2 py-1"
                    style={{ fontSize: '10px', color: '#4c5768', fontWeight: 500, fontFamily: 'inherit' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {connections.map((c, i) => {
                const mA = members.find(m => m.id === c.memberAId)
                const mB = members.find(m => m.id === c.memberBId)
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td className="px-2 py-1" style={{ color: '#4c5768' }}>{i + 1}</td>
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: CONNECTION_COLOR[c.type] }} />
                        <span style={{ color: CONNECTION_COLOR[c.type] }}>{c.type}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1" style={{ color: '#8b96a8' }}>{mA ? `${mA.type.replace(/_/g, ' ')} ${mA.size}"` : '—'}</td>
                    <td className="px-2 py-1" style={{ color: '#8b96a8' }}>{mB ? `${mB.type.replace(/_/g, ' ')} ${mB.size}"` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
