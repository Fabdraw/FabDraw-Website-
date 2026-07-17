import React from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import { MATERIALS, GRADE_MATERIALS, resolveWallThickness } from '../lib/materials';
import { calcWeight, formatWeight } from '../lib/weights';
import { flatPattern } from '../lib/bendEngine';
import type { Grade, Hole, Bend } from '../types';
import { inputCls, labelCls } from '../styles/tokens';

const GRADE_LABELS: Record<Grade, string> = {
  mild: 'Mild Steel',
  stainless: 'Stainless',
  aluminum: 'Aluminum',
};


export default function PropertiesPanel() {
  const { project, fabDocument, updateMember, deleteMembers, deleteConnection } = useProjectStore();
  const { members, connections, dimensions, groupNames } = project;
  const { selectedIds, selectedConnectionId, activeRightTab, setActiveRightTab, setSelectedIds } = useUIStore();
  const historyStore = useHistoryStore();

  const selectedMember = selectedIds.length === 1 ? members.find(m => m.id === selectedIds[0]) : null;
  const selectedConn = selectedConnectionId ? connections.find(c => c.id === selectedConnectionId) : null;

  const update = (field: string, value: unknown) => {
    if (!selectedMember) return;
    updateMember(selectedMember.id, { [field]: value } as any);
  };

  const numInput = (label: string, field: string, value: number, step = 0.0625, min = 0) => (
    <div className="space-y-0.5">
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        className={inputCls}
        value={value}
        step={step}
        min={min}
        onChange={e => update(field, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const panelStyle = {
    width: isMobile ? '100%' : '240px',
    background: '#1a1d27',
    borderLeft: isMobile ? 'none' : '1px solid #2e3350',
  };

  if (selectedIds.length === 0 && !selectedConn) {
    return (
      <div className="shrink-0 flex items-center justify-center" style={panelStyle}>
        <div className="text-center p-4">
          <div className="text-3xl mb-2" style={{ color: '#2d3748' }}>◻</div>
          <div style={{ color: '#475569', fontSize: '12px' }}>Select a member</div>
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="shrink-0 p-3" style={panelStyle}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569', marginBottom: '12px' }}>
          {selectedIds.length} members selected
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs panel-item"
          style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
          onClick={() => {
            historyStore.push(fabDocument);
            deleteMembers(selectedIds);
            setSelectedIds([]);
          }}
        >
          <Trash2 size={13} />
          Delete {selectedIds.length} Members
        </button>
      </div>
    );
  }

  if (selectedConn) {
    const mA = members.find(m => m.id === selectedConn.memberAId);
    const mB = members.find(m => m.id === selectedConn.memberBId);
    return (
      <div className="shrink-0 p-3 space-y-2" style={panelStyle}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Connection</div>
        <div className="rounded-md p-2 text-xs" style={{ background: '#21253a', color: '#94a3b8' }}>
          <div style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>MEMBER A</div>
          <div>{mA ? MATERIALS[mA.type].label : '—'}</div>
        </div>
        <div className="rounded-md p-2 text-xs" style={{ background: '#21253a', color: '#94a3b8' }}>
          <div style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>MEMBER B</div>
          <div>{mB ? MATERIALS[mB.type].label : '—'}</div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Type: {selectedConn.type}</div>
        <button
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs panel-item"
          style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
          onClick={() => deleteConnection(selectedConn.id)}
        >
          <Trash2 size={12} /> Remove Connection
        </button>
      </div>
    );
  }

  if (!selectedMember) return null;
  const mat = MATERIALS[selectedMember.type];
  const weight = calcWeight(selectedMember);

  const handleAddHole = () => {
    const newHole: Hole = {
      id: crypto.randomUUID(),
      type: 'circle',
      diameter: 0.5,
      positionAlongMember: selectedMember.length / 2,
      face: 'top',
    };
    update('holes', [...(selectedMember.holes || []), newHole]);
  };

  const handleUpdateHole = (holeId: string, field: keyof Hole, value: unknown) => {
    const updated = (selectedMember.holes || []).map(h =>
      h.id === holeId ? { ...h, [field]: value } : h
    );
    update('holes', updated);
  };

  const handleRemoveHole = (holeId: string) => {
    const updated = (selectedMember.holes || []).filter(h => h.id !== holeId);
    update('holes', updated);
  };

  const isBendable = ['sheet', 'plate', 'flat_bar'].includes(selectedMember.type)

  const handleAddBend = () => {
    const defaultK = GRADE_MATERIALS[selectedMember.grade]?.defaultK ?? 0.42
    const newBend: Bend = {
      id: crypto.randomUUID(),
      angle: 90,
      direction: 'up',
      insideRadius: resolveWallThickness(selectedMember.wallThickness, selectedMember.grade),
      kFactor: defaultK,
      positionAlongPart: selectedMember.length / 2,
    }
    update('bends', [...(selectedMember.bends ?? []), newBend])
  }

  const handleUpdateBend = (bendId: string, field: keyof Bend, value: unknown) => {
    const updated = (selectedMember.bends ?? []).map(b =>
      b.id === bendId ? { ...b, [field]: value } : b
    )
    update('bends', updated)
  }

  const handleRemoveBend = (bendId: string) => {
    update('bends', (selectedMember.bends ?? []).filter(b => b.id !== bendId))
  }

  const fp = isBendable ? flatPattern(selectedMember) : null

  const tabs = [
    { id: 'props', label: 'Props' },
    { id: 'holes', label: 'Holes' },
    ...(isBendable ? [{ id: 'bends', label: 'Bends' }] : []),
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="shrink-0 flex flex-col" style={panelStyle}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #2e3350' }}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>
          {mat.label}
        </div>
        <div
          className="mt-0.5"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '15px',
            color: '#f1f5f9',
          }}
        >
          {selectedMember.size} × {selectedMember.wallThickness}"
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-4" style={{ borderBottom: '1px solid #2e3350' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className="panel-item py-2 text-[13px]"
            style={{
              color: activeRightTab === t.id ? '#f97316' : '#475569',
              borderBottom: activeRightTab === t.id ? '2px solid #f97316' : '2px solid transparent',
              background: 'transparent',
              marginBottom: '-1px',
            }}
            onClick={() => setActiveRightTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeRightTab === 'props' && (
          <>
            {numInput('Length (in)', 'length', selectedMember.length, 0.25, 0.1)}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#475569',
              }}
            >
              {Math.floor(selectedMember.length / 12)}' {(selectedMember.length % 12).toFixed(4).replace(/\.?0+$/, '')}"
            </div>

            <div>
              <label className={labelCls}>Size</label>
              <input
                type="text"
                className={inputCls}
                value={selectedMember.size}
                onChange={e => update('size', e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Wall Thickness</label>
              <input
                type="text"
                className={inputCls}
                value={selectedMember.wallThickness}
                onChange={e => update('wallThickness', e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Grade</label>
              <select
                className={inputCls}
                value={selectedMember.grade}
                onChange={e => update('grade', e.target.value as Grade)}
              >
                {Object.entries(GRADE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Position X (in)</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.position.x}
                step={0.25}
                onChange={e => update('position', { ...selectedMember.position, x: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>Position Y (in)</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.position.y}
                step={0.25}
                onChange={e => update('position', { ...selectedMember.position, y: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>Position Z — height (in)</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.position.z ?? 0}
                step={0.25}
                min={0}
                onChange={e => update('position', { ...selectedMember.position, z: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Orientation presets */}
            <div>
              <label className={labelCls}>Orientation</label>
              <div className="flex gap-1">
                {([
                  { label: 'Flat', rx: 0, ry: 0, rz: 0 },
                  { label: 'Upright', rx: 90, ry: 0, rz: 0 },
                  { label: 'Side', rx: 0, ry: 0, rz: 90 },
                ] as const).map(preset => {
                  const active =
                    selectedMember.rotation.x === preset.rx &&
                    selectedMember.rotation.y === preset.ry &&
                    selectedMember.rotation.z === preset.rz
                  return (
                    <button
                      key={preset.label}
                      className="flex-1 py-1 rounded-md text-[11px] panel-item"
                      style={{
                        background: active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#f97316' : '#64748b',
                        border: active ? '1px solid rgba(249,115,22,0.3)' : '1px solid #2e3350',
                      }}
                      onClick={() => update('rotation', { x: preset.rx, y: preset.ry, z: preset.rz })}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rotation axes */}
            <div>
              <label className={labelCls}>Rotation X (°) — tilt / upright</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.rotation.x}
                step={1}
                onChange={e => update('rotation', { ...selectedMember.rotation, x: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>Rotation Y (°) — in-plane angle</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.rotation.y}
                step={1}
                onChange={e => update('rotation', { ...selectedMember.rotation, y: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={labelCls}>Rotation Z (°) — roll</label>
              <input
                type="number"
                className={inputCls}
                value={selectedMember.rotation.z}
                step={1}
                onChange={e => update('rotation', { ...selectedMember.rotation, z: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* In-plane angle quick-set */}
            <div>
              <label className={labelCls}>Quick angle (Y)</label>
              <div className="flex gap-1">
                {[0, 45, 90, 135].map(a => (
                  <button
                    key={a}
                    className="flex-1 py-1 rounded-md text-[11px] panel-item"
                    style={{
                      background: selectedMember.rotation.y === a ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                      color: selectedMember.rotation.y === a ? '#f97316' : '#64748b',
                      border: selectedMember.rotation.y === a ? '1px solid rgba(249,115,22,0.3)' : '1px solid #2e3350',
                    }}
                    onClick={() => update('rotation', { ...selectedMember.rotation, y: a })}
                  >
                    {a}°
                  </button>
                ))}
              </div>
            </div>

            {/* Weight */}
            <div
              className="flex items-center justify-between px-2 py-2 rounded-md"
              style={{ background: '#21253a' }}
            >
              <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>
                WEIGHT
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '18px',
                  color: '#f97316',
                  lineHeight: 1,
                }}
              >
                {formatWeight(weight)}
              </span>
            </div>

            {/* Delete */}
            <button
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs panel-item mt-1"
              style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
              onClick={() => {
                historyStore.push(fabDocument);
                deleteMembers([selectedMember.id]);
                setSelectedIds([]);
              }}
            >
              <Trash2 size={12} /> Delete Member
            </button>
          </>
        )}

        {activeRightTab === 'holes' && (
          <>
            <button
              onClick={handleAddHole}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs panel-item"
              style={{ border: '1px solid rgba(249,115,22,0.4)', color: '#f97316', background: 'transparent' }}
            >
              <Plus size={12} /> Add Hole
            </button>

            {(selectedMember.holes || []).length === 0 && (
              <div className="text-center py-4" style={{ color: '#475569', fontSize: '12px' }}>No holes</div>
            )}

            {(selectedMember.holes || []).map((hole, i) => (
              <div key={hole.id} className="rounded-md p-2 space-y-2" style={{ background: '#21253a' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Hole {i + 1}</span>
                  <button
                    onClick={() => handleRemoveHole(hole.id)}
                    style={{ color: '#475569' }}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className={labelCls}>Position Along Member</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={hole.positionAlongMember}
                      step={0.0625}
                      min={0}
                      max={selectedMember.length}
                      onChange={e => handleUpdateHole(hole.id, 'positionAlongMember', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Diameter</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={hole.diameter}
                      step={0.0625}
                      min={0.0625}
                      onChange={e => handleUpdateHole(hole.id, 'diameter', parseFloat(e.target.value) || 0.5)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      className={inputCls}
                      value={hole.type}
                      onChange={e => handleUpdateHole(hole.id, 'type', e.target.value as Hole['type'])}
                    >
                      <option value="circle">Circle</option>
                      <option value="slot">Slot</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Face</label>
                    <select
                      className={inputCls}
                      value={hole.face}
                      onChange={e => handleUpdateHole(hole.id, 'face', e.target.value as Hole['face'])}
                    >
                      <option value="top">Top</option>
                      <option value="front">Front</option>
                      <option value="side">Side</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeRightTab === 'bends' && isBendable && (
          <>
            <button
              onClick={handleAddBend}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs panel-item"
              style={{ border: '1px solid rgba(249,115,22,0.4)', color: '#f97316', background: 'transparent' }}
            >
              <Plus size={12} /> Add Bend
            </button>

            {/* Flat length summary */}
            {fp && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md" style={{ background: '#21253a' }}>
                <span style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>
                  FLAT LENGTH
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#60a5fa' }}>
                  {fp.flatLength.toFixed(4)}"
                </span>
              </div>
            )}

            {!(selectedMember.bends?.length) && (
              <div className="text-center py-4" style={{ color: '#475569', fontSize: '12px' }}>No bends</div>
            )}

            {(selectedMember.bends ?? [])
              .slice()
              .sort((a, b) => a.positionAlongPart - b.positionAlongPart)
              .map((bend, i) => (
              <div key={bend.id} className="rounded-md p-2 space-y-2" style={{ background: '#21253a' }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Bend {i + 1}</span>
                  <button onClick={() => handleRemoveBend(bend.id)} style={{ color: '#475569' }} className="hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <label className={labelCls}>Position Along Part (in)</label>
                    <input type="number" className={inputCls} value={bend.positionAlongPart} step={0.0625} min={0} max={selectedMember.length}
                      onChange={e => handleUpdateBend(bend.id, 'positionAlongPart', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className={labelCls}>Angle from Flat (°)</label>
                    <input type="number" className={inputCls} value={bend.angle} step={1} min={1} max={180}
                      onChange={e => handleUpdateBend(bend.id, 'angle', parseFloat(e.target.value) || 90)} />
                  </div>
                  <div>
                    <label className={labelCls}>Direction</label>
                    <select className={inputCls} value={bend.direction}
                      onChange={e => handleUpdateBend(bend.id, 'direction', e.target.value as Bend['direction'])}>
                      <option value="up">Up</option>
                      <option value="down">Down</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Inside Radius (in)</label>
                    <input type="number" className={inputCls} value={bend.insideRadius} step={0.0625} min={0}
                      onChange={e => handleUpdateBend(bend.id, 'insideRadius', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className={labelCls}>K-Factor</label>
                    <input type="number" className={inputCls} value={bend.kFactor} step={0.01} min={0} max={0.5}
                      onChange={e => handleUpdateBend(bend.id, 'kFactor', parseFloat(e.target.value) || 0.42)} />
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeRightTab === 'notes' && (
          <div style={{ color: '#475569', fontSize: '12px', padding: '8px 0' }}>
            Notes not available in this version.
          </div>
        )}
      </div>
    </div>
  );
}
