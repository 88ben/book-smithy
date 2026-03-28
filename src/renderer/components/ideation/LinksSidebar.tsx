import React, { useMemo, useState } from 'react';
import { ExternalLink, Network, Plus, Trash2 } from 'lucide-react';
import type { NoteEntry, Relationship } from '@renderer/stores/projectStore';

interface LinksSidebarProps {
  noteId: string;
  notes: NoteEntry[];
  links: Relationship[];
  onLinksChange: (links: Relationship[]) => void;
  onGoToNote: (noteId: string) => void;
}

type LinkView = {
  index: number;
  otherId: string;
  label: string;
};

export function LinksSidebar({
  noteId,
  notes,
  links,
  onLinksChange,
  onGoToNote,
}: LinksSidebarProps) {
  const [addingNew, setAddingNew] = useState(false);

  const noteLinks = useMemo<LinkView[]>(() => {
    const views: LinkView[] = [];
    links.forEach((link, idx) => {
      if (link.source === noteId) {
        views.push({ index: idx, otherId: link.target, label: link.label });
      } else if (link.target === noteId) {
        views.push({ index: idx, otherId: link.source, label: link.label });
      }
    });
    return views;
  }, [links, noteId]);

  const connectedIds = new Set(noteLinks.map((l) => l.otherId));
  const availableNotes = notes.filter(
    (n) => n.id !== noteId && !connectedIds.has(n.id),
  );

  function handleAdd(targetId: string) {
    onLinksChange([...links, { source: noteId, target: targetId, label: '' }]);
    setAddingNew(false);
  }

  function handleChangeTarget(linkIndex: number, newOtherId: string) {
    const updated = [...links];
    const old = updated[linkIndex];
    if (old.source === noteId) {
      updated[linkIndex] = { source: noteId, target: newOtherId, label: old.label };
    } else {
      updated[linkIndex] = { source: newOtherId, target: noteId, label: old.label };
    }
    onLinksChange(updated);
  }

  function handleChangeLabel(linkIndex: number, newLabel: string) {
    const updated = [...links];
    updated[linkIndex] = { ...updated[linkIndex], label: newLabel };
    onLinksChange(updated);
  }

  function handleDelete(linkIndex: number) {
    onLinksChange(links.filter((_, i) => i !== linkIndex));
  }

  function getNoteName(id: string) {
    return notes.find((n) => n.id === id)?.name || 'Unknown';
  }

  return (
    <div className="w-72 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50">
        <Network className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500 font-medium">Links</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {noteLinks.length === 0 && !addingNew && (
          <p className="text-xs text-zinc-600 text-center py-4">
            No links yet
          </p>
        )}

        {noteLinks.map((link) => (
          <div
            key={link.otherId}
            className="bg-zinc-800/40 rounded-lg p-2 space-y-1.5"
          >
            <div className="flex items-center gap-1">
              <select
                value={link.otherId}
                onChange={(e) => handleChangeTarget(link.index, e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
              >
                {notes
                  .filter((n) => n.id !== noteId)
                  .map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => onGoToNote(link.otherId)}
                className="p-1 text-zinc-500 hover:text-amber-400 transition-colors shrink-0"
                title="Go to note"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(link.index)}
                className="p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                title="Delete link"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input
              key={`label-${link.otherId}`}
              defaultValue={link.label}
              onBlur={(e) => {
                if (e.target.value !== link.label) {
                  handleChangeLabel(link.index, e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="Label (optional)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        ))}

        {addingNew && (
          <div className="bg-zinc-800/40 rounded-lg p-2 space-y-1.5">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleAdd(e.target.value);
              }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="" disabled>
                Select note...
              </option>
              {availableNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setAddingNew(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!addingNew && availableNotes.length > 0 && (
        <div className="px-2 pb-2">
          <button
            onClick={() => setAddingNew(true)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}
