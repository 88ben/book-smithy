import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, User, Network, Search } from 'lucide-react';
import { useProjectStore, type CharacterEntry, type Relationship } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';
import { GraphCanvas, type NodePositions, type GraphNode, type GraphEdge } from '@renderer/components/canvas/GraphCanvas';
import { RelationshipSidebar } from '@renderer/components/characters/RelationshipSidebar';

type CharTab = 'profiles' | 'relationships';

export function Characters() {
  const { projectPath } = useProjectStore();
  const [activeTab, setActiveTab] = useState<CharTab>('profiles');
  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [nodePositions, setNodePositions] = useState<NodePositions>({});
  const nodePositionsRef = useRef<NodePositions>({});
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [charContent, setCharContent] = useState('');
  const [charMeta, setCharMeta] = useState<Record<string, unknown>>({});
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [charSearchQuery, setCharSearchQuery] = useState('');

  const selectedCharEntry = selectedChar
    ? characters.find(
        (c) => `${projectPath}/Characters/${c.filename}` === selectedChar,
      ) ?? null
    : null;

  useEffect(() => {
    if (projectPath) loadCharacters();
  }, [projectPath]);

  async function loadCharacters() {
    if (!projectPath) return;
    try {
      const index = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Characters/_index.json`,
      );
      setCharacters(index?.characters || []);
      setRelationships(index?.relationships || []);
      const pos = index?.nodePositions || {};
      setNodePositions(pos);
      nodePositionsRef.current = pos;
    } catch {
      setCharacters([]);
      setRelationships([]);
      setNodePositions({});
      nodePositionsRef.current = {};
    }
  }

  async function saveIndex(
    chars: CharacterEntry[],
    rels: Relationship[],
  ) {
    if (!projectPath) return;
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/Characters/_index.json`,
      { characters: chars, relationships: rels, nodePositions: nodePositionsRef.current },
    );
  }

  const autoSave = useCallback(
    (filePath: string, html: string, meta: Record<string, unknown>) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        await window.bookSmithy.fs.writeFile(
          filePath,
          serializeFrontmatter({ ...meta, updated: new Date().toISOString() }, html),
        );
      }, 500);
      setSaveTimeout(timeout);
    },
    [saveTimeout],
  );

  async function handleCreateCharacter() {
    if (!projectPath) return;
    const id = `char-${Date.now()}`;
    const filename = `${id}.md`;
    const filePath = `${projectPath}/Characters/${filename}`;

    const meta = {
      title: 'New Character',
      role: 'supporting',
      age: '',
      traits: [],
      arc: '',
      created: new Date().toISOString(),
    };

    await window.bookSmithy.fs.writeFile(
      filePath,
      serializeFrontmatter(meta, '\n# New Character\n\nDescribe this character...\n'),
    );

    const entry: CharacterEntry = {
      id,
      name: 'New Character',
      filename,
      role: 'supporting',
    };
    const updated = [...characters, entry];
    setCharacters(updated);
    await saveIndex(updated, relationships);
    setSelectedChar(filePath);
    setCharContent('\n# New Character\n\nDescribe this character...\n');
    setCharMeta(meta);
  }

  async function handleSelectCharacter(char: CharacterEntry) {
    const filePath = `${projectPath}/Characters/${char.filename}`;
    setSelectedChar(filePath);
    try {
      const raw = await window.bookSmithy.fs.readFile(filePath);
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setCharContent(parsed.content);
      setCharMeta(parsed.data);
    } catch {
      setCharContent('');
      setCharMeta({});
    }
  }

  function handleContentChange(html: string) {
    setCharContent(html);
    if (selectedChar) {
      autoSave(selectedChar, html, charMeta);
    }
  }

  function handleMetaChange(key: string, value: unknown) {
    const updated = { ...charMeta, [key]: value };
    setCharMeta(updated);

    if (key === 'title') {
      const updatedChars = characters.map((c) => {
        const fp = `${projectPath}/Characters/${c.filename}`;
        if (fp === selectedChar) return { ...c, name: String(value) };
        return c;
      });
      setCharacters(updatedChars);
      saveIndex(updatedChars, relationships);
    }
    if (key === 'role') {
      const updatedChars = characters.map((c) => {
        const fp = `${projectPath}/Characters/${c.filename}`;
        if (fp === selectedChar) return { ...c, role: String(value) };
        return c;
      });
      setCharacters(updatedChars);
      saveIndex(updatedChars, relationships);
    }

    if (selectedChar) {
      autoSave(selectedChar, charContent, updated);
    }
  }

  async function handleDeleteCharacter(char: CharacterEntry) {
    const filePath = `${projectPath}/Characters/${char.filename}`;
    await window.bookSmithy.fs.deleteFile(filePath);
    const updated = characters.filter((c) => c.id !== char.id);
    const updatedRels = relationships.filter(
      (r) => r.source !== char.id && r.target !== char.id,
    );
    const { [char.id]: _, ...updatedPositions } = nodePositionsRef.current;
    nodePositionsRef.current = updatedPositions;
    setNodePositions(updatedPositions);
    setCharacters(updated);
    setRelationships(updatedRels);
    await saveIndex(updated, updatedRels);
    if (selectedChar === filePath) {
      setSelectedChar(null);
      setCharContent('');
      setCharMeta({});
    }
  }

  function handleRelationshipsChange(newRels: Relationship[]) {
    setRelationships(newRels);
    saveIndex(characters, newRels);
  }

  function handleNodePositionsChange(positions: NodePositions) {
    setNodePositions(positions);
    nodePositionsRef.current = positions;
    saveIndex(characters, relationships);
  }

  const roleColorsBadge: Record<string, string> = {
    protagonist: 'bg-amber-500/20 text-amber-400',
    antagonist: 'bg-red-500/20 text-red-400',
    supporting: 'bg-blue-500/20 text-blue-400',
    minor: 'bg-zinc-500/20 text-zinc-400',
  };

  const roleColorsHex: Record<string, string> = {
    protagonist: '#f59e0b',
    antagonist: '#ef4444',
    supporting: '#3b82f6',
    minor: '#71717a',
  };

  const graphNodes: GraphNode[] = useMemo(
    () =>
      characters.map((c) => ({
        id: c.id,
        label: c.name,
        color: roleColorsHex[c.role] || roleColorsHex.supporting,
      })),
    [characters],
  );

  const graphEdges: GraphEdge[] = useMemo(
    () =>
      relationships.map((r) => ({
        source: r.source,
        target: r.target,
        label: r.label,
      })),
    [relationships],
  );

  const filteredCharacters = charSearchQuery.trim()
    ? characters.filter((c) =>
        c.name.toLowerCase().includes(charSearchQuery.toLowerCase()),
      )
    : characters;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-6 pt-6 pb-4">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'profiles'
              ? 'bg-blue-500/10 text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <User className="w-4 h-4" />
          Profiles
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'relationships'
              ? 'bg-blue-500/10 text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
          }`}
        >
          <Network className="w-4 h-4" />
          Relationships
        </button>
      </div>

      {activeTab === 'profiles' && (
        <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
          <div className="w-64 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
              <span className="text-xs text-zinc-500 font-medium">
                Characters
              </span>
              <button
                onClick={handleCreateCharacter}
                className="p-1 text-zinc-400 hover:text-blue-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="px-2 pt-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search characters..."
                  value={charSearchQuery}
                  onChange={(e) => setCharSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredCharacters.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">
                  {charSearchQuery ? 'No matching characters' : 'No characters yet'}
                </p>
              ) : (
                filteredCharacters.map((char) => (
                  <div
                    key={char.id}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                      selectedChar ===
                      `${projectPath}/Characters/${char.filename}`
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-zinc-400 hover:bg-zinc-800/50'
                    }`}
                    onClick={() => handleSelectCharacter(char)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{char.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          roleColorsBadge[char.role] || roleColorsBadge.supporting
                        }`}
                      >
                        {char.role}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCharacter(char);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col">
            {selectedChar ? (
              <>
                <div className="flex gap-3 p-4 border-b border-zinc-800/50">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-1">
                      Name
                    </label>
                    <input
                      value={String(charMeta.title || '')}
                      onChange={(e) =>
                        handleMetaChange('title', e.target.value)
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-zinc-500 mb-1">
                      Role
                    </label>
                    <select
                      value={String(charMeta.role || 'supporting')}
                      onChange={(e) =>
                        handleMetaChange('role', e.target.value)
                      }
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="protagonist">Protagonist</option>
                      <option value="antagonist">Antagonist</option>
                      <option value="supporting">Supporting</option>
                      <option value="minor">Minor</option>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-zinc-500 mb-1">
                      Age
                    </label>
                    <input
                      value={String(charMeta.age || '')}
                      onChange={(e) => handleMetaChange('age', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-500 mb-1">
                      Arc
                    </label>
                    <input
                      value={String(charMeta.arc || '')}
                      onChange={(e) => handleMetaChange('arc', e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MarkdownEditor
                    content={charContent}
                    onChange={handleContentChange}
                    placeholder="Write this character's backstory, personality, appearance..."
                    className="h-full"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                Select a character or create a new one
              </div>
            )}
          </div>

          {selectedCharEntry && (
            <RelationshipSidebar
              key={selectedCharEntry.id}
              characterId={selectedCharEntry.id}
              characters={characters}
              relationships={relationships}
              onRelationshipsChange={handleRelationshipsChange}
              onGoToCharacter={handleSelectCharacter}
            />
          )}
        </div>
      )}

      {activeTab === 'relationships' && (
        <div className="flex-1 overflow-hidden px-6 pb-6">
          <GraphCanvas
            nodes={graphNodes}
            edges={graphEdges}
            nodePositions={nodePositions}
            onNodePositionsChange={handleNodePositionsChange}
          />
        </div>
      )}
    </div>
  );
}
