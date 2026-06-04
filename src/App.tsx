import React, { useEffect, useCallback, useRef } from 'react';
import Toolbar from './components/Toolbar';
import LibraryPanel from './components/LibraryPanel';
import Canvas2D from './components/Canvas2D';
import Canvas3D from './components/Canvas3D';
import PropertiesPanel from './components/PropertiesPanel';
import BOMPanel from './components/BOMPanel';
import TitleBlockModal from './components/TitleBlockModal';
import AIGeneratorModal from './components/AIGeneratorModal';
import ContextMenu from './components/ContextMenu';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { useHistoryStore } from './store/historyStore';

export default function App() {
  const {
    pieces, connections, setPieces, setConnections, addPiece,
    zoom, setZoom, panX, panY, setPan, name, setName,
  } = useProjectStore();
  const {
    mode, setMode, selectedIds, setSelectedIds, activeView,
    showTitleBlockModal, showAIModal, setContextMenu,
    clipboard, setClipboard, holeAddMode, setHoleAddMode,
  } = useUIStore();
  const { undo, redo, push } = useHistoryStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'v' || e.key === 'V') { setMode('select'); setHoleAddMode(false); return; }
      if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); setMode('pan'); return; }
      if (e.key === 'o' || e.key === 'O') { setHoleAddMode(!holeAddMode); return; }
      if (e.key === 'Escape') { setMode('select'); setHoleAddMode(false); setSelectedIds([]); setContextMenu(null); return; }

      if (e.key === '=' || e.key === '+') { setZoom(Math.min(10, zoom * 1.25)); return; }
      if (e.key === '-') { setZoom(Math.max(0.05, zoom * 0.8)); return; }

      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const entry = redo();
        if (entry) { setPieces(entry.pieces); setConnections(entry.connections); }
        return;
      }
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        const entry = undo();
        if (entry) { setPieces(entry.pieces); setConnections(entry.connections); }
        return;
      }

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        setClipboard(pieces.filter(p => selectedIds.includes(p.id)));
        return;
      }
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        if (clipboard.length > 0) {
          push({ pieces, connections });
          const newPieces = clipboard.map(p => ({ ...p, id: crypto.randomUUID(), x: p.x + 2, y: p.y + 2 }));
          newPieces.forEach(p => addPiece(p));
          setSelectedIds(newPieces.map(p => p.id));
        }
        return;
      }
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(pieces.map(p => p.id));
        return;
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          push({ pieces, connections });
          const duped = pieces
            .filter(p => selectedIds.includes(p.id))
            .map(p => ({ ...p, id: crypto.randomUUID(), x: p.x + 2, y: p.y + 2 }));
          duped.forEach(p => addPiece(p));
          setSelectedIds(duped.map(p => p.id));
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        push({ pieces, connections });
        useProjectStore.getState().deletePieces(selectedIds);
        setSelectedIds([]);
        return;
      }

      if (selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 1 : 0.125;
        const dx = e.key === 'ArrowLeft' ? -amount : e.key === 'ArrowRight' ? amount : 0;
        const dy = e.key === 'ArrowUp' ? -amount : e.key === 'ArrowDown' ? amount : 0;
        for (const id of selectedIds) {
          const p = pieces.find(p2 => p2.id === id);
          if (p) useProjectStore.getState().updatePiece(id, { x: p.x + dx, y: p.y + dy });
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (pieces.length === 0) { setZoom(1); setPan(200, 200); return; }
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const W = canvas.offsetWidth;
        const H = canvas.offsetHeight;
        const SCALE = 8;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pieces) {
          minX = Math.min(minX, p.x - p.length / 2);
          minY = Math.min(minY, p.y - p.height / 2);
          maxX = Math.max(maxX, p.x + p.length / 2);
          maxY = Math.max(maxY, p.y + p.height / 2);
        }
        const pad = 5;
        const bw = maxX - minX + pad * 2;
        const bh = maxY - minY + pad * 2;
        const nz = Math.max(0.05, Math.min(8, Math.min(W / (bw * SCALE), H / (bh * SCALE))));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        setPan(W / 2 - cx * nz * SCALE, H / 2 - cy * nz * SCALE);
        setZoom(nz);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && mode === 'pan') setMode('select');
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, selectedIds, pieces, connections, clipboard, holeAddMode, zoom,
    setMode, setSelectedIds, setZoom, setPan, setHoleAddMode, setClipboard, setContextMenu,
    undo, redo, push, addPiece, setPieces, setConnections]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify({ name, pieces, connections }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [name, pieces, connections]);

  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        push({ pieces, connections });
        if (data.name) setName(data.name);
        if (data.pieces) setPieces(data.pieces);
        if (data.connections) setConnections(data.connections);
      } catch {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [pieces, connections, push, setName, setPieces, setConnections]);

  return (
    <div className="flex flex-col h-screen bg-[#12151e] text-slate-200 overflow-hidden">
      <Toolbar onExportJSON={handleExportJSON} onImportJSON={handleImportJSON} />

      <div className="flex flex-1 min-h-0">
        <LibraryPanel />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0">
            {activeView === '2d' ? <Canvas2D /> : <Canvas3D />}

            <div className="absolute bottom-2 right-2 bg-[#1a1d2e]/90 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-500 flex gap-3">
              <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
              <span>{pieces.length} pieces</span>
              {selectedIds.length > 0 && <span className="text-orange-400">{selectedIds.length} selected</span>}
            </div>

            {holeAddMode && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-900/80 border border-yellow-600 rounded px-3 py-1.5 text-xs text-yellow-300 font-medium">
                Hole Add Mode — Click on a piece to add a hole  •  Esc to exit
              </div>
            )}
          </div>

          <BOMPanel />
        </div>

        <PropertiesPanel />
      </div>

      {showTitleBlockModal && <TitleBlockModal />}
      {showAIModal && <AIGeneratorModal />}
      <ContextMenu />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
