import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import type { Piece } from '../types';

const EXAMPLES = [
  '10-foot workbench frame with 2x2 square tube legs and a flat bar top rail',
  '6x6 ft welding table with 2x2 square tube and cross bracing',
  'Simple 4-legged cart, 24x48 inch, 30 inches tall with 1.5x1.5 square tube',
  'Truck bed rack with round tube uprights and flat bar cross members',
  'Motorcycle trailer frame 5 feet long by 2.5 feet wide',
];

interface ParsedPiece {
  type: Piece['type'];
  width: number;
  height: number;
  wall: number;
  length: number;
  x: number;
  y: number;
  angle: number;
  orientation: Piece['orientation'];
  zHeight: number;
  grade: Piece['grade'];
  notes: string;
}

function generateStructure(prompt: string): ParsedPiece[] {
  const lower = prompt.toLowerCase();
  const pieces: ParsedPiece[] = [];
  const rand = () => Math.random() * 0.5 - 0.25;

  // Very simple heuristic-based generation
  const isTable = lower.includes('table') || lower.includes('workbench') || lower.includes('bench');
  const isRack = lower.includes('rack') || lower.includes('frame');
  const isCart = lower.includes('cart');

  // Extract dimensions
  const ftMatch = lower.match(/(\d+)\s*(?:x|by|×)\s*(\d+)\s*(?:ft|feet|foot)/);
  const inMatch = lower.match(/(\d+)\s*(?:x|by|×)\s*(\d+)\s*(?:in|inch)/);
  const heightMatch = lower.match(/(\d+)\s*(?:inch|in|"|')\s*tall/);

  let W = 48; // width in inches
  let D = 24; // depth in inches
  let H = 34; // height in inches

  if (ftMatch) {
    W = parseFloat(ftMatch[1]) * 12;
    D = parseFloat(ftMatch[2]) * 12;
  } else if (inMatch) {
    W = parseFloat(inMatch[1]);
    D = parseFloat(inMatch[2]);
  }
  if (heightMatch) H = parseFloat(heightMatch[1]);

  const tube = '2x2' as const;
  const tubeW = 2, tubeH = 2, tubeWall = 0.125;

  if (isTable || isCart || isRack) {
    // 4 legs
    const legPositions = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: 0, y: D },
      { x: W, y: D },
    ];
    for (const pos of legPositions) {
      pieces.push({
        type: 'square_tube', grade: 'mild_steel',
        width: tubeW, height: tubeH, wall: tubeWall,
        length: H, x: pos.x + rand(), y: pos.y + rand(),
        angle: 0, orientation: 'upright', zHeight: H, notes: 'Leg',
      });
    }

    // Top frame rails (long sides)
    pieces.push({
      type: 'square_tube', grade: 'mild_steel',
      width: tubeW, height: tubeH, wall: tubeWall,
      length: W, x: W / 2, y: 0,
      angle: 0, orientation: 'horizontal', zHeight: H, notes: 'Top rail front',
    });
    pieces.push({
      type: 'square_tube', grade: 'mild_steel',
      width: tubeW, height: tubeH, wall: tubeWall,
      length: W, x: W / 2, y: D,
      angle: 0, orientation: 'horizontal', zHeight: H, notes: 'Top rail back',
    });

    // Top frame cross members
    pieces.push({
      type: 'square_tube', grade: 'mild_steel',
      width: tubeW, height: tubeH, wall: tubeWall,
      length: D, x: 0, y: D / 2,
      angle: 90, orientation: 'horizontal', zHeight: H, notes: 'Top rail left',
    });
    pieces.push({
      type: 'square_tube', grade: 'mild_steel',
      width: tubeW, height: tubeH, wall: tubeWall,
      length: D, x: W, y: D / 2,
      angle: 90, orientation: 'horizontal', zHeight: H, notes: 'Top rail right',
    });

    // Bottom stretchers (if tall enough)
    if (H > 20) {
      const sh = H * 0.35;
      pieces.push({
        type: 'square_tube', grade: 'mild_steel',
        width: tubeW, height: tubeH, wall: tubeWall,
        length: W - tubeW, x: W / 2, y: 0,
        angle: 0, orientation: 'horizontal', zHeight: sh, notes: 'Bottom stretcher front',
      });
      pieces.push({
        type: 'square_tube', grade: 'mild_steel',
        width: tubeW, height: tubeH, wall: tubeWall,
        length: W - tubeW, x: W / 2, y: D,
        angle: 0, orientation: 'horizontal', zHeight: sh, notes: 'Bottom stretcher back',
      });
    }
  } else {
    // Generic: just a rectangle frame
    pieces.push({
      type: 'rect_tube', grade: 'mild_steel',
      width: 2, height: 3, wall: 0.120,
      length: W, x: W / 2, y: 0,
      angle: 0, orientation: 'horizontal', zHeight: 0, notes: 'Main rail',
    });
    pieces.push({
      type: 'rect_tube', grade: 'mild_steel',
      width: 2, height: 3, wall: 0.120,
      length: W, x: W / 2, y: D,
      angle: 0, orientation: 'horizontal', zHeight: 0, notes: 'Main rail',
    });
    pieces.push({
      type: 'rect_tube', grade: 'mild_steel',
      width: 2, height: 3, wall: 0.120,
      length: D, x: 0, y: D / 2,
      angle: 90, orientation: 'horizontal', zHeight: 0, notes: 'Cross member',
    });
    pieces.push({
      type: 'rect_tube', grade: 'mild_steel',
      width: 2, height: 3, wall: 0.120,
      length: D, x: W, y: D / 2,
      angle: 90, orientation: 'horizontal', zHeight: 0, notes: 'Cross member',
    });
  }

  return pieces;
}

export default function AIGeneratorModal() {
  const { pieces, connections, addPiece, clearProject } = useProjectStore();
  const { setShowAIModal } = useUIStore();
  const historyStore = useHistoryStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [generated, setGenerated] = useState<ParsedPiece[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult('');
    setGenerated([]);

    // Simulate AI thinking
    await new Promise(r => setTimeout(r, 1200));

    try {
      const parsedPieces = generateStructure(prompt);
      setGenerated(parsedPieces);
      setResult(`Generated ${parsedPieces.length} pieces based on your description. Review and click "Add to Drawing" to place them.`);
    } catch {
      setResult('Failed to generate. Try a more specific description.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDrawing = () => {
    historyStore.push({ pieces, connections });
    for (const p of generated) {
      const newPiece: Piece = {
        id: crypto.randomUUID(),
        ...p,
        weldSymbol: '',
        holes: [],
      };
      addPiece(newPiece);
    }
    setShowAIModal(false);
  };

  const handleReplaceDrawing = () => {
    historyStore.push({ pieces, connections });
    clearProject();
    for (const p of generated) {
      const newPiece: Piece = {
        id: crypto.randomUUID(),
        ...p,
        weldSymbol: '',
        holes: [],
      };
      addPiece(newPiece);
    }
    setShowAIModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1d2e] border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            <div>
              <div className="text-base font-semibold text-slate-100">AI Structure Generator</div>
              <div className="text-xs text-slate-500">Describe your structure in plain English</div>
            </div>
          </div>
          <button className="text-slate-500 hover:text-slate-200" onClick={() => setShowAIModal(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Prompt */}
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Describe your structure</label>
            <div className="flex gap-2">
              <textarea
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500 resize-none h-24"
                placeholder="e.g. A 6x4 foot welding table frame with 2x2 square tube legs and cross bracing..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
              />
            </div>
            <div className="text-xs text-slate-600 mt-1">Ctrl+Enter to generate</div>
          </div>

          {/* Examples */}
          <div>
            <div className="text-xs text-slate-500 mb-2">Examples:</div>
            <div className="space-y-1">
              {EXAMPLES.slice(0, 3).map((ex, i) => (
                <button
                  key={i}
                  className="w-full text-left text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded px-3 py-1.5 transition-colors"
                  onClick={() => setPrompt(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Generating...' : 'Generate Structure'}
          </button>

          {/* Result */}
          {result && (
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-300 mb-2">{result}</div>
              {generated.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                  {generated.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-4 text-slate-600">{i + 1}</span>
                      <span className="text-slate-300">{p.type.replace('_', ' ')}</span>
                      <span className="text-slate-600">
                        {p.width}×{p.height} {p.wall}" wall {p.length}" {p.notes && `• ${p.notes}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {generated.length > 0 && (
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors"
                    onClick={handleAddToDrawing}
                  >
                    Add to Drawing
                  </button>
                  <button
                    className="flex-1 py-1.5 bg-accent hover:bg-orange-600 text-white text-xs font-semibold rounded transition-colors"
                    onClick={handleReplaceDrawing}
                  >
                    Replace Drawing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="px-5 pb-4">
          <div className="text-xs text-slate-600 bg-slate-900 rounded p-2">
            Note: AI generation uses heuristic rules. For complex structures, add pieces manually from the Library.
          </div>
        </div>
      </div>
    </div>
  );
}
