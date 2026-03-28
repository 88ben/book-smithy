import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, MapPin, BookOpen, Cog } from 'lucide-react';
import { useProjectStore } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';

type WorldTab = 'locations' | 'lore' | 'systems';

interface WorldEntry {
  name: string;
  path: string;
}

const TAB_CONFIG: { id: WorldTab; label: string; icon: React.ElementType; dir: string }[] = [
  { id: 'locations', label: 'Locations', icon: MapPin, dir: 'locations' },
  { id: 'lore', label: 'Lore', icon: BookOpen, dir: 'lore' },
  { id: 'systems', label: 'Systems', icon: Cog, dir: 'systems' },
];

export function WorldBuilding() {
  const { projectPath } = useProjectStore();
  const [activeTab, setActiveTab] = useState<WorldTab>('locations');
  const [entries, setEntries] = useState<WorldEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [entryContent, setEntryContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadEntries();
  }, [projectPath, activeTab]);

  async function loadEntries() {
    if (!projectPath) return;
    const tabDir = TAB_CONFIG.find((t) => t.id === activeTab)!.dir;
    try {
      const files = await window.bookSmithy.fs.readDir(
        `${projectPath}/World/${tabDir}`,
      );
      const mdFiles = files.filter(
        (f: { name: string; isDirectory: boolean }) =>
          !f.isDirectory && f.name.endsWith('.md'),
      );
      setEntries(mdFiles);
    } catch {
      setEntries([]);
    }
    setSelectedEntry(null);
    setEntryContent('');
  }

  const autoSave = useCallback(
    (filePath: string, html: string) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        const data = {
          title: filePath.split('/').pop()?.replace('.md', '') || '',
          category: activeTab,
          updated: new Date().toISOString(),
        };
        await window.bookSmithy.fs.writeFile(
          filePath,
          serializeFrontmatter(data, html),
        );
      }, 500);
      setSaveTimeout(timeout);
    },
    [saveTimeout, activeTab],
  );

  async function handleCreateEntry() {
    if (!projectPath) return;
    const tabDir = TAB_CONFIG.find((t) => t.id === activeTab)!.dir;
    const name = `new-${activeTab.slice(0, -1)}-${Date.now()}.md`;
    const entryPath = `${projectPath}/World/${tabDir}/${name}`;
    const content = serializeFrontmatter(
      {
        title: `New ${activeTab.slice(0, -1)}`,
        category: activeTab,
        created: new Date().toISOString(),
      },
      `\n# New ${activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(1, -1)}\n\nDescribe this ${activeTab.slice(0, -1)} here...\n`,
    );
    await window.bookSmithy.fs.writeFile(entryPath, content);
    await loadEntries();
    setSelectedEntry(entryPath);
    const parsed = parseFrontmatter(content);
    setEntryContent(parsed.content);
  }

  async function handleSelectEntry(entryPath: string) {
    setSelectedEntry(entryPath);
    try {
      const raw = await window.bookSmithy.fs.readFile(entryPath);
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setEntryContent(parsed.content);
    } catch {
      setEntryContent('');
    }
  }

  function handleContentChange(html: string) {
    setEntryContent(html);
    if (selectedEntry) {
      autoSave(selectedEntry, html);
    }
  }

  async function handleDeleteEntry(entryPath: string) {
    await window.bookSmithy.fs.deleteFile(entryPath);
    if (selectedEntry === entryPath) {
      setSelectedEntry(null);
      setEntryContent('');
    }
    await loadEntries();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-6 pt-6 pb-4">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        <div className="w-64 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
            <span className="text-xs text-zinc-500 font-medium capitalize">
              {activeTab}
            </span>
            <button
              onClick={handleCreateEntry}
              className="p-1 text-zinc-400 hover:text-emerald-400 transition-colors"
              title={`New ${activeTab.slice(0, -1)}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {entries.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">
                No {activeTab} yet
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.path}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    selectedEntry === entry.path
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                  onClick={() => handleSelectEntry(entry.path)}
                >
                  <span className="truncate">
                    {entry.name.replace('.md', '')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(entry.path);
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

        <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
          {selectedEntry ? (
            <MarkdownEditor
              content={entryContent}
              onChange={handleContentChange}
              placeholder={`Describe this ${activeTab.slice(0, -1)}...`}
              className="h-full overflow-y-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Select an entry or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
