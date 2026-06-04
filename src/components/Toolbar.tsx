import React, { useState } from 'react';
import {
  MousePointer2, Hand, Undo2, Redo2,
  Download, Trash2, Copy, Clipboard, LayoutGrid, Sparkles,
  ZoomIn, ZoomOut, Maximize2, Box, Check, Save
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
  const { pieces, connections, zoom, panX, panY, setZoom, setPan, deletePieces, setPieces, setConnections, titleBlock, name, setName } = useProjectStore();
  const { mode, setMode, selectedIds, setSelectedIds, clipboard, setClipboard, holeAddMode, setHoleAddMode, activeView, setActiveView, setShowTitleBlockModal, setShowAIModal } = useUIStore();
  const { canUndo, canRedo, undo, redo, push } = useHistoryStore();
  const [exporting, setExporting] = useState(false);
  const [editingName, setEditingName] = useState(false);

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

  // Button style helpers
  const btn = 'flex items-center justify-center w-[30px] h-[30px] rounded-md transition-colors focus:outline-none text-[#475569] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#94a3b8]';
  const btnActive = 'flex items-center justify-center w-[30px] h-[30px] rounded-md focus:outline-none bg-[rgba(249,115,22,0.15)] text-[#f97316]';
  const btnDisabled = 'flex items-center justify-center w-[30px] h-[30px] rounded-md text-[#2d3748] cursor-not-allowed';

  const Divider = () => <div className="w-px h-5 mx-2" style={{ background: 'rgba(255,255,255,0.08)' }} />;

  return (
    <div
      className="flex items-center gap-1 px-3 select-none shrink-0"
      style={{
        height: '48px',
        background: '#0f1117',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo + project name */}
      <div className="flex items-center gap-2 mr-2">
        <div
          className="w-2 h-2 rounded-sm shrink-0"
          style={{ background: '#f97316' }}
        />
        <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: '#f1f5f9' }}>
          FABDRAW
        </span>
      </div>

      <input
        className="focus:outline-none bg-transparent border-0 border-b border-transparent focus:border-[#f97316] text-[#f1f5f9] text-[13px] w-32 transition-colors"
        style={{ borderBottom: editingName ? '1px solid #f97316' : '1px solid transparent' }}
        value={name}
        onChange={e => setName?.(e.target.value)}
        onFocus={() => setEditingName(true)}
        onBlur={() => setEditingName(false)}
        title="Project name"
      />

      {/* Save indicator */}
      <div className="w-1.5 h-1.5 rounded-full ml-1 shrink-0" style={{ background: '#22c55e' }} title="Saved" />

      <Divider />

      {/* Undo/Redo */}
      <button
        className={canUndo ? btn : btnDisabled}
        onClick={handleUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={15} />
      </button>
      <button
        className={canRedo ? btn : btnDisabled}
        onClick={handleRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={15} />
      </button>

      <Divider />

      {/* Copy/Paste/Delete */}
      <button
        className={selectedIds.length > 0 ? btn : btnDisabled}
        onClick={handleCopy}
        disabled={selectedIds.length === 0}
        title="Copy (Ctrl+C)"
      >
        <Copy size={15} />
      </button>
      <button
        className={clipboard.length > 0 ? btn : btnDisabled}
        onClick={handlePaste}
        disabled={clipboard.length === 0}
        title="Paste (Ctrl+V)"
      >
        <Clipboard size={15} />
      </button>
      <button
        className={selectedIds.length > 0 ? 'flex items-center justify-center w-[30px] h-[30px] rounded-md text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors' : btnDisabled}
        onClick={handleDelete}
        disabled={selectedIds.length === 0}
        title="Delete (Del)"
      >
        <Trash2 size={15} />
      </button>

      <Divider />

      {/* Select / Pan */}
      <button
        className={mode === 'select' && !holeAddMode ? btnActive : btn}
        onClick={() => { setMode('select'); setHoleAddMode(false); }}
        title="Select (V)"
      >
        <MousePointer2 size={15} />
      </button>
      <button
        className={mode === 'pan' ? btnActive : btn}
        onClick={() => setMode('pan')}
        title="Pan (Space/H)"
      >
        <Hand size={15} />
      </button>

      <Divider />

      {/* Zoom */}
      <button className={btn} onClick={() => { const nz = Math.max(0.05, zoom * 0.8); setZoom(nz); }} title="Zoom Out (-)">
        <ZoomOut size={15} />
      </button>
      <span
        className="text-center tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94a3b8', width: '42px' }}
      >
        {(zoom * 100).toFixed(0)}%
      </span>
      <button className={btn} onClick={() => { const nz = Math.min(10, zoom * 1.25); setZoom(nz); }} title="Zoom In (+)">
        <ZoomIn size={15} />
      </button>
      <button className={btn} onClick={handleFitView} title="Fit View (F)">
        <Maximize2 size={15} />
      </button>

      <Divider />

      {/* 2D / 3D toggle */}
      <button
        className={activeView === '2d' ? btnActive : btn}
        onClick={() => setActiveView('2d')}
        title="2D View"
        style={{ fontSize: '11px', fontWeight: 700, width: '30px', height: '30px' }}
      >
        2D
      </button>
      <button
        className={activeView === '3d' ? btnActive : btn}
        onClick={() => setActiveView('3d')}
        title="3D View"
        style={{ fontSize: '11px', fontWeight: 700, width: '30px', height: '30px' }}
      >
        3D
      </button>

      <Divider />

      {/* Title Block */}
      <button
        className={btn}
        onClick={() => setShowTitleBlockModal(true)}
        title="Edit Title Block"
      >
        <LayoutGrid size={15} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export PDF */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-medium"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          fontSize: '12px',
          opacity: exporting ? 0.5 : 1,
        }}
        onClick={handleExportPDF}
        disabled={exporting}
        title="Export PDF"
      >
        <Download size={13} />
        {exporting ? 'Exporting...' : 'Export PDF'}
      </button>

      {/* AI button */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ml-1"
        style={{
          border: '1px solid #f97316',
          color: '#f97316',
          background: 'transparent',
          fontSize: '12px',
        }}
        onClick={() => setShowAIModal(true)}
        title="AI Generator"
      >
        <Sparkles size={13} />
        AI
      </button>
    </div>
  );
}
