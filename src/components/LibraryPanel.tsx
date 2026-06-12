import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import { MATERIALS } from '../lib/materials';
import type { MemberType, Grade } from '../types';

interface LibProps {
  collapsed?: boolean;
}

const materialGroups = [
  {
    label: 'STRUCTURAL TUBE',
    id: 'tube',
    types: ['square_tube', 'round_tube', 'rect_tube', 'pipe'] as MemberType[],
  },
  {
    label: 'STRUCTURAL STEEL',
    id: 'structural',
    types: ['angle', 'channel', 'i_beam'] as MemberType[],
  },
  {
    label: 'FLAT STOCK',
    id: 'flat',
    types: ['flat_bar', 'sheet', 'plate'] as MemberType[],
  },
];

const inputCls = 'w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#f1f5f9] text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-[#f97316] transition-colors';
const labelCls = 'block text-[9px] uppercase tracking-[2px] text-[#475569] mb-1';

export default function LibraryPanel({ collapsed }: LibProps) {
  const { project, addMember } = useProjectStore();
  const { members, connections } = project;
  const { setSelectedIds, panX, panY, zoom } = useUIStore();
  const historyStore = useHistoryStore();

  const [selectedType, setSelectedType] = useState<MemberType>('square_tube');
  const [selectedSize, setSelectedSize] = useState<string>('2x2');
  const [selectedWall, setSelectedWall] = useState<string>('0.125');
  const [selectedGrade, setSelectedGrade] = useState<Grade>('mild');
  const [length, setLength] = useState<number>(48);

  const handleTypeSelect = (type: MemberType) => {
    setSelectedType(type);
    const mat = MATERIALS[type];
    setSelectedSize(mat.sizes[0]);
    setSelectedWall(String(mat.walls[0]));
  };

  const handleAddMember = () => {
    const SCALE = 8;
    const canvas = document.querySelector('canvas');
    const cw = canvas?.offsetWidth ?? 800;
    const ch = canvas?.offsetHeight ?? 600;
    const wx = (cw / 2 - panX) / (zoom * SCALE);
    const wy = (ch / 2 - panY) / (zoom * SCALE);

    historyStore.push({ members, connections });
    const newId = crypto.randomUUID();
    addMember({
      type: selectedType,
      size: selectedSize,
      wallThickness: selectedWall,
      grade: selectedGrade,
      length,
      position: {
        x: wx + (Math.random() - 0.5) * 3,
        y: wy + (Math.random() - 0.5) * 3,
        z: 0,
      },
      rotation: { x: 0, y: 0, z: 0 },
      holes: [],
    });
    // We can't get the new id before add, so select by finding last member
    // Instead just clear selection - that's fine for now
    setSelectedIds([]);
  };

  if (collapsed) return null;

  const mat = MATERIALS[selectedType];

  const feetInches = (inches: number) => {
    const ft = Math.floor(inches / 12);
    const inPart = (inches % 12).toFixed(2).replace(/\.?0+$/, '');
    return ft > 0 ? `${ft}'-${inPart}"` : `${inPart}"`;
  };

  return (
    <div
      className="flex flex-col h-full shrink-0 overflow-hidden"
      style={{
        width: '240px',
        background: '#161b25',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Material list */}
      <div className="flex-1 overflow-y-auto">
        {materialGroups.map(group => (
          <div key={group.id}>
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#475569',
                padding: '16px 12px 8px',
              }}
            >
              {group.label}
            </div>
            {group.types.map(type => {
              const m = MATERIALS[type];
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="panel-item w-full flex items-center gap-2 px-3"
                  style={{
                    height: '40px',
                    background: isSelected ? 'rgba(249,115,22,0.06)' : 'transparent',
                    borderLeft: isSelected ? '2px solid #f97316' : '2px solid transparent',
                    color: isSelected ? '#f97316' : '#94a3b8',
                    fontSize: '12px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span
                    className="shrink-0"
                    dangerouslySetInnerHTML={{ __html: m.svgIcon }}
                  />
                  <span className="truncate">{m.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Configuration card */}
      <div
        className="shrink-0 space-y-2.5"
        style={{
          padding: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* SVG preview */}
        <div
          className="flex items-center justify-center"
          style={{
            height: '40px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          dangerouslySetInnerHTML={{ __html: mat.svgIcon }}
        />

        {/* Size */}
        <div>
          <label className={labelCls}>Size</label>
          <select
            className={inputCls}
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
          <label className={labelCls}>Wall Thickness</label>
          <select
            className={inputCls}
            value={selectedWall}
            onChange={e => setSelectedWall(e.target.value)}
          >
            {mat.walls.map(w => (
              <option key={w} value={String(w)}>{w}"</option>
            ))}
          </select>
        </div>

        {/* Length */}
        <div>
          <label className={labelCls}>Length (inches)</label>
          <input
            type="number"
            className={inputCls}
            value={length}
            min={0.1}
            step={0.25}
            onChange={e => setLength(parseFloat(e.target.value) || 1)}
          />
          <div
            className="mt-0.5"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              color: '#475569',
            }}
          >
            {feetInches(length)}
          </div>
        </div>

        {/* Grade pills */}
        <div>
          <label className={labelCls}>Grade</label>
          <div className="flex gap-1">
            {([
              { key: 'mild' as Grade, label: 'Mild' },
              { key: 'stainless' as Grade, label: 'SS' },
              { key: 'aluminum' as Grade, label: 'Alum' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedGrade(key)}
                className="flex-1 py-1 rounded-md text-[11px] font-medium panel-item"
                style={{
                  background: selectedGrade === key ? '#f97316' : 'rgba(255,255,255,0.04)',
                  color: selectedGrade === key ? '#fff' : '#94a3b8',
                  border: selectedGrade === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleAddMember}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-white text-[13px] font-medium"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <Plus size={14} />
          Add to Drawing
        </button>
      </div>
    </div>
  );
}
