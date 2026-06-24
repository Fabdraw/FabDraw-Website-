import React, { useEffect, useRef, useState } from 'react';
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

  // Mobile panel state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propsPanelOpen, setPropsPanelOpen] = useState(false);

  // Props panel drag-to-resize (touch)
  const propsPanelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(50);
  const [propsPanelH, setPropsPanelH] = useState(55); // percent of screen height

  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartH.current = propsPanelH;
  };
  const handleDragHandleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = dragStartY.current - e.touches[0].clientY;
    const screenH = window.innerHeight;
    const delta = (dy / screenH) * 100;
    setPropsPanelH(Math.max(20, Math.min(90, dragStartH.current + delta)));
  };
  const handleDragHandleTouchEnd = () => { dragStartY.current = null; };

  // Auto-show properties panel on mobile when something is selected
  useEffect(() => {
    if (selectedIds.length > 0 && window.innerWidth < 1024) {
      setPropsPanelOpen(true);
    }
  }, [selectedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (!ctrl) {
        if (e.key === 'v' || e.key === 'V') { setMode('select'); return; }
        if (e.key === '1') { setMode('select'); return; }
        if (e.key === '2') { setMode('dimension'); return; }
        if (e.key === '3') { setMode('connect'); return; }
        if (e.key === 'd' || e.key === 'D') { setMode('dimension'); return; }
        if (e.key === 'c' || e.key === 'C') { setMode('connect'); return; }
        if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); prevModeRef.current = mode; setMode('pan'); return; }
        if (e.key === 'f' || e.key === 'F') {
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
            ...m, id: crypto.randomUUID(),
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
              ...m, id: crypto.randomUUID(),
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
      <Toolbar onToggleSidebar={() => setSidebarOpen(o => !o)} />

      {/* ── DESKTOP layout (lg+): flex row, sidebars inline ── */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <LibraryPanel />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative min-h-0">
            {activeView === '2d' ? <Canvas2D /> : <Canvas3D />}
            <div className="absolute bottom-2 right-2 rounded px-2 py-1 text-xs font-mono text-slate-500 flex gap-3" style={{ background: 'rgba(26,29,39,0.9)', border: '1px solid #2e3350' }}>
              <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
              <span>{members.length} members</span>
              {selectedIds.length > 0 && <span className="text-orange-400">{selectedIds.length} selected</span>}
            </div>
          </div>
          <BOMPanel />
        </div>
        <PropertiesPanel />
      </div>

      {/* ── MOBILE layout (< lg): canvas full screen, overlays ── */}
      <div className="flex lg:hidden flex-1 min-h-0 relative overflow-hidden">

        {/* Canvas fills everything */}
        <div className="absolute inset-0">
          {activeView === '2d' ? <Canvas2D /> : <Canvas3D />}
          <div className="absolute bottom-2 right-2 rounded px-2 py-1 text-xs font-mono text-slate-500 flex gap-3" style={{ background: 'rgba(26,29,39,0.9)', border: '1px solid #2e3350' }}>
            <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
            <span>{members.length} members</span>
            {selectedIds.length > 0 && <span className="text-orange-400">{selectedIds.length} selected</span>}
          </div>
        </div>

        {/* Backdrop — shown when any overlay is open */}
        {(sidebarOpen || propsPanelOpen) && (
          <div
            className="absolute inset-0 bg-black/50 z-40"
            onClick={() => { setSidebarOpen(false); setPropsPanelOpen(false); }}
          />
        )}

        {/* LEFT SIDEBAR — slides in from left */}
        <div
          className="absolute top-0 left-0 h-full z-50 transition-transform duration-200 flex flex-col"
          style={{
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            width: '280px',
            maxWidth: '85vw',
            background: '#1a1d27',
          }}
        >
          {/* Close button header */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ background: '#0f1117', borderBottom: '1px solid #2e3350' }}>
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Library</span>
            <button
              className="w-11 h-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
            >✕</button>
          </div>
          {/* LibraryPanel fills remaining height, manages its own internal scroll */}
          <div className="flex-1 min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
            <LibraryPanel />
          </div>
        </div>

        {/* PROPERTIES PANEL — slides up from bottom */}
        <div
          ref={propsPanelRef}
          className="absolute left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl overflow-hidden"
          style={{
            height: `${propsPanelH}%`,
            transform: propsPanelOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: dragStartY.current !== null ? 'none' : 'transform 0.2s ease',
            background: '#1a1d27',
            borderTop: '2px solid #2e3350',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Drag handle — touch to resize or swipe down to close */}
          <div
            className="flex flex-col items-center pt-3 pb-2 shrink-0 cursor-ns-resize"
            style={{ touchAction: 'none' }}
            onTouchStart={handleDragHandleTouchStart}
            onTouchMove={handleDragHandleTouchMove}
            onTouchEnd={(e) => {
              handleDragHandleTouchEnd();
              // If dragged down past 30%, close
              if (propsPanelH < 25) setPropsPanelOpen(false);
            }}
          >
            <div className="w-12 h-1.5 rounded-full bg-slate-500" />
          </div>
          {/* Header row: title + close */}
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Properties</span>
            <button
              className="w-11 h-11 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-white/10"
              onClick={() => { setPropsPanelOpen(false); setPropsPanelH(55); }}
            >✕</button>
          </div>
          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PropertiesPanel />
          </div>
        </div>

        {/* BOM — collapsed tab at bottom (only visible when props panel is closed) */}
        {!propsPanelOpen && (
          <div className="absolute bottom-0 left-0 right-0 z-30">
            <BOMPanel />
          </div>
        )}
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
