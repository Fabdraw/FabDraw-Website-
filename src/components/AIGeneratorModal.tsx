import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import type { Member } from '../types';

const EXAMPLES = [
  '10-foot workbench frame with 2x2 square tube legs and a flat bar top rail',
  '6x6 ft welding table with 2x2 square tube and cross bracing',
  'Simple 4-legged cart, 24x48 inch, 30 inches tall with 1.5x1.5 square tube',
  'Motorcycle trailer frame 5 feet long by 2.5 feet wide with round tube',
];

const SYSTEM_PROMPT = `You are a fabrication CAD assistant for FabDraw. Return ONLY a valid JSON array of Member objects. No markdown, no code fences, no explanation. Start with [ and end with ].

Each Member object must have EXACTLY these fields:
{
  "type": one of: "square_tube" | "round_tube" | "rect_tube" | "pipe" | "angle" | "channel" | "i_beam" | "flat_bar" | "sheet" | "plate",
  "size": string like "2x2" for square/rect/angle/channel/i_beam, "2" for round/pipe, "1/4x2" for flat_bar, "48x96" for sheet/plate,
  "wallThickness": string like "0.125" or "0.083",
  "grade": one of: "mild" | "stainless" | "aluminum",
  "length": number in inches,
  "position": { "x": number, "y": number, "z": number },
  "rotation": { "x": 0, "y": number (degrees, 0=horizontal), "z": 0 },
  "holes": []
}

For a rectangular frame/table with width W, depth D, height H using square tube SIZE:
- 4 legs: type="square_tube", rotation.x=90 (upright), length=H, position at corners: (0,0,0),(W,0,0),(0,D,0),(W,D,0)
- 2 long rails: rotation.y=0, length=W, position.x=W/2, position.y=0 and D, position.z=H-SIZE
- 2 short rails: rotation.y=90, length=D, position.x=0 and W, position.y=D/2, position.z=H-SIZE

Position x/y are the 2D plan coordinates (inches). Position z is height above floor. Never omit any field.`;

type ParsedMember = Omit<Member, 'id'>;

function mapAIMember(obj: Record<string, unknown>): ParsedMember {
  const pos = (obj.position ?? {}) as Record<string, unknown>;
  const rot = (obj.rotation ?? {}) as Record<string, unknown>;
  return {
    type: (obj.type as Member['type']) || 'square_tube',
    size: typeof obj.size === 'string' ? obj.size : '2x2',
    wallThickness: typeof obj.wallThickness === 'string' ? obj.wallThickness : '0.125',
    grade: (['mild', 'stainless', 'aluminum'].includes(obj.grade as string) ? obj.grade as Member['grade'] : 'mild'),
    length: typeof obj.length === 'number' ? obj.length : 24,
    position: {
      x: typeof pos.x === 'number' ? pos.x : 0,
      y: typeof pos.y === 'number' ? pos.y : 0,
      z: typeof pos.z === 'number' ? pos.z : 0,
    },
    rotation: {
      x: typeof rot.x === 'number' ? rot.x : 0,
      y: typeof rot.y === 'number' ? rot.y : 0,
      z: typeof rot.z === 'number' ? rot.z : 0,
    },
    holes: [],
  };
}

async function callAnthropicAPI(systemPrompt: string, userContent: string): Promise<string> {
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to your .env file.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '') as string;
}

function parseMembers(text: string): ParsedMember[] {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  const arr = JSON.parse(cleaned);
  if (!Array.isArray(arr)) throw new Error('Expected a JSON array');
  return arr.map((obj: unknown) => mapAIMember(obj as Record<string, unknown>));
}

async function generateStructureAI(prompt: string): Promise<ParsedMember[]> {
  const text = await callAnthropicAPI(SYSTEM_PROMPT, prompt);
  return parseMembers(text);
}

export default function AIGeneratorModal() {
  const { project, addMember } = useProjectStore();
  const { members, connections } = project;
  const { setShowAIModal } = useUIStore();
  const historyStore = useHistoryStore();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [generated, setGenerated] = useState<ParsedMember[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult('');
    setGenerated([]);

    try {
      const parsedMembers = await generateStructureAI(prompt);
      setGenerated(parsedMembers);
      setResult(`Generated ${parsedMembers.length} members based on your description.`);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const { setPanZoom } = useUIStore();

  const handleAddToDrawing = () => {
    historyStore.push({ members, connections });
    for (const m of generated) addMember(m);

    // Auto-fit canvas to show generated members
    const all = [...members, ...generated.map(m => ({ ...m, id: '' }))];
    if (all.length > 0) {
      const canvas = document.querySelector('canvas');
      const W = canvas?.offsetWidth ?? 800;
      const H = canvas?.offsetHeight ?? 600;
      const SCALE = 8;
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (const m of all) {
        mnX = Math.min(mnX, m.position.x - m.length / 2);
        mnY = Math.min(mnY, m.position.y - 2);
        mxX = Math.max(mxX, m.position.x + m.length / 2);
        mxY = Math.max(mxY, m.position.y + 2);
      }
      const z = Math.max(0.05, Math.min(8, Math.min(W * 0.8 / ((mxX - mnX + 10) * SCALE), H * 0.8 / ((mxY - mnY + 10) * SCALE))));
      const cx = (mnX + mxX) / 2, cy = (mnY + mxY) / 2;
      setPanZoom(W / 2 - cx * z * SCALE, H / 2 - cy * z * SCALE, z);
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
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Describe your structure</label>
            <textarea
              className="flex-1 w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-purple-500 resize-none h-24"
              placeholder="e.g. A 6x4 foot welding table frame with 2x2 square tube legs..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
            />
            <div className="text-xs text-slate-600 mt-1">Ctrl+Enter to generate</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">Examples:</div>
            <div className="space-y-1">
              {EXAMPLES.map((ex, i) => (
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

          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Generating...' : 'Generate Structure'}
          </button>

          {result && (
            <div className="bg-slate-900 rounded-lg p-3">
              <div className="text-xs text-slate-300 mb-2">{result}</div>
              {generated.length > 0 && (
                <>
                  <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                    {generated.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-4 text-slate-600">{i + 1}</span>
                        <span className="text-slate-300">{m.type.replace('_', ' ')}</span>
                        <span className="text-slate-600">{m.size} {m.wallThickness}" wall {m.length}"</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition-colors"
                    onClick={handleAddToDrawing}
                  >
                    Add to Drawing
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
