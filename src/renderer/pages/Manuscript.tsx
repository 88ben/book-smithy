import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  GripVertical,
} from 'lucide-react';
import { useProjectStore, type ChapterEntry } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';
import { countWords } from '@renderer/lib/wordcount';
import { sortedChapters, normalizeOrders } from '@renderer/lib/manuscript';

const STATUS_BADGE: Record<string, { letter: string; bg: string; text: string }> = {
  draft:    { letter: 'D', bg: 'bg-red-500/20',     text: 'text-red-400' },
  revising: { letter: 'R', bg: 'bg-yellow-500/20',  text: 'text-yellow-400' },
  complete: { letter: 'C', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
};

function ChapterNameInput({
  chapterId,
  title,
  isSelected,
  onCommit,
  onRowClick,
}: {
  chapterId: string;
  title: string;
  isSelected: boolean;
  onCommit: (id: string, value: string) => void;
  onRowClick: () => void;
}) {
  const [local, setLocal] = useState(title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(title);
  }, [title]);

  return (
    <input
      ref={ref}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(chapterId, local.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') ref.current?.blur();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onRowClick();
      }}
      placeholder="Title..."
      className={`w-full bg-transparent border-none outline-none text-sm truncate transition-colors ${
        isSelected
          ? 'text-amber-400 hover:text-amber-300 focus:text-amber-300 placeholder:text-amber-400/40'
          : 'text-zinc-400 hover:text-white focus:text-white placeholder:text-zinc-600'
      }`}
    />
  );
}

export function Manuscript() {
  const { projectPath, focusMode, setFocusMode } = useProjectStore();
  const [chapters, setChapters] = useState<ChapterEntry[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterContent, setChapterContent] = useState('');
  const [currentWordCount, setCurrentWordCount] = useState(0);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ chId: string; position: 'before' | 'after' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChapterEntry | null>(null);
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  const sorted = useMemo(() => sortedChapters(chapters), [chapters]);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );

  useEffect(() => {
    if (projectPath) loadChapters();
  }, [projectPath]);

  async function loadChapters() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Manuscript/_index.json`,
      );
      let loaded: ChapterEntry[] = data?.chapters || [];

      const needsMigration = loaded.some((ch, i) => ch.order == null || ch.order !== i + 1);
      if (needsMigration && loaded.length > 0) {
        loaded = normalizeOrders(loaded);
        await window.bookSmithy.fs.writeJsonFile(
          `${projectPath}/Manuscript/_index.json`,
          { chapters: loaded },
        );
      }

      setChapters(loaded);
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
    chaptersRef.current = updated;
  }

  const autoSave = useCallback(
    (chapterId: string, html: string, meta: Record<string, unknown>) => {
      if (saveTimeout) clearTimeout(saveTimeout);
      const timeout = setTimeout(async () => {
        const ch = chaptersRef.current.find((c) => c.id === chapterId);
        if (!ch || !projectPath) return;
        const filePath = `${projectPath}/Manuscript/chapters/${ch.filename}`;
        await window.bookSmithy.fs.writeFile(
          filePath,
          serializeFrontmatter({ ...meta, updated: new Date().toISOString() }, html),
        );

        const wc = countWords(html);
        setCurrentWordCount(wc);
        const updatedChapters = chaptersRef.current.map((c) =>
          c.id === chapterId ? { ...c, wordCount: wc } : c,
        );
        saveChapterIndex(updatedChapters);
      }, 500);
      setSaveTimeout(timeout);
    },
    [saveTimeout, projectPath],
  );

  async function handleCreateChapter() {
    if (!projectPath) return;
    const id = `ch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const filename = `${id}.md`;
    const order = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.order)) + 1
      : 1;

    await window.bookSmithy.fs.writeFile(
      `${projectPath}/Manuscript/chapters/${filename}`,
      serializeFrontmatter(
        { title: '', status: 'draft', created: new Date().toISOString() },
        '\n',
      ),
    );

    const entry: ChapterEntry = {
      id,
      title: '',
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
    if (!projectPath) return;
    setSelectedChapterId(ch.id);
    try {
      const raw = await window.bookSmithy.fs.readFile(
        `${projectPath}/Manuscript/chapters/${ch.filename}`,
      );
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
      autoSave(selectedChapter.id, html, {
        title: selectedChapter.title || '',
        status: selectedChapter.status || 'draft',
      });
    }
  }

  async function handleDeleteChapter(ch: ChapterEntry) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Manuscript/chapters/${ch.filename}`,
    );
    const remaining = chapters.filter((c) => c.id !== ch.id);
    const renumbered = normalizeOrders(remaining);
    await saveChapterIndex(renumbered);
    if (selectedChapterId === ch.id) {
      setSelectedChapterId(null);
      setChapterContent('');
      setCurrentWordCount(0);
    }
    setConfirmDelete(null);
  }

  async function handleStatusChange(ch: ChapterEntry, status: ChapterEntry['status']) {
    const updated = chapters.map((c) =>
      c.id === ch.id ? { ...c, status } : c,
    );
    await saveChapterIndex(updated);
  }

  async function handleTitleCommit(chId: string, value: string) {
    const ch = chaptersRef.current.find((c) => c.id === chId);
    if (!ch || ch.title === value) return;
    const updated = chaptersRef.current.map((c) =>
      c.id === chId ? { ...c, title: value } : c,
    );
    await saveChapterIndex(updated);
  }

  function handleDragStart(e: React.DragEvent, chId: string) {
    setDragItem(chId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDragItem(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, targetChId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragItem || dragItem === targetChId) {
      setDropTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget({ chId: targetChId, position });
  }

  function handleDrop(e: React.DragEvent, targetChId: string) {
    if (!dragItem || dragItem === targetChId) {
      handleDragEnd();
      return;
    }
    const sortedList = sortedChapters(chaptersRef.current);
    const fromIdx = sortedList.findIndex((c) => c.id === dragItem);
    const targetIdx = sortedList.findIndex((c) => c.id === targetChId);
    if (fromIdx === -1 || targetIdx === -1) {
      handleDragEnd();
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    const reordered = sortedList.filter((c) => c.id !== dragItem);
    const insertIdx = reordered.findIndex((c) => c.id === targetChId);
    const finalIdx = position === 'before' ? insertIdx : insertIdx + 1;
    reordered.splice(finalIdx, 0, sortedList[fromIdx]);
    const renumbered = reordered.map((ch, i) => ({ ...ch, order: i + 1 }));
    saveChapterIndex(renumbered);
    handleDragEnd();
  }

  const statusDropdown = selectedChapter ? (
    <select
      value={selectedChapter.status}
      onChange={(e) =>
        handleStatusChange(selectedChapter, e.target.value as ChapterEntry['status'])
      }
      className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-0.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
    >
      <option value="draft">Draft</option>
      <option value="revising">Revising</option>
      <option value="complete">Complete</option>
    </select>
  ) : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-zinc-200 select-none cursor-default">Manuscript</h2>
        <div className="flex items-center gap-2">
          {selectedChapter && (
            <span className="text-xs text-zinc-500">
              {currentWordCount.toLocaleString()} words
            </span>
          )}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
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
              {sorted.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">
                  No chapters yet
                </p>
              ) : (
                sorted.map((ch, idx) => {
                  const position = idx + 1;
                  const isSelected = selectedChapterId === ch.id;
                  const badge = STATUS_BADGE[ch.status] || STATUS_BADGE.draft;
                  const showBefore = dropTarget?.chId === ch.id && dropTarget.position === 'before';
                  const showAfter = dropTarget?.chId === ch.id && dropTarget.position === 'after';
                  return (
                    <div
                      key={ch.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ch.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, ch.id)}
                      onDrop={(e) => handleDrop(e, ch.id)}
                      className={`group relative flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-zinc-400 hover:bg-zinc-800/50'
                      }`}
                      onClick={() => handleSelectChapter(ch)}
                    >
                      {showBefore && <div className="absolute -top-px left-2 right-2 h-0.5 bg-amber-500 rounded-full pointer-events-none" />}
                      {showAfter && <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-amber-500 rounded-full pointer-events-none" />}
                      <GripVertical className="w-3 h-3 text-zinc-600 shrink-0 cursor-grab" />
                      <span
                        className={`shrink-0 px-1.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                        title={ch.status.charAt(0).toUpperCase() + ch.status.slice(1)}
                      >
                        C{position}
                      </span>
                      <div className="flex-1 min-w-0 pr-1">
                        <ChapterNameInput
                          chapterId={ch.id}
                          title={ch.title}
                          isSelected={isSelected}
                          onCommit={handleTitleCommit}
                          onRowClick={() => handleSelectChapter(ch)}
                        />
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-zinc-600 tabular-nums">
                          {ch.wordCount.toLocaleString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(ch);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
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
              toolbarRight={statusDropdown}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Select a chapter or create a new one
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-zinc-100 font-semibold mb-2">Delete chapter?</h3>
            <p className="text-zinc-400 text-sm mb-5">
              {confirmDelete.title
                ? <>Are you sure you want to delete <span className="text-zinc-200">"{confirmDelete.title}"</span>? This cannot be undone.</>
                : 'Are you sure you want to delete this untitled chapter? This cannot be undone.'}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteChapter(confirmDelete)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
