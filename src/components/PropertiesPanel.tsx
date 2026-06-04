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
    <div className="grid grid-cols-2 gap-2 items-center">
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-accent"
        value={value}
        step={step}
        min={min}
        onChange={e => update(field, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  if (selectedIds.length === 0 && !selectedConn) {
    return (
      <div className="w-64 shrink-0 bg-[#1a1d2e] border-l border-slate-800 flex items-center justify-center">
        <div className="text-center text-slate-600 text-sm p-4">
          <div className="text-2xl mb-2">◻</div>
          Select a piece or connection
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="w-64 shrink-0 bg-[#1a1d2e] border-l border-slate-800 p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          {selectedIds.length} pieces selected
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-400 text-sm rounded transition-colors"
          onClick={() => {
            historyStore.push({ pieces, connections });
            deletePieces(selectedIds);
            setSelectedIds([]);
          }}
        >
          <Trash2 size={14} />
          Delete {selectedIds.length} Pieces
        </button>
      </div>
    );
  }

  if (selectedConn) {
    const pA = pieces.find(p => p.id === selectedConn.pieceAId);
    const pB = pieces.find(p => p.id === selectedConn.pieceBId);
    return (
      <div className="w-64 shrink-0 bg-[#1a1d2e] border-l border-slate-800 p-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Connection</div>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="bg-slate-900 rounded p-2">
            <div className="text-slate-500 mb-1">Piece A</div>
            <div>{pA ? MATERIALS[pA.type].label : '—'}</div>
          </div>
          <div className="bg-slate-900 rounded p-2">
            <div className="text-slate-500 mb-1">Piece B</div>
            <div>{pB ? MATERIALS[pB.type].label : '—'}</div>
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Joint Type</label>
            <select
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-accent"
              value={selectedConn.type}
              onChange={e => updateConnectionType(selectedConn.id, e.target.value)}
            >
              {CONNECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            className="w-full flex items-center justify-center gap-2 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded transition-colors"
            onClick={() => removeConnection(selectedConn.id)}
          >
            <Trash2 size={12} /> Remove Connection
          </button>
        </div>
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
    { id: 'holes', label: `Holes (${selectedPiece.holes?.length ?? 0})` },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="w-64 shrink-0 bg-[#1a1d2e] border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 border-b border-slate-800">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: mat.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-200 truncate">{mat.label}</div>
          <div className="text-xs text-slate-500">{selectedPiece.grade.replace('_', ' ')}</div>
        </div>
        <div className="text-xs text-slate-400 font-mono">{formatWeight(weight)}</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              activeRightTab === t.id
                ? 'text-orange-400 border-b-2 border-accent'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            onClick={() => setActiveRightTab(t.id as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activeRightTab === 'props' && (
          <>
            {/* Dimensions */}
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dimensions</div>
            {numInput('Width (in)', 'width', selectedPiece.width, 0.0625, 0.1)}
            {numInput('Height (in)', 'height', selectedPiece.height, 0.0625, 0.1)}
            {numInput('Wall (in)', 'wall', selectedPiece.wall, 0.0625, 0.01)}
            {numInput('Length (in)', 'length', selectedPiece.length, 0.25, 0.1)}

            <div className="text-xs text-slate-600 bg-slate-900 rounded px-2 py-1 font-mono">
              {Math.floor(selectedPiece.length / 12)}' {(selectedPiece.length % 12).toFixed(4).replace(/\.?0+$/, '')}"
            </div>

            {/* Position */}
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-3 mb-1">Position</div>
            {numInput('X (in)', 'x', parseFloat(selectedPiece.x.toFixed(3)), 0.125)}
            {numInput('Y (in)', 'y', parseFloat(selectedPiece.y.toFixed(3)), 0.125)}
            {numInput('Angle (°)', 'angle', selectedPiece.angle, 1)}

            {/* Angle quick buttons */}
            <div className="flex gap-1 flex-wrap">
              {[0, 45, 90, 135].map(a => (
                <button
                  key={a}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    selectedPiece.angle === a
                      ? 'bg-accent text-white border-accent'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                  onClick={() => update('angle', a)}
                >
                  {a}°
                </button>
              ))}
            </div>

            {/* Orientation */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Orientation</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-accent"
                value={selectedPiece.orientation}
                onChange={e => update('orientation', e.target.value as Orientation)}
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="upright">Upright (3D)</option>
              </select>
            </div>
            {selectedPiece.orientation === 'upright' && (
              numInput('Z Height (in)', 'zHeight', selectedPiece.zHeight, 1, 1)
            )}

            {/* Grade */}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Grade</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-accent"
                value={selectedPiece.grade}
                onChange={e => update('grade', e.target.value as MaterialGrade)}
              >
                {Object.entries(GRADE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Weight display */}
            <div className="flex items-center justify-between bg-slate-900 rounded px-2 py-1.5">
              <span className="text-xs text-slate-500">Weight</span>
              <span className="text-xs font-mono text-yellow-400">{formatWeight(weight)}</span>
            </div>

            {/* Delete */}
            <button
              className="w-full flex items-center justify-center gap-2 py-1.5 mt-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded transition-colors"
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
              className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
            >
              <Plus size={12} /> Add Hole
            </button>

            {(selectedPiece.holes || []).length === 0 && (
              <div className="text-xs text-slate-600 text-center py-4">No holes</div>
            )}

            {(selectedPiece.holes || []).map((hole, i) => (
              <div key={hole.id} className="bg-slate-900 rounded p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Hole {i + 1}</span>
                  <button
                    onClick={() => handleRemoveHole(hole.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 items-center">
                  <label className="text-xs text-slate-500">From start</label>
                  <input
                    type="number"
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
                    value={hole.fromStart}
                    step={0.0625}
                    min={0}
                    max={selectedPiece.length}
                    onChange={e => handleUpdateHole(hole.id, 'fromStart', parseFloat(e.target.value) || 0)}
                  />
                  <label className="text-xs text-slate-500">Diameter</label>
                  <input
                    type="number"
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
                    value={hole.diameter}
                    step={0.0625}
                    min={0.0625}
                    onChange={e => handleUpdateHole(hole.id, 'diameter', parseFloat(e.target.value) || 0.5)}
                  />
                  <label className="text-xs text-slate-500">Type</label>
                  <select
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-1 py-1 focus:outline-none"
                    value={hole.type}
                    onChange={e => handleUpdateHole(hole.id, 'type', e.target.value as HoleType)}
                  >
                    {HOLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </>
        )}

        {activeRightTab === 'notes' && (
          <>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Notes</label>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent resize-none h-32"
                value={selectedPiece.notes}
                placeholder="Add notes, spec references, dimensions..."
                onChange={e => update('notes', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Weld Symbol</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-accent"
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
