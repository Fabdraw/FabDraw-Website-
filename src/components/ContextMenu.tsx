import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Layers, Group, Ungroup } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useUIStore } from '../store/uiStore';
import { useHistoryStore } from '../store/historyStore';

export default function ContextMenu() {
  const { contextMenu, setContextMenu, selectedIds, setSelectedIds, setClipboard, clipboard } = useUIStore();
  const { project, deleteMembers, addMember, groupMembers, ungroupMembers } = useProjectStore();
  const { members, connections, dimensions, groupNames } = project;
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

  const memberId = contextMenu.memberId;
  const member = memberId ? members.find(m => m.id === memberId) : null;

  const close = () => setContextMenu(null);

  const handleDuplicate = () => {
    const ids = memberId ? [memberId] : selectedIds;
    const toDupe = members.filter(m => ids.includes(m.id));
    historyStore.push({ members, connections, dimensions, groupNames });
    for (const m of toDupe) {
      addMember({ ...m, position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 } });
    }
    close();
  };

  const handleDelete = () => {
    const ids = memberId ? [memberId] : selectedIds;
    historyStore.push({ members, connections, dimensions, groupNames });
    deleteMembers(ids);
    setSelectedIds([]);
    close();
  };

  const handleCopy = () => {
    const ids = memberId ? [memberId] : selectedIds;
    setClipboard(members.filter(m => ids.includes(m.id)));
    close();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: contextMenu.x,
    top: contextMenu.y,
    zIndex: 1000,
  };

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
      {contextMenu.type === 'member' && member && (
        <>
          <div className="px-3 py-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {member.type.replace(/_/g, ' ')}
          </div>
          <Divider />
          <MenuItem icon={<Copy size={14} />} label="Copy" onClick={handleCopy} />
          <MenuItem icon={<Layers size={14} />} label="Duplicate" onClick={handleDuplicate} />
          <Divider />
          {selectedIds.length >= 2 && !selectedIds.every(id => members.find(m => m.id === id)?.groupId) && (
            <MenuItem
              icon={<Group size={14} />}
              label={`Group (${selectedIds.length})`}
              onClick={() => {
                historyStore.push({ members, connections, dimensions, groupNames });
                groupMembers(selectedIds, crypto.randomUUID());
                close();
              }}
            />
          )}
          {member.groupId && (
            <MenuItem
              icon={<Ungroup size={14} />}
              label="Ungroup"
              onClick={() => {
                historyStore.push({ members, connections, dimensions, groupNames });
                ungroupMembers(member.groupId!);
                close();
              }}
            />
          )}
          {(selectedIds.length >= 2 || member.groupId) && <Divider />}
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
              historyStore.push({ members, connections, dimensions, groupNames });
              for (const m of clipboard) {
                addMember({ ...m, position: { ...m.position, x: m.position.x + 2, y: m.position.y + 2 } });
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
              historyStore.push({ members, connections, dimensions, groupNames });
              deleteMembers(members.map(m => m.id));
              setSelectedIds([]);
              close();
            }}
            danger
            disabled={members.length === 0}
          />
        </>
      )}
    </div>
  );
}
