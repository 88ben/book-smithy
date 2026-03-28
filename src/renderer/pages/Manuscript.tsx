import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Maximize2,
  Minimize2,
  Check,
  Edit3,
  Clock,
} from 'lucide-react';
import { useProjectStore, type ChapterEntry } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';
import { countWords } from '@renderer/lib/wordcount';

export function Manuscript() {
  const { projectPath, focusMode, setFocusMode } = useProjectStore();
  const [chapters, setChapters] = useState<ChapterEntry[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState('');
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  useEffect(() => {
    if (projectPath) loadChapters();
  }, [projectPath]);

  async function loadChapters() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Manuscript/_index.json`,
      );
      setChapters(data?.chapters || []);
    } catch {
      setChapters([]);
    }
  }

  async function saveChapterIndex(updated: ChapterEntry[]) {
    if (!projectPath) return;
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/Manuscript/_index.json`,
      { chapters: updated },
    );
    setChapters(updated);
  }

  const autoSave = useCallback(
    (filePath: string, html: string, meta: Record<string, unknown>) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        await window.bookSmithy.fs.writeFile(
          filePath,
          serializeFrontmatter({ ...meta, updated: new Date().toISOString() }, html),
        );

        const wc = countWords(html);
        setCurrentWordCount(wc);
        const filename = filePath.split('/').pop()!;
        const updatedChapters = chapters.map((c) =>
          c.filename === filename ? { ...c, wordCount: wc } : c,
        );
        saveChapterIndex(updatedChapters);
      }, 500);
      setSaveTimeout(timeout);
    },
    [saveTimeout, chapters, projectPath],
  );

  async function handleCreateChapter() {
    if (!projectPath) return;
    const id = `ch-${Date.now()}`;
    const order = chapters.length + 1;
    const title = `Chapter ${order}`;
    const filename = `${String(order).padStart(2, '0')}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    const filePath = `${projectPath}/Manuscript/chapters/${filename}`;

    await window.bookSmithy.fs.writeFile(
      filePath,
      serializeFrontmatter(
        {
          title,
          status: 'draft',
          created: new Date().toISOString(),
        },
        `\n# ${title}\n\n`,
      ),
    );

    const entry: ChapterEntry = {
      id,
      title,
      filename,
      status: 'draft',
      wordCount: 0,
      order,
    };
    const updated = [...chapters, entry];
    await saveChapterIndex(updated);
    handleSelectChapter(entry);
  }

  async function handleSelectChapter(ch: ChapterEntry) {
    const filePath = `${projectPath}/Manuscript/chapters/${ch.filename}`;
    setSelectedChapter(filePath);
    try {
      const raw = await window.bookSmithy.fs.readFile(filePath);
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setChapterContent(parsed.content);
      setCurrentWordCount(countWords(parsed.content));
    } catch {
      setChapterContent('');
      setCurrentWordCount(0);
    }
  }

  function handleContentChange(html: string) {
    setChapterContent(html);
    setCurrentWordCount(countWords(html));
    if (selectedChapter) {
      const filename = selectedChapter.split('/').pop()!;
      const chapter = chapters.find((c) => c.filename === filename);
      autoSave(selectedChapter, html, {
        title: chapter?.title || '',
        status: chapter?.status || 'draft',
      });
    }
  }

  async function handleDeleteChapter(ch: ChapterEntry) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Manuscript/chapters/${ch.filename}`,
    );
    const updated = chapters.filter((c) => c.id !== ch.id);
    await saveChapterIndex(updated);
    if (selectedChapter === `${projectPath}/Manuscript/chapters/${ch.filename}`) {
      setSelectedChapter(null);
      setChapterContent('');
      setCurrentWordCount(0);
    }
  }

  async function handleStatusChange(ch: ChapterEntry, status: ChapterEntry['status']) {
    const updated = chapters.map((c) =>
      c.id === ch.id ? { ...c, status } : c,
    );
    await saveChapterIndex(updated);
  }

  function handleStartRename(ch: ChapterEntry) {
    setEditingTitle(ch.id);
    setEditTitleValue(ch.title);
  }

  async function handleFinishRename(ch: ChapterEntry) {
    if (!editTitleValue.trim()) {
      setEditingTitle(null);
      return;
    }
    const updated = chapters.map((c) =>
      c.id === ch.id ? { ...c, title: editTitleValue.trim() } : c,
    );
    await saveChapterIndex(updated);
    setEditingTitle(null);
  }

  const statusIcon: Record<string, React.ReactNode> = {
    draft: <Edit3 className="w-3 h-3 text-zinc-500" />,
    revising: <Clock className="w-3 h-3 text-amber-400" />,
    complete: <Check className="w-3 h-3 text-emerald-400" />,
  };

  const statusColors: Record<string, string> = {
    draft: 'text-zinc-500',
    revising: 'text-amber-400',
    complete: 'text-emerald-400',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-zinc-200">Manuscript</h2>
        <div className="flex items-center gap-2">
          {selectedChapter && (
            <span className="text-xs text-zinc-500">
              {currentWordCount.toLocaleString()} words
            </span>
          )}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title={focusMode ? 'Exit focus mode' : 'Focus mode'}
          >
            {focusMode ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        {!focusMode && (
          <div className="w-64 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
              <span className="text-xs text-zinc-500 font-medium">
                Chapters
              </span>
              <button
                onClick={handleCreateChapter}
                className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {chapters.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">
                  No chapters yet
                </p>
              ) : (
                chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className={`group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                      selectedChapter ===
                      `${projectPath}/Manuscript/chapters/${ch.filename}`
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-zinc-400 hover:bg-zinc-800/50'
                    }`}
                    onClick={() => handleSelectChapter(ch)}
                  >
                    <GripVertical className="w-3 h-3 text-zinc-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingTitle === ch.id ? (
                        <input
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onBlur={() => handleFinishRename(ch)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename(ch);
                            if (e.key === 'Escape') setEditingTitle(null);
                          }}
                          autoFocus
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="truncate block"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleStartRename(ch);
                          }}
                        >
                          {ch.title}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-600">
                          {ch.wordCount.toLocaleString()} words
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={ch.status}
                        onChange={(e) =>
                          handleStatusChange(
                            ch,
                            e.target.value as ChapterEntry['status'],
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-transparent text-[10px] ${statusColors[ch.status]} focus:outline-none cursor-pointer`}
                      >
                        <option value="draft">Draft</option>
                        <option value="revising">Revising</option>
                        <option value="complete">Complete</option>
                      </select>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(ch);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
          {selectedChapter ? (
            <MarkdownEditor
              content={chapterContent}
              onChange={handleContentChange}
              placeholder="Begin writing..."
              className="h-full overflow-y-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Select a chapter or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
