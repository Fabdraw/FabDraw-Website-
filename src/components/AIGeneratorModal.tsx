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
];

type ParsedMember = Omit<Member, 'id'>;

function mapAIMember(obj: Record<string, unknown>): ParsedMember {
  return {
    type: (obj.type as Member['type']) || 'square_tube',
    size: typeof obj.size === 'string' ? obj.size : '2x2',
    wallThickness: typeof obj.wallThickness === 'string' ? obj.wallThickness : '0.125',
    grade: (obj.grade as Member['grade']) || 'mild',
    length: typeof obj.length === 'number' ? obj.length : 24,
    position: {
      x: typeof obj.x === 'number' ? obj.x : 0,
      y: typeof obj.y === 'number' ? obj.y : 0,
      z: typeof obj.z === 'number' ? obj.z : 0,
    },
    rotation: {
      x: 0,
      y: 0,
      z: typeof obj.angle === 'number' ? obj.angle : 0,
    },
    holes: [],
  };
}

async function generateStructureAI(prompt: string): Promise<ParsedMember[]> {
  // Stubbed — would call AI API
  throw new Error('AI generation requires API key configuration');
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
      setResult('AI generation is not configured. Check your API key or add members manually.');
      console.error('AI generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDrawing = () => {
    historyStore.push({ members, connections });
    for (const m of generated) {
      addMember(m);
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
