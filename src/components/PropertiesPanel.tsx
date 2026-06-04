import React from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import { MATERIALS } from '../lib/materials';
import { calcWeight, formatWeight } from '../lib/weights';
import type { MaterialGrade, HoleType, Orientation, Hole } from '../types';

const CONNECTION_TYPES = ['butt', 'miter', 'cope', 'fish', 'gusset', 'flange'];
const HOLE_TYPES: HoleType[] = ['through', 'tapped', 'countersink'];
const GRADE_LABELS: Record<MaterialGrade, string> = {
  mild_steel: 'Mild Steel',
  stainless: 'Stainless',
  aluminum: 'Aluminum',
};

const inputCls = 'w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#f1f5f9] text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-[#f97316] transition-colors';
const labelCls = 'block text-[9px] uppercase tracking-[2px] text-[#475569] mb-1';

export default function PropertiesPanel() {
  const { pieces, connections, updatePiece, updateConnectionType, removeConnection, deletePieces } = useProjectStore();
  const { selectedIds, selectedConnectionId, activeRightTab, setActiveRightTab, setSelectedIds } = useUIStore();
  const historyStore = useHistoryStore();

  const selectedPiece = selectedIds.length === 1 ? pieces.find(p => p.id === selectedIds[0]) : null;
  const selectedConn = selectedConnectionId ? connections.find(c => c.id === selectedConnectionId) : null;

  const update = (field: string, value: unknown) => {
    if (!selectedPiece) return;
    updatePiece(selectedPiece.id, { [field]: value });
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

  const panelStyle = {
    width: '240px',
    background: '#161b25',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
  };

  if (selectedIds.length === 0 && !selectedConn) {
    return (
      <div className="shrink-0 flex items-center justify-center" style={panelStyle}>
        <div className="text-center p-4">
          <div className="text-3xl mb-2" style={{ color: '#2d3748' }}>◻</div>
          <div style={{ color: '#475569', fontSize: '12px' }}>Select a piece</div>
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="shrink-0 p-3" style={panelStyle}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569', marginBottom: '12px' }}>
          {selectedIds.length} pieces selected
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs panel-item"
          style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
          onClick={() => {
            historyStore.push({ pieces, connections });
            deletePieces(selectedIds);
            setSelectedIds([]);
          }}
        >
          <Trash2 size={13} />
          Delete {selectedIds.length} Pieces
        </button>
      </div>
    );
  }

  if (selectedConn) {
    const pA = pieces.find(p => p.id === selectedConn.pieceAId);
    const pB = pieces.find(p => p.id === selectedConn.pieceBId);
    return (
      <div className="shrink-0 p-3 space-y-2" style={panelStyle}>
        <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Connection</div>
        <div className="rounded-md p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}>
          <div style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>PIECE A</div>
          <div>{pA ? MATERIALS[pA.type].label : '—'}</div>
        </div>
        <div className="rounded-md p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8' }}>
          <div style={{ color: '#475569', fontSize: '9px', marginBottom: '2px' }}>PIECE B</div>
          <div>{pB ? MATERIALS[pB.type].label : '—'}</div>
        </div>
        <div>
          <label className={labelCls}>Joint Type</label>
          <select
            className={inputCls}
            value={selectedConn.type}
            onChange={e => updateConnectionType(selectedConn.id, e.target.value)}
          >
            {CONNECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs panel-item"
          style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', background: 'transparent' }}
          onClick={() => removeConnection(selectedConn.id)}
        >
          <Trash2 size={12} /> Remove Connection
        </button>
      </div>
    );
  }

  if (!selectedPiece) return null;
  const mat = MATERIALS[selectedPiece.type];
  const weight = calcWeight(selectedPiece);

  const handleAddHole = () => {
    const newHole: Hole = {
      id: crypto.randomUUID(),
      pieceId: selectedPiece.id,
      snapTo: 'custom',
      fromStart: selectedPiece.length / 2,
      type: 'through',
      diameter: 0.5,
    };
    update('holes', [...(selectedPiece.holes || []), newHole]);
  };

  const handleUpdateHole = (holeId: string, field: keyof Hole, value: unknown) => {
    const updated = (selectedPiece.holes || []).map(h =>
      h.id === holeId ? { ...h, [field]: value } : h
    );
    update('holes', updated);
  };

  const handleRemoveHole = (holeId: string) => {
    const updated = (selectedPiece.holes || []).filter(h => h.id !== holeId);
    update('holes', updated);
  };

  const tabs = [
    { id: 'props', label: 'Props' },
    { id: 'holes', label: `Holes` },
    { id: 'notes', label: 'Notes' },
  ];

  const dimStr = `${selectedPiece.width}×${selectedPiece.height}×${selectedPiece.wall}`;

  return (
    <div className="shrink-0 flex flex-col" style={panelStyle}>
      {/* Header */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
          {dimStr}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
            {numInput('Length (in)', 'length', selectedPiece.length, 0.25, 0.1)}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#475569',
              }}
            >
              {Math.floor(selectedPiece.length / 12)}' {(selectedPiece.length % 12).toFixed(4).replace(/\.?0+$/, '')}"
            </div>

            {numInput('Angle (°)', 'angle', selectedPiece.angle, 1)}

            {/* Angle quick buttons */}
            <div className="flex gap-1">
              {[0, 45, 90, 135].map(a => (
                <button
                  key={a}
                  className="flex-1 py-1 rounded-md text-[11px] panel-item"
                  style={{
                    background: selectedPiece.angle === a ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                    color: selectedPiece.angle === a ? '#f97316' : '#475569',
                    border: selectedPiece.angle === a ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  }}
                  onClick={() => update('angle', a)}
                >
                  {a}°
                </button>
              ))}
            </div>

            {selectedPiece.orientation === 'upright' && (
              numInput('Z Height (in)', 'zHeight', selectedPiece.zHeight, 1, 1)
            )}

            <div>
              <label className={labelCls}>Orientation</label>
              <select
                className={inputCls}
                value={selectedPiece.orientation}
                onChange={e => update('orientation', e.target.value as Orientation)}
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="upright">Upright (3D)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Grade</label>
              <select
                className={inputCls}
                value={selectedPiece.grade}
                onChange={e => update('grade', e.target.value as MaterialGrade)}
              >
                {Object.entries(GRADE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div
              className="flex items-center justify-between px-2 py-2 rounded-md"
              style={{ background: 'rgba(255,255,255,0.03)' }}
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
                historyStore.push({ pieces, connections });
                deletePieces([selectedPiece.id]);
                setSelectedIds([]);
              }}
            >
              <Trash2 size={12} /> Delete Piece
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

            {(selectedPiece.holes || []).length === 0 && (
              <div className="text-center py-4" style={{ color: '#475569', fontSize: '12px' }}>No holes</div>
            )}

            {(selectedPiece.holes || []).map((hole, i) => (
              <div key={hole.id} className="rounded-md p-2 space-y-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
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
                    <label className={labelCls}>From start</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={hole.fromStart}
                      step={0.0625}
                      min={0}
                      max={selectedPiece.length}
                      onChange={e => handleUpdateHole(hole.id, 'fromStart', parseFloat(e.target.value) || 0)}
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
                      onChange={e => handleUpdateHole(hole.id, 'type', e.target.value as HoleType)}
                    >
                      {HOLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeRightTab === 'notes' && (
          <>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea
                className={`${inputCls} resize-none h-32`}
                value={selectedPiece.notes}
                placeholder="Add notes, spec references..."
                onChange={e => update('notes', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Weld Symbol</label>
              <input
                type="text"
                className={inputCls}
                value={selectedPiece.weldSymbol}
                placeholder="e.g. 1/4 → 4"
                onChange={e => update('weldSymbol', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
