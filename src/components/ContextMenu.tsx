import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, RotateCcw, Crosshair, FlipHorizontal, Layers } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';

export default function ContextMenu() {
  const { contextMenu, setContextMenu, selectedIds, setSelectedIds, setClipboard, clipboard } = useUIStore();
  const { pieces, connections, deletePieces, updatePiece, addPiece, setPieces, setConnections } = useProjectStore();
  const historyStore = useHistoryStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const pieceId = contextMenu.pieceId;
  const piece = pieceId ? pieces.find(p => p.id === pieceId) : null;

  const close = () => setContextMenu(null);

  const handleDuplicate = () => {
    const ids = pieceId ? [pieceId] : selectedIds;
    const toDupe = pieces.filter(p => ids.includes(p.id));
    historyStore.push({ pieces, connections });
    for (const p of toDupe) {
      addPiece({ ...p, id: crypto.randomUUID(), x: p.x + 2, y: p.y + 2 });
    }
    close();
  };

  const handleDelete = () => {
    const ids = pieceId ? [pieceId] : selectedIds;
    historyStore.push({ pieces, connections });
    deletePieces(ids);
    setSelectedIds([]);
    close();
  };

  const handleCopy = () => {
    const ids = pieceId ? [pieceId] : selectedIds;
    setClipboard(pieces.filter(p => ids.includes(p.id)));
    close();
  };

  const handleRotate90 = () => {
    const ids = pieceId ? [pieceId] : selectedIds;
    for (const id of ids) {
      const p = pieces.find(p2 => p2.id === id);
      if (p) updatePiece(id, { angle: (p.angle + 90) % 360 });
    }
    close();
  };

  const handleFlipH = () => {
    const ids = pieceId ? [pieceId] : selectedIds;
    for (const id of ids) {
      const p = pieces.find(p2 => p2.id === id);
      if (p) updatePiece(id, { angle: (360 - p.angle) % 360 });
    }
    close();
  };

  const handleSetUpright = () => {
    if (!pieceId) return;
    updatePiece(pieceId, { orientation: 'upright' });
    close();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: contextMenu.x,
    top: contextMenu.y,
    zIndex: 1000,
  };

  // Adjust if near edge
  const adjustedStyle = { ...menuStyle };
  if (contextMenu.x + 180 > window.innerWidth) adjustedStyle.left = contextMenu.x - 180;
  if (contextMenu.y + 300 > window.innerHeight) adjustedStyle.top = contextMenu.y - 200;

  const MenuItem = ({ icon, label, onClick, danger = false, disabled = false }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
        disabled
          ? 'text-slate-600 cursor-not-allowed'
          : danger
            ? 'text-red-400 hover:bg-red-900/30'
            : 'text-slate-300 hover:bg-slate-700'
      }`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );

  const Divider = () => <div className="h-px bg-slate-700 my-1" />;

  return (
    <div
      ref={menuRef}
      style={adjustedStyle}
      className="bg-[#1e2130] border border-slate-700 rounded-lg shadow-2xl w-44 py-1 overflow-hidden"
    >
      {contextMenu.type === 'piece' && piece && (
        <>
          <div className="px-3 py-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {piece.type.replace(/_/g, ' ')}
          </div>
          <Divider />
          <MenuItem icon={<Copy size={14} />} label="Copy" onClick={handleCopy} />
          <MenuItem icon={<Layers size={14} />} label="Duplicate" onClick={handleDuplicate} />
          <Divider />
          <MenuItem icon={<RotateCcw size={14} />} label="Rotate 90°" onClick={handleRotate90} />
          <MenuItem icon={<FlipHorizontal size={14} />} label="Flip Horizontal" onClick={handleFlipH} />
          <MenuItem icon={<Crosshair size={14} />} label="Set Upright" onClick={handleSetUpright} />
          <Divider />
          <MenuItem icon={<Trash2 size={14} />} label="Delete" onClick={handleDelete} danger />
        </>
      )}

      {contextMenu.type === 'canvas' && (
        <>
          <MenuItem
            icon={<Copy size={14} />}
            label={`Paste (${clipboard.length})`}
            onClick={() => {
              if (clipboard.length === 0) return;
              historyStore.push({ pieces, connections });
              for (const p of clipboard) {
                addPiece({ ...p, id: crypto.randomUUID(), x: p.x + 2, y: p.y + 2 });
              }
              close();
            }}
            disabled={clipboard.length === 0}
          />
          <Divider />
          <MenuItem
            icon={<Trash2 size={14} />}
            label="Clear All"
            onClick={() => {
              historyStore.push({ pieces, connections });
              deletePieces(pieces.map(p => p.id));
              setSelectedIds([]);
              close();
            }}
            danger
            disabled={pieces.length === 0}
          />
        </>
      )}
    </div>
  );
}
