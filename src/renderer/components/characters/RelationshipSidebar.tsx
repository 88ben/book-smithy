import React, { useMemo, useState } from 'react';
import { ExternalLink, Network, Plus, Trash2 } from 'lucide-react';
import type { CharacterEntry, Relationship } from '@renderer/stores/projectStore';

interface RelationshipSidebarProps {
  characterId: string;
  characters: CharacterEntry[];
  relationships: Relationship[];
  onRelationshipsChange: (rels: Relationship[]) => void;
  onGoToCharacter: (char: CharacterEntry) => void;
}

type RelView = {
  index: number;
  otherId: string;
  label: string;
};

export function RelationshipSidebar({
  characterId,
  characters,
  relationships,
  onRelationshipsChange,
  onGoToCharacter,
}: RelationshipSidebarProps) {
  const [addingNew, setAddingNew] = useState(false);

  const charRels = useMemo<RelView[]>(() => {
    const views: RelView[] = [];
    relationships.forEach((rel, idx) => {
      if (rel.source === characterId) {
        views.push({ index: idx, otherId: rel.target, label: rel.label });
      } else if (rel.target === characterId) {
        views.push({ index: idx, otherId: rel.source, label: rel.label });
      }
    });
    return views;
  }, [relationships, characterId]);

  const connectedIds = new Set(charRels.map((r) => r.otherId));
  const availableCharacters = characters.filter(
    (c) => c.id !== characterId && !connectedIds.has(c.id),
  );

  function handleAdd(targetId: string) {
    onRelationshipsChange([
      ...relationships,
      { source: characterId, target: targetId, label: '' },
    ]);
    setAddingNew(false);
  }

  function handleChangeTarget(relIndex: number, newOtherId: string) {
    const updated = [...relationships];
    const old = updated[relIndex];
    if (old.source === characterId) {
      updated[relIndex] = { source: characterId, target: newOtherId, label: old.label };
    } else {
      updated[relIndex] = { source: newOtherId, target: characterId, label: old.label };
    }
    onRelationshipsChange(updated);
  }

  function handleChangeLabel(relIndex: number, newLabel: string) {
    const updated = [...relationships];
    updated[relIndex] = { ...updated[relIndex], label: newLabel };
    onRelationshipsChange(updated);
  }

  function handleDelete(relIndex: number) {
    onRelationshipsChange(relationships.filter((_, i) => i !== relIndex));
  }

  function handleGoTo(otherId: string) {
    const char = characters.find((c) => c.id === otherId);
    if (char) onGoToCharacter(char);
  }

  return (
    <div className="w-72 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50">
        <Network className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500 font-medium">Relationships</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {charRels.length === 0 && !addingNew && (
          <p className="text-xs text-zinc-600 text-center py-4">
            No relationships yet
          </p>
        )}

        {charRels.map((rel) => (
          <div
            key={rel.otherId}
            className="bg-zinc-800/40 rounded-lg p-2 space-y-1.5"
          >
            <div className="flex items-center gap-1">
              <select
                value={rel.otherId}
                onChange={(e) => handleChangeTarget(rel.index, e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500/50"
              >
                {characters
                  .filter((c) => c.id !== characterId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => handleGoTo(rel.otherId)}
                className="p-1 text-zinc-500 hover:text-blue-400 transition-colors shrink-0"
                title="Go to character"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleDelete(rel.index)}
                className="p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                title="Delete relationship"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input
              key={`label-${rel.otherId}`}
              defaultValue={rel.label}
              onBlur={(e) => {
                if (e.target.value !== rel.label) {
                  handleChangeLabel(rel.index, e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="Nature (e.g., rival, mentor)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-blue-500/50"
            >
              <option value="" disabled>
                Select character...
              </option>
              {availableCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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

      {!addingNew && availableCharacters.length > 0 && (
        <div className="px-2 pb-2">
          <button
            onClick={() => setAddingNew(true)}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Relationship
          </button>
        </div>
      )}
    </div>
  );
}
