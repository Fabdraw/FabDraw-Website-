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
  const { project, setProject, setProjectName, addMember, deleteMembers } = useProjectStore();
  const { members, connections } = project;
  const {
    mode, setMode, selectedIds, setSelectedIds, activeView,
    showTitleBlockModal, showAIModal, setContextMenu,
    clipboard, setClipboard,
    zoom, setZoom, panX, panY, setPan,
  } = useUIStore();
  const { undo, redo, push } = useHistoryStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (e.key === 'v' || e.key === 'V') { setMode('select'); return; }
      if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); setMode('pan'); return; }
      if (e.key === 'Escape') { setMode('select'); setSelectedIds([]); setContextMenu(null); return; }

      if (e.key === '=' || e.key === '+') { setZoom(Math.min(10, zoom * 1.25)); return; }
      if (e.key === '-') { setZoom(Math.max(0.05, zoom * 0.8)); return; }

      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const snap = redo();
        if (snap) setProject({ ...project, members: snap.members, connections: snap.connections });
        return;
      }
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        const snap = undo();
        if (snap) setProject({ ...project, members: snap.members, connections: snap.connections });
        return;
      }

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        setClipboard(members.filter((m) => selectedIds.includes(m.id)));
        return;
      }
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        if (clipboard.length > 0) {
          push({ members, connections });
          const newMembers = clipboard.map((m) => ({
            ...m,
            id: crypto.randomUUID(),
            position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 },
          }));
          newMembers.forEach((m) => addMember(m));
          setSelectedIds(newMembers.map((m) => m.id));
        }
        return;
      }
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(members.map((m) => m.id));
        return;
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          push({ members, connections });
          const duped = members
            .filter((m) => selectedIds.includes(m.id))
            .map((m) => ({
              ...m,
              id: crypto.randomUUID(),
              position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 },
            }));
          duped.forEach((m) => addMember(m));
          setSelectedIds(duped.map((m) => m.id));
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        push({ members, connections });
        deleteMembers(selectedIds);
        setSelectedIds([]);
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
  }, [mode, selectedIds, members, connections, clipboard, zoom,
    setMode, setSelectedIds, setZoom, setPan, setClipboard, setContextMenu,
    undo, redo, push, addMember, deleteMembers, setProject, project]);

  const handleExportJSON = useCallback(() => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          push({ members, connections });
          setProject({ ...project, ...data });
        } catch {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [members, connections, push, setProject, project]
  );

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
              <span>{members.length} members</span>
              {selectedIds.length > 0 && (
                <span className="text-orange-400">{selectedIds.length} selected</span>
              )}
            </div>
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
