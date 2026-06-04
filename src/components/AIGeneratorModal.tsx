import React, { useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
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

const AI_SYSTEM_PROMPT = `You are a fabrication CAD assistant. When given a description of a metal structure return ONLY a valid JSON array of piece objects with no markdown no explanation no code blocks just raw JSON array starting with [ and ending with ].

Rules for piece fields:
- id: unique string like "p1" "p2" etc
- type: one of square_tube round_tube rect_tube pipe angle channel ibeam flat_bar sheet plate
- grade: one of mild_steel stainless aluminum
- width: outer width in inches (for square_tube this equals height)
- height: outer height in inches
- wall: wall thickness in inches
- length: piece length in inches
- x: X position of piece CENTER in inches (for horizontal pieces) or XY position (for upright)
- y: Y position of piece CENTER in inches
- angle: rotation degrees 0=along X axis 90=along Y axis
- orientation: horizontal or upright
- zHeight: height above floor in inches (0 for floor level, use legLength minus tubeSize for frame rails at top of legs)
- notes: empty string
- weldSymbol: empty string
- holes: empty array

For a table with 4 legs:
- 4 upright leg pieces at corner positions, orientation upright, length = leg height
- 4 horizontal frame rails connecting leg tops, orientation horizontal, zHeight = legLength - tubeSize
- Rails along X axis: angle 0, length = tableWidth (or tableWidth minus tubeSize*2 for inside fit)
- Rails along Y axis: angle 90, length = tableDepth (or tableDepth minus tubeSize*2)
- Optional sheet metal top: type sheet, orientation horizontal, angle 0, zHeight = legLength, length = tableWidth, height = tableDepth

Example 48x48 table, 34 inch legs, 2x2 0.125 wall square tube:
Legs at corners: x:0,y:0 and x:48,y:0 and x:0,y:48 and x:48,y:48 all upright length:34
X-direction rails: x:24,y:2 and x:24,y:46 angle:0 zHeight:32 length:44
Y-direction rails: x:2,y:24 and x:46,y:24 angle:90 zHeight:32 length:44

Always return valid JSON array only. No text before or after the array.`;

const VALID_TYPES = ['square_tube','round_tube','rect_tube','pipe','angle','channel','ibeam','flat_bar','sheet','plate'] as const;
const VALID_GRADES = ['mild_steel','stainless','aluminum'] as const;
const VALID_ORIENTATIONS = ['horizontal','vertical','upright'] as const;

type ParsedPiece = Omit<Piece, 'id'>;

function mapAIPiece(obj: Record<string, unknown>): ParsedPiece {
  const type = VALID_TYPES.includes(obj.type as Piece['type']) ? (obj.type as Piece['type']) : 'square_tube';
  const grade = VALID_GRADES.includes(obj.grade as Piece['grade']) ? (obj.grade as Piece['grade']) : 'mild_steel';
  const orientation = VALID_ORIENTATIONS.includes(obj.orientation as Piece['orientation']) ? (obj.orientation as Piece['orientation']) : 'horizontal';
  return {
    type,
    grade,
    width: typeof obj.width === 'number' ? obj.width : 2,
    height: typeof obj.height === 'number' ? obj.height : 2,
    wall: typeof obj.wall === 'number' ? obj.wall : 0.125,
    length: typeof obj.length === 'number' ? obj.length : 24,
    x: typeof obj.x === 'number' ? obj.x : 0,
    y: typeof obj.y === 'number' ? obj.y : 0,
    angle: typeof obj.angle === 'number' ? obj.angle : 0,
    orientation,
    zHeight: typeof obj.zHeight === 'number' ? obj.zHeight : 0,
    notes: typeof obj.notes === 'string' ? obj.notes : '',
    weldSymbol: typeof obj.weldSymbol === 'string' ? obj.weldSymbol : '',
    holes: Array.isArray(obj.holes) ? obj.holes : [],
  };
}

async function generateStructureAI(prompt: string): Promise<ParsedPiece[]> {
  const client = new Anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: AI_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  // Strip markdown fences if present
  const stripped = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(stripped);
  if (!Array.isArray(parsed)) throw new Error('AI did not return an array');
  return (parsed as Record<string, unknown>[]).map(mapAIPiece);
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

    try {
      const parsedPieces = await generateStructureAI(prompt);
      setGenerated(parsedPieces);
      setResult(`Generated ${parsedPieces.length} pieces based on your description. Review and click "Add to Drawing" to place them.`);
    } catch (err) {
      setResult('Failed to generate. Check your API key or try a more specific description.');
      console.error('AI generation error:', err);
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
