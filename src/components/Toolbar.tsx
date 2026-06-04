import React, { useState } from 'react';
import {
  MousePointer2, Hand, Crosshair, Undo2, Redo2,
  Download, Trash2, Copy, Clipboard, FileText, Sparkles,
  ZoomIn, ZoomOut, Maximize2, LayoutGrid, Box
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';
import { exportPDF } from '../lib/pdfExport';

interface ToolbarProps {
  onExportJSON: () => void;
  onImportJSON: () => void;
}

export default function Toolbar({ onExportJSON, onImportJSON }: ToolbarProps) {
  const { pieces, connections, zoom, panX, panY, setZoom, setPan, deletePieces, setPieces, setConnections, titleBlock, name } = useProjectStore();
  const { mode, setMode, selectedIds, setSelectedIds, clipboard, setClipboard, holeAddMode, setHoleAddMode, activeView, setActiveView, setShowTitleBlockModal, setShowAIModal } = useUIStore();
  const { canUndo, canRedo, undo, redo, push } = useHistoryStore();
  const [exporting, setExporting] = useState(false);

  const handleUndo = () => {
    const entry = undo();
    if (entry) {
      setPieces(entry.pieces);
      setConnections(entry.connections);
    }
  };

  const handleRedo = () => {
    const entry = redo();
    if (entry) {
      setPieces(entry.pieces);
      setConnections(entry.connections);
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    push({ pieces, connections });
    deletePieces(selectedIds);
    setSelectedIds([]);
  };

  const handleCopy = () => {
    const selected = pieces.filter(p => selectedIds.includes(p.id));
    setClipboard(selected);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;
    push({ pieces, connections });
    const newPieces = clipboard.map(p => ({
      ...p,
      id: crypto.randomUUID(),
      x: p.x + 2,
      y: p.y + 2,
    }));
    newPieces.forEach(p => useProjectStore.getState().addPiece(p));
    setSelectedIds(newPieces.map(p => p.id));
  };

  const handleFitView = () => {
    if (pieces.length === 0) {
      setZoom(1);
      setPan(200, 200);
      return;
    }
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
    const bw = (maxX - minX + pad * 2);
    const bh = (maxY - minY + pad * 2);
    const scaleX = W / (bw * SCALE);
    const scaleY = H / (bh * SCALE);
    const newZoom = Math.max(0.05, Math.min(8, Math.min(scaleX, scaleY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setPan(W / 2 - cx * newZoom * SCALE, H / 2 - cy * newZoom * SCALE);
    setZoom(newZoom);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const url = exportPDF(pieces, titleBlock, name);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_drawing.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const btnBase = 'flex items-center justify-center w-9 h-9 rounded transition-colors duration-150 focus:outline-none';
  const btn = `${btnBase} text-slate-400 hover:text-slate-100 hover:bg-slate-700`;
  const btnActive = `${btnBase} text-white bg-accent`;
  const btnDisabled = `${btnBase} text-slate-600 cursor-not-allowed`;

  const Divider = () => <div className="w-px h-6 bg-slate-700 mx-1" />;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1d2e] border-b border-slate-800 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
          <span className="text-white font-black text-xs">F</span>
        </div>
        <span className="font-bold text-slate-200 text-sm tracking-wide">FabDraw</span>
      </div>

      <Divider />

      {/* Mode tools */}
      <button
        className={mode === 'select' && !holeAddMode ? btnActive : btn}
        onClick={() => { setMode('select'); setHoleAddMode(false); }}
        title="Select (V)"
      >
        <MousePointer2 size={16} />
      </button>
      <button
        className={mode === 'pan' ? btnActive : btn}
        onClick={() => setMode('pan')}
        title="Pan (Space/H)"
      >
        <Hand size={16} />
      </button>
      <button
        className={holeAddMode ? btnActive : btn}
        onClick={() => setHoleAddMode(!holeAddMode)}
        title="Add Hole (O)"
      >
        <Crosshair size={16} />
      </button>

      <Divider />

      {/* Undo/Redo */}
      <button
        className={canUndo ? btn : btnDisabled}
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={16} />
      </button>
      <button
        className={canRedo ? btn : btnDisabled}
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={16} />
      </button>

      <Divider />

      {/* Edit ops */}
      <button
        className={selectedIds.length > 0 ? btn : btnDisabled}
        onClick={handleCopy}
        disabled={selectedIds.length === 0}
        title="Copy (Ctrl+C)"
      >
        <Copy size={16} />
      </button>
      <button
        className={clipboard.length > 0 ? btn : btnDisabled}
        onClick={handlePaste}
        disabled={clipboard.length === 0}
        title="Paste (Ctrl+V)"
      >
        <Clipboard size={16} />
      </button>
      <button
        className={selectedIds.length > 0 ? `${btnBase} text-red-400 hover:text-red-300 hover:bg-red-900/30` : btnDisabled}
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        title="Delete (Del)"
      >
        <Trash2 size={16} />
      </button>

      <Divider />

      {/* Zoom */}
      <button className={btn} onClick={() => { const nz = Math.min(10, zoom * 1.25); setZoom(nz); }} title="Zoom In (+)">
        <ZoomIn size={16} />
      </button>
      <span className="text-slate-400 text-xs font-mono w-12 text-center tabular-nums">
        {(zoom * 100).toFixed(0)}%
      </span>
      <button className={btn} onClick={() => { const nz = Math.max(0.05, zoom * 0.8); setZoom(nz); }} title="Zoom Out (-)">
        <ZoomOut size={16} />
      </button>
      <button className={btn} onClick={handleFitView} title="Fit View (F)">
        <Maximize2 size={16} />
      </button>

      <Divider />

      {/* View toggle */}
      <button
        className={activeView === '2d' ? btnActive : btn}
        onClick={() => setActiveView('2d')}
        title="2D View"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        className={activeView === '3d' ? btnActive : btn}
        onClick={() => setActiveView('3d')}
        title="3D View"
      >
        <Box size={16} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <button
        className={`${btnBase} px-3 gap-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 text-xs font-medium`}
        onClick={() => setShowAIModal(true)}
        title="AI Generator"
      >
        <Sparkles size={14} />
        AI
      </button>
      <button className={btn} onClick={() => setShowTitleBlockModal(true)} title="Edit Title Block">
        <FileText size={16} />
      </button>
      <button
        className={`${btnBase} px-3 gap-1.5 text-accent hover:text-orange-400 hover:bg-orange-900/20 text-xs font-medium ${exporting ? 'opacity-50' : ''}`}
        onClick={handleExportPDF}
        disabled={exporting}
        title="Export PDF"
      >
        <Download size={14} />
        {exporting ? 'Exporting...' : 'PDF'}
      </button>
      <button className={btn} onClick={onExportJSON} title="Export JSON">
        <span className="text-xs font-mono">JSON</span>
      </button>

      {/* Project name */}
      <Divider />
      <div className="text-slate-400 text-xs truncate max-w-32" title={name}>{name}</div>
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1" title="Saved" />
    </div>
  );
}
