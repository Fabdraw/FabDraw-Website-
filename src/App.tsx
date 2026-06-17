import React, { useEffect } from 'react';
import Toolbar from './components/Toolbar';
import LibraryPanel from './components/LibraryPanel';
import Canvas2D from './components/Canvas2D';
import Canvas3D from './components/Canvas3D';
import PropertiesPanel from './components/PropertiesPanel';
import BOMPanel from './components/BOMPanel';
import TitleBlockModal from './components/TitleBlockModal';
import AIGeneratorModal from './components/AIGeneratorModal';
import PhotoModal from './components/PhotoModal';
import TemplateLibrary from './components/TemplateLibrary';
import ContextMenu from './components/ContextMenu';
import HelpModal from './components/HelpModal';
import PDFPreview from './components/PDFPreview';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';
import { useHistoryStore } from './store/historyStore';

export default function App() {
  const { project, setProject, addMember } = useProjectStore();
  const { members, connections, dimensions, groupNames } = project;
  const {
    mode, setMode, selectedIds, setSelectedIds, activeView,
    showTitleBlockModal, showAIModal, showPhotoModal, showTemplateModal,
    showHelpModal, showPDFExportModal,
    setContextMenu,
    clipboard, setClipboard,
    zoom, setZoom, setPan,
  } = useUIStore();
  const prevModeRef = React.useRef(mode);
  const { undo, redo, push } = useHistoryStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Mode shortcuts (not when ctrl is held)
      if (!ctrl) {
        if (e.key === 'v' || e.key === 'V') { setMode('select'); return; }
        if (e.key === '1') { setMode('select'); return; }
        if (e.key === '2') { setMode('dimension'); return; }
        if (e.key === '3') { setMode('connect'); return; }
        if (e.key === 'd' || e.key === 'D') { setMode('dimension'); return; }
        if (e.key === 'c' || e.key === 'C') { setMode('connect'); return; }
        if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); prevModeRef.current = mode; setMode('pan'); return; }
        if (e.key === 'f' || e.key === 'F') {
          // Fit view — same logic as Toolbar handleFitView
          if (members.length === 0) { setZoom(1); setPan(200, 200); return; }
          const canvas = document.querySelector('canvas');
          const W = canvas?.offsetWidth ?? 800, H = canvas?.offsetHeight ?? 600;
          const S = 8;
          let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
          for (const m of members) {
            mnX = Math.min(mnX, m.position.x - m.length / 2);
            mnY = Math.min(mnY, m.position.y - 2);
            mxX = Math.max(mxX, m.position.x + m.length / 2);
            mxY = Math.max(mxY, m.position.y + 2);
          }
          const nz = Math.max(0.05, Math.min(8, Math.min(W / ((mxX - mnX + 10) * S), H / ((mxY - mnY + 10) * S))));
          setPan(W / 2 - ((mnX + mxX) / 2) * nz * S, H / 2 - ((mnY + mxY) / 2) * nz * S);
          setZoom(nz);
          return;
        }
      }

      if (e.key === 'Escape') { setMode('select'); setSelectedIds([]); setContextMenu(null); return; }

      if (e.key === '=' || e.key === '+') { setZoom(Math.min(10, zoom * 1.25)); return; }
      if (e.key === '-') { setZoom(Math.max(0.05, zoom * 0.8)); return; }

      if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const snap = redo();
        if (snap) setProject({ ...project, members: snap.members, connections: snap.connections, dimensions: snap.dimensions ?? project.dimensions, groupNames: snap.groupNames ?? project.groupNames });
        return;
      }
      if (ctrl && e.key === 'z') {
        e.preventDefault();
        const snap = undo();
        if (snap) setProject({ ...project, members: snap.members, connections: snap.connections, dimensions: snap.dimensions ?? project.dimensions, groupNames: snap.groupNames ?? project.groupNames });
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
          push({ members, connections, dimensions, groupNames });
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
          push({ members, connections, dimensions, groupNames });
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

    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && mode === 'pan') setMode(prevModeRef.current === 'pan' ? 'select' : prevModeRef.current);
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, selectedIds, members, connections, clipboard, zoom,
    setMode, setSelectedIds, setZoom, setPan, setClipboard, setContextMenu,
    undo, redo, push, addMember, setProject, project, dimensions, groupNames]);

  return (
    <div className="flex flex-col h-screen bg-[#12151e] text-slate-200 overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 min-h-0">
        <LibraryPanel />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0">
            {activeView === '2d' ? <Canvas2D /> : <Canvas3D />}

            <div className="absolute bottom-2 right-2 rounded px-2 py-1 text-xs font-mono text-slate-500 flex gap-3" style={{ background: 'rgba(26,29,39,0.9)', border: '1px solid #2e3350' }}>
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
      {showPhotoModal && <PhotoModal />}
      {showTemplateModal && <TemplateLibrary />}
      {showHelpModal && <HelpModal />}
      {showPDFExportModal && <PDFPreview />}
      <ContextMenu />
    </div>
  );
}
