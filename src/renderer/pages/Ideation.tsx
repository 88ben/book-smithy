import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, FileText, Lightbulb, Network, Palette, Search } from 'lucide-react';
import { useProjectStore, type NoteEntry, type Relationship } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';
import { LinksSidebar } from '@renderer/components/ideation/LinksSidebar';
import { GraphCanvas, type GraphNode, type GraphEdge } from '@renderer/components/canvas/GraphCanvas';

type Tab = 'premise' | 'themes' | 'notes' | 'links';

interface IdeationIndex {
  notes: NoteEntry[];
  links: Relationship[];
  nodePositions: Record<string, { x: number; y: number }>;
}

const emptyIndex: IdeationIndex = { notes: [], links: [], nodePositions: {} };

export function Ideation() {
  const { projectPath } = useProjectStore();
  const [activeTab, setActiveTab] = useState<Tab>('premise');
  const [premiseContent, setPremiseContent] = useState('');
  const [themesContent, setThemesContent] = useState('');
  const [index, setIndex] = useState<IdeationIndex>(emptyIndex);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [noteContentsCache, setNoteContentsCache] = useState<Map<string, string>>(new Map());
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (projectPath) loadContent();
  }, [projectPath]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  async function loadContent() {
    if (!projectPath) return;
    try {
      const premise = await window.bookSmithy.fs.readFile(
        `${projectPath}/Ideation/premise.md`,
      );
      if (!premise) throw new Error('missing');
      const parsed = parseFrontmatter(premise);
      setPremiseContent(parsed.content);
    } catch {
      setPremiseContent('');
    }
    try {
      const themes = await window.bookSmithy.fs.readFile(
        `${projectPath}/Ideation/themes.md`,
      );
      if (!themes) throw new Error('missing');
      const parsed = parseFrontmatter(themes);
      setThemesContent(parsed.content);
    } catch {
      setThemesContent('');
    }
    await loadIndex();
  }

  async function loadIndex() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Ideation/_index.json`,
      );
      if (data && data.notes) {
        const loaded: IdeationIndex = {
          notes: data.notes || [],
          links: data.links || [],
          nodePositions: data.nodePositions || {},
        };
        setIndex(loaded);
        indexRef.current = loaded;
        await cacheAllNoteContents(loaded.notes);
        return;
      }
    } catch { /* no index file yet */ }

    await migrateFromDirScan();
  }

  async function migrateFromDirScan() {
    if (!projectPath) return;
    try {
      const entries = await window.bookSmithy.fs.readDir(
        `${projectPath}/Ideation/notes`,
      );
      const mdFiles = entries.filter(
        (e: { name: string; isDirectory: boolean }) =>
          !e.isDirectory && e.name.endsWith('.md'),
      );

      const notes: NoteEntry[] = [];
      for (const file of mdFiles) {
        const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        let name = file.name.replace('.md', '');
        try {
          const raw = await window.bookSmithy.fs.readFile(
            `${projectPath}/Ideation/notes/${file.name}`,
          );
          if (raw) {
            const parsed = parseFrontmatter(raw);
            if (parsed.frontmatter?.title) name = parsed.frontmatter.title as string;
          }
        } catch { /* use filename */ }
        notes.push({ id, name, filename: file.name });
      }

      const newIndex: IdeationIndex = { notes, links: [], nodePositions: {} };
      await saveIndex(newIndex);
      setIndex(newIndex);
      indexRef.current = newIndex;
      await cacheAllNoteContents(newIndex.notes);
    } catch {
      setIndex(emptyIndex);
    }
  }

  async function cacheAllNoteContents(notes: NoteEntry[]) {
    if (!projectPath) return;
    const cache = new Map<string, string>();
    for (const note of notes) {
      try {
        const raw = await window.bookSmithy.fs.readFile(
          `${projectPath}/Ideation/notes/${note.filename}`,
        );
        if (raw) {
          const parsed = parseFrontmatter(raw);
          cache.set(note.id, parsed.content || '');
        }
      } catch { /* skip */ }
    }
    setNoteContentsCache(cache);
  }

  async function saveIndex(newIndex: IdeationIndex) {
    if (!projectPath) return;
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/Ideation/_index.json`,
      newIndex,
    );
  }

  const autoSave = useCallback(
    (filePath: string, content: string, frontmatterData?: Record<string, unknown>) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        const toSave = frontmatterData
          ? serializeFrontmatter(frontmatterData, content)
          : content;
        await window.bookSmithy.fs.writeFile(filePath, toSave);
      }, 500);
      setSaveTimeout(timeout);
    },
    [saveTimeout],
  );

  function handlePremiseChange(html: string) {
    setPremiseContent(html);
    if (projectPath) {
      autoSave(`${projectPath}/Ideation/premise.md`, html, {
        title: 'Premise',
        created: new Date().toISOString(),
      });
    }
  }

  function handleThemesChange(html: string) {
    setThemesContent(html);
    if (projectPath) {
      autoSave(`${projectPath}/Ideation/themes.md`, html, {
        title: 'Themes',
        created: new Date().toISOString(),
      });
    }
  }

  async function handleCreateNote() {
    if (!projectPath) return;
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const filename = `${id}.md`;
    const name = 'New Note';
    const content = serializeFrontmatter(
      { title: name, created: new Date().toISOString() },
      '\nWrite your thoughts here...\n',
    );
    await window.bookSmithy.fs.writeFile(
      `${projectPath}/Ideation/notes/${filename}`,
      content,
    );
    const newNote: NoteEntry = { id, name, filename };
    const newIndex = { ...indexRef.current, notes: [...indexRef.current.notes, newNote] };
    await saveIndex(newIndex);
    setIndex(newIndex);
    indexRef.current = newIndex;

    setSelectedNoteId(id);
    const parsed = parseFrontmatter(content);
    setNoteContent(parsed.content);
    setNoteContentsCache((prev) => new Map(prev).set(id, parsed.content));

    setRenamingId(id);
    setRenameValue(name);
  }

  async function handleSelectNote(noteId: string) {
    setSelectedNoteId(noteId);
    const note = indexRef.current.notes.find((n) => n.id === noteId);
    if (!note || !projectPath) return;
    try {
      const raw = await window.bookSmithy.fs.readFile(
        `${projectPath}/Ideation/notes/${note.filename}`,
      );
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setNoteContent(parsed.content);
    } catch {
      setNoteContent('');
    }
  }

  function handleNoteChange(html: string) {
    setNoteContent(html);
    if (selectedNoteId && projectPath) {
      const note = indexRef.current.notes.find((n) => n.id === selectedNoteId);
      if (!note) return;
      autoSave(`${projectPath}/Ideation/notes/${note.filename}`, html, {
        title: note.name,
        updated: new Date().toISOString(),
      });
      setNoteContentsCache((prev) => new Map(prev).set(selectedNoteId, html));
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!projectPath) return;
    const note = indexRef.current.notes.find((n) => n.id === noteId);
    if (!note) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Ideation/notes/${note.filename}`,
    );
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setNoteContent('');
    }
    const newIndex = {
      ...indexRef.current,
      notes: indexRef.current.notes.filter((n) => n.id !== noteId),
      links: indexRef.current.links.filter(
        (l) => l.source !== noteId && l.target !== noteId,
      ),
    };
    await saveIndex(newIndex);
    setIndex(newIndex);
    indexRef.current = newIndex;
    setNoteContentsCache((prev) => {
      const next = new Map(prev);
      next.delete(noteId);
      return next;
    });
  }

  async function handleRenameCommit() {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const newIndex = {
      ...indexRef.current,
      notes: indexRef.current.notes.map((n) =>
        n.id === renamingId ? { ...n, name: renameValue.trim() } : n,
      ),
    };
    await saveIndex(newIndex);
    setIndex(newIndex);
    indexRef.current = newIndex;
    setRenamingId(null);
  }

  function handleLinksChange(newLinks: Relationship[]) {
    const newIndex = { ...indexRef.current, links: newLinks };
    saveIndex(newIndex);
    setIndex(newIndex);
    indexRef.current = newIndex;
  }

  function handleNodePositionsChange(positions: Record<string, { x: number; y: number }>) {
    const newIndex = { ...indexRef.current, nodePositions: positions };
    saveIndex(newIndex);
    setIndex(newIndex);
    indexRef.current = newIndex;
  }

  function handleGoToNote(noteId: string) {
    setActiveTab('notes');
    handleSelectNote(noteId);
  }

  const filteredNotes = noteSearchQuery.trim()
    ? index.notes.filter((note) => {
        const q = noteSearchQuery.toLowerCase();
        if (note.name.toLowerCase().includes(q)) return true;
        const content = noteContentsCache.get(note.id);
        return content ? content.toLowerCase().includes(q) : false;
      })
    : index.notes;

  const NOTE_COLOR = '#f59e0b';

  const linksGraphNodes: GraphNode[] = useMemo(
    () => index.notes.map((n) => ({ id: n.id, label: n.name, color: NOTE_COLOR })),
    [index.notes],
  );

  const linksGraphEdges: GraphEdge[] = useMemo(
    () => index.links.map((l) => ({ source: l.source, target: l.target, label: l.label })),
    [index.links],
  );

  const tabs = [
    { id: 'premise' as Tab, label: 'Premise', icon: Lightbulb },
    { id: 'themes' as Tab, label: 'Themes', icon: Palette },
    { id: 'notes' as Tab, label: 'Notes', icon: FileText },
    { id: 'links' as Tab, label: 'Links', icon: Network },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-6 pt-6 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        {activeTab === 'premise' && (
          <div className="h-full bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col">
            <MarkdownEditor
              content={premiseContent}
              onChange={handlePremiseChange}
              placeholder="What is the core premise of your story?"
              className="flex-1 overflow-y-auto"
            />
          </div>
        )}

        {activeTab === 'themes' && (
          <div className="h-full bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col">
            <MarkdownEditor
              content={themesContent}
              onChange={handleThemesChange}
              placeholder="What themes will your story explore?"
              className="flex-1 overflow-y-auto"
            />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="h-full flex gap-4">
            <div className="w-64 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
                <span className="text-xs text-zinc-500 font-medium">
                  Notes
                </span>
                <button
                  onClick={handleCreateNote}
                  className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
                  title="New note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="px-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/30"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {filteredNotes.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-4">
                    {noteSearchQuery ? 'No matching notes' : 'No notes yet'}
                  </p>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        selectedNoteId === note.id
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-zinc-400 hover:bg-zinc-800/50'
                      }`}
                      onClick={() => handleSelectNote(note.id)}
                      onDoubleClick={() => {
                        setRenamingId(note.id);
                        setRenameValue(note.name);
                      }}
                    >
                      {renamingId === note.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={handleRenameCommit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCommit();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-zinc-800 border border-amber-500/30 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none min-w-0"
                        />
                      ) : (
                        <span className="truncate">{note.name}</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
              {selectedNoteId ? (
                <MarkdownEditor
                  content={noteContent}
                  onChange={handleNoteChange}
                  placeholder="Write your thoughts..."
                  className="h-full overflow-y-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
                  Select a note or create a new one
                </div>
              )}
            </div>
            {selectedNoteId && (
              <LinksSidebar
                noteId={selectedNoteId}
                notes={index.notes}
                links={index.links}
                onLinksChange={handleLinksChange}
                onGoToNote={handleGoToNote}
              />
            )}
          </div>
        )}

        {activeTab === 'links' && (
          <div className="h-full">
            <GraphCanvas
              nodes={linksGraphNodes}
              edges={linksGraphEdges}
              nodePositions={index.nodePositions}
              onNodePositionsChange={handleNodePositionsChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
