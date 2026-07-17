import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight, totalWeight } from '../lib/weights';
import { flatLength } from '../lib/bendEngine';
import type { Member, MemberType } from '../types';

const monoStyle = { fontFamily: "'JetBrains Mono', monospace" };

const CONNECTION_COLOR: Record<string, string> = {
  weld: '#f97316',
  bolted: '#22c55e',
  flanged: '#a855f7',
}

function fmtLen(inches: number): string {
  const ft = Math.floor(inches / 12)
  const rem = +(inches % 12).toFixed(4)
  if (ft === 0) return `${rem}"`
  if (rem === 0) return `${ft}'`
  return `${ft}' ${rem}"`
}

// ─── Cut List ─────────────────────────────────────────────────────────────────

interface CutGroup {
  key: string
  label: string
  cuts: { length: number; qty: number; ids: string[] }[]
  totalLength: number
}

function buildCutList(members: Member[]): CutGroup[] {
  // Group by grade|type|size|wall — the material spec a fabricator orders as a stick
  const groupMap = new Map<string, { label: string; lengthMap: Map<number, { qty: number; ids: string[] }> }>()

  for (const m of members) {
    const gk = `${m.grade}|${m.type}|${m.size}|${m.wallThickness}`
    const mat = MATERIALS[m.type as MemberType]
    const gradeLabel = m.grade.charAt(0).toUpperCase() + m.grade.slice(1)
    const label = `${gradeLabel} ${mat.label} · ${m.size}" · ${m.wallThickness}w`
    if (!groupMap.has(gk)) groupMap.set(gk, { label, lengthMap: new Map() })
    const { lengthMap } = groupMap.get(gk)!
    // Use flat length for bent parts; round to 4 decimal places to avoid floating-point mismatches
    const cutLen = flatLength(m)
    const lenKey = Math.round(cutLen * 10000) / 10000
    const existing = lengthMap.get(lenKey)
    if (existing) { existing.qty++; existing.ids.push(m.id) }
    else lengthMap.set(lenKey, { qty: 1, ids: [m.id] })
  }

  return Array.from(groupMap.entries()).map(([key, { label, lengthMap }]) => {
    const cuts = Array.from(lengthMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([length, { qty, ids }]) => ({ length, qty, ids }))
    const totalLength = cuts.reduce((s, c) => s + c.length * c.qty, 0)
    return { key, label, cuts, totalLength }
  })
}

// ─── BOM view ─────────────────────────────────────────────────────────────────

export default function BOMPanel() {
  const { project } = useProjectStore();
  const { members, connections } = project;
  const { isBOMCollapsed, toggleBOM, selectedIds, setSelectedIds } = useUIStore();
  const [view, setView] = useState<'bom' | 'cutlist'>('bom')

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

  const cutList = useMemo(() => buildCutList(members), [members])

  const headerStyle: React.CSSProperties = {
    background: '#1a1d27',
    borderTop: '1px solid #2e3350',
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
        className="flex items-center gap-3 px-3 shrink-0"
        style={{ height: '32px', borderBottom: '1px solid #2e3350' }}
      >
        <span
          className="cursor-pointer"
          style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#f97316' }}
          onClick={toggleBOM}
        >
          BILL OF MATERIALS
        </span>
        <span
          className="rounded-full px-2"
          style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', fontSize: '11px' }}
        >
          {members.length}
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #2e3350', borderRadius: 4, overflow: 'hidden' }}>
          {(['bom', 'cutlist'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: 9, padding: '2px 7px', border: 'none', cursor: 'pointer',
                background: view === v ? 'rgba(249,115,22,0.15)' : 'transparent',
                color: view === v ? '#f97316' : '#475569',
                fontWeight: view === v ? 700 : 400,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {v === 'bom' ? 'BOM' : 'Cut List'}
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <span style={{ ...monoStyle, fontSize: '11px', color: '#f97316' }}>
          {formatWeight(tw)}
        </span>
        <ChevronDown size={12} style={{ color: '#475569', cursor: 'pointer' }} onClick={toggleBOM} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'bom' ? (
          <table className="w-full text-left" style={{ ...monoStyle, fontSize: '11px' }}>
            <thead className="sticky top-0" style={{ background: '#1a1d27' }}>
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
                      {member.bends?.length
                        ? <><span>{fmtLen(flatLength(member))}</span><span style={{ color: '#475569', marginLeft: 3 }}>flat</span></>
                        : fmtLen(member.length)}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{ background: '#2e3350', color: '#f1f5f9' }}
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
        ) : (
          /* Cut List */
          <div style={{ ...monoStyle, fontSize: '11px' }}>
            {cutList.length === 0 ? (
              <div className="px-3 py-4 text-center" style={{ color: '#475569' }}>
                Add members from the Library to generate a Cut List
              </div>
            ) : (
              cutList.map(({ key, label, cuts, totalLength }) => (
                <div key={key} style={{ borderBottom: '1px solid #2e3350' }}>
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-2 py-1 sticky top-0"
                    style={{ background: '#1a1d27', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#f97316' }}
                  >
                    <span>{label}</span>
                    <span style={{ color: '#94a3b8' }}>
                      {fmtLen(totalLength)} total
                    </span>
                  </div>
                  {/* Cut rows */}
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ background: '#181b26' }}>
                        {['#', 'CUT LENGTH', 'QTY', 'GROUP LENGTH'].map(h => (
                          <th key={h} className="px-2 py-0.5" style={{ fontSize: '9px', color: '#475569', fontWeight: 400, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cuts.map(({ length, qty, ids }, ci) => {
                        const isSelected = ids.some(id => selectedIds.includes(id))
                        return (
                          <tr
                            key={ci}
                            className="cursor-pointer"
                            style={{ background: isSelected ? 'rgba(249,115,22,0.1)' : ci % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                            onClick={() => setSelectedIds(ids)}
                          >
                            <td className="px-2 py-0.5" style={{ color: '#475569' }}>{ci + 1}</td>
                            <td className="px-2 py-0.5" style={{ color: '#f1f5f9' }}>{fmtLen(length)}</td>
                            <td className="px-2 py-0.5">
                              <span className="px-1.5 py-0.5 rounded" style={{ background: '#2e3350', color: '#f1f5f9' }}>
                                ×{qty}
                              </span>
                            </td>
                            <td className="px-2 py-0.5" style={{ color: '#94a3b8' }}>{fmtLen(length * qty)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}

        {/* Connections table — shown in BOM view only */}
        {view === 'bom' && connections.length > 0 && (
          <table className="w-full text-left border-t" style={{ ...monoStyle, fontSize: '11px', borderColor: '#2e3350' }}>
            <thead className="sticky top-0" style={{ background: '#1a1d27' }}>
              <tr>
                {['#', 'TYPE', 'MEMBER A', 'MEMBER B'].map(h => (
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
              {connections.map((c, i) => {
                const mA = members.find(m => m.id === c.memberAId)
                const mB = members.find(m => m.id === c.memberBId)
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td className="px-2 py-1" style={{ color: '#475569' }}>{i + 1}</td>
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: CONNECTION_COLOR[c.type] }} />
                        <span style={{ color: CONNECTION_COLOR[c.type] }}>{c.type}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{mA ? `${mA.type.replace(/_/g, ' ')} ${mA.size}"` : '—'}</td>
                    <td className="px-2 py-1" style={{ color: '#94a3b8' }}>{mB ? `${mB.type.replace(/_/g, ' ')} ${mB.size}"` : '—'}</td>
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
