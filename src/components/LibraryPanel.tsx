import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import { MATERIALS, parseSizeString } from '../lib/materials';
import type { MaterialType, MaterialGrade, Piece } from '../types';

const GRADE_LABELS: Record<MaterialGrade, string> = {
  mild_steel: 'Mild Steel (A36)',
  stainless: 'Stainless (304)',
  aluminum: 'Aluminum (6061)',
};

interface LibProps {
  collapsed?: boolean;
}

export default function LibraryPanel({ collapsed }: LibProps) {
  const { pieces, connections, addPiece, zoom, panX, panY } = useProjectStore();
  const { setSelectedIds } = useUIStore();
  const historyStore = useHistoryStore();

  const [selectedType, setSelectedType] = useState<MaterialType>('square_tube');
  const [selectedSize, setSelectedSize] = useState<string>('2x2');
  const [selectedWall, setSelectedWall] = useState<number>(0.125);
  const [selectedGrade, setSelectedGrade] = useState<MaterialGrade>('mild_steel');
  const [length, setLength] = useState<number>(48);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['structural', 'flat']));

  const materialGroups = [
    { label: 'Structural Tube', id: 'tube', types: ['square_tube', 'round_tube', 'rect_tube', 'pipe'] as MaterialType[] },
    { label: 'Structural Steel', id: 'structural', types: ['angle', 'channel', 'ibeam'] as MaterialType[] },
    { label: 'Flat', id: 'flat', types: ['flat_bar', 'sheet', 'plate'] as MaterialType[] },
  ];

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTypeSelect = (type: MaterialType) => {
    setSelectedType(type);
    const mat = MATERIALS[type];
    setSelectedSize(mat.sizes[0]);
    setSelectedWall(mat.walls[0]);
  };

  const handleAddPiece = () => {
    const mat = MATERIALS[selectedType];
    const { width, height } = parseSizeString(selectedType, selectedSize);

    // Center of canvas in world coords
    const SCALE = 8;
    const canvas = document.querySelector('canvas');
    const cw = canvas?.offsetWidth ?? 800;
    const ch = canvas?.offsetHeight ?? 600;
    const wx = (cw / 2 - panX) / (zoom * SCALE);
    const wy = (ch / 2 - panY) / (zoom * SCALE);

    const newPiece: Piece = {
      id: crypto.randomUUID(),
      type: selectedType,
      grade: selectedGrade,
      width,
      height,
      wall: selectedWall,
      length,
      x: wx + (Math.random() - 0.5) * 3,
      y: wy + (Math.random() - 0.5) * 3,
      angle: 0,
      orientation: 'horizontal',
      zHeight: 48,
      notes: '',
      weldSymbol: '',
      holes: [],
    };

    historyStore.push({ pieces, connections });
    addPiece(newPiece);
    setSelectedIds([newPiece.id]);
  };

  if (collapsed) return null;

  const mat = MATERIALS[selectedType];

  return (
    <div className="flex flex-col h-full bg-[#1a1d2e] border-r border-slate-800 w-56 shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Library</div>
      </div>

      {/* Material type selector */}
      <div className="flex-1 overflow-y-auto">
        {materialGroups.map(group => (
          <div key={group.id}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50 transition-colors"
              onClick={() => toggleGroup(group.id)}
            >
              {expandedGroups.has(group.id)
                ? <ChevronDown size={12} />
                : <ChevronRight size={12} />
              }
              {group.label}
            </button>
            {expandedGroups.has(group.id) && (
              <div className="pb-1">
                {group.types.map(type => {
                  const m = MATERIALS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeSelect(type)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                        selectedType === type
                          ? 'bg-accent/20 text-orange-300 border-l-2 border-accent'
                          : 'text-slate-300 hover:bg-slate-800 border-l-2 border-transparent'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: m.color }}
                      />
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Configuration panel */}
      <div className="border-t border-slate-800 p-3 space-y-3">
        {/* SVG preview */}
        <div className="flex items-center justify-center h-12 bg-slate-900 rounded-lg border border-slate-800">
          <div
            dangerouslySetInnerHTML={{ __html: mat.svgIcon }}
            className="opacity-90"
          />
        </div>

        {/* Size */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Size</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-accent"
            value={selectedSize}
            onChange={e => setSelectedSize(e.target.value)}
          >
            {mat.sizes.map(s => (
              <option key={s} value={s}>{s}"</option>
            ))}
          </select>
        </div>

        {/* Wall */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Wall Thickness</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-accent"
            value={selectedWall}
            onChange={e => setSelectedWall(parseFloat(e.target.value))}
          >
            {mat.walls.map(w => (
              <option key={w} value={w}>{w}"</option>
            ))}
          </select>
        </div>

        {/* Length */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Length (inches)</label>
          <input
            type="number"
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-accent"
            value={length}
            min={0.1}
            step={0.25}
            onChange={e => setLength(parseFloat(e.target.value) || 1)}
          />
          <div className="text-xs text-slate-600 mt-0.5">
            = {Math.floor(length / 12)}' {(length % 12).toFixed(2).replace(/\.?0+$/, '')}"
          </div>
        </div>

        {/* Grade */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Material Grade</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-accent"
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value as MaterialGrade)}
          >
            {Object.entries(GRADE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Add button */}
        <button
          onClick={handleAddPiece}
          className="w-full flex items-center justify-center gap-2 py-2 bg-accent hover:bg-orange-600 text-white text-sm font-semibold rounded transition-colors"
        >
          <Plus size={16} />
          Add Piece
        </button>
      </div>
    </div>
  );
}
