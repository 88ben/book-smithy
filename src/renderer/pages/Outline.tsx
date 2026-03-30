import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useProjectStore, type OutlineEntry } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';

interface OutlineIndex {
  structureType: string;
  acts: OutlineEntry[];
  scenes: OutlineEntry[];
}

function normalizeActOrders(acts: OutlineEntry[]): OutlineEntry[] {
  return acts
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((act, i) => ({ ...act, order: i + 1 }));
}

function normalizeSceneOrders(scenes: OutlineEntry[], actId: string | undefined): OutlineEntry[] {
  const inAct = scenes.filter((s) => s.actId === actId);
  const others = scenes.filter((s) => s.actId !== actId);
  const sorted = inAct
    .slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((s, i) => ({ ...s, order: i + 1 }));
  return [...others, ...sorted];
}

function InlineField({
  value,
  placeholder,
  onCommit,
  isSelected,
  onClick,
  className = '',
}: {
  value: string;
  placeholder: string;
  onCommit: (v: string) => void;
  isSelected: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      ref={ref}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const trimmed = local.trim();
        if (trimmed !== value) onCommit(trimmed);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') ref.current?.blur();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      placeholder={placeholder}
      className={`bg-transparent border-none outline-none transition-colors truncate ${
        isSelected
          ? 'text-purple-400 hover:text-purple-300 focus:text-purple-300 placeholder:text-purple-400/40'
          : 'text-zinc-400 hover:text-white focus:text-white placeholder:text-zinc-600'
      } ${className}`}
    />
  );
}

export function Outline() {
  const { projectPath } = useProjectStore();
  const [index, setIndex] = useState<OutlineIndex>({
    structureType: 'three-act',
    acts: [],
    scenes: [],
  });
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneContent, setSceneContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ sceneId: string; position: 'before' | 'after' } | null>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  const sortedActs = useMemo(
    () => index.acts.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [index.acts],
  );

  useEffect(() => {
    if (projectPath) loadOutline();
  }, [projectPath]);

  async function loadOutline() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Outline/_index.json`,
      );
      if (data) {
        let acts: OutlineEntry[] = data.acts || [];
        let scenes: OutlineEntry[] = data.scenes || [];

        const actsNeedNorm = acts.some((a: OutlineEntry, i: number) => a.order == null || a.order !== i + 1);
        if (actsNeedNorm && acts.length > 0) {
          acts = normalizeActOrders(acts);
        }

        const loaded: OutlineIndex = { structureType: data.structureType || 'three-act', acts, scenes };
        await saveOutlineIndex(loaded);
      }
    } catch {
      // use defaults
    }
  }

  async function saveOutlineIndex(updated: OutlineIndex) {
    if (!projectPath) return;
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/Outline/_index.json`,
      updated,
    );
    setIndex(updated);
    indexRef.current = updated;
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

  async function handleAddAct() {
    if (!projectPath) return;
    const id = `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const filename = `${id}.md`;
    const order = index.acts.length > 0 ? Math.max(...index.acts.map((a) => a.order)) + 1 : 1;

    await window.bookSmithy.fs.writeFile(
      `${projectPath}/Outline/acts/${filename}`,
      serializeFrontmatter(
        { title: '', created: new Date().toISOString() },
        '\n',
      ),
    );

    const act: OutlineEntry = {
      id,
      title: '',
      filename,
      type: 'act',
      order,
      summary: '',
    };
    await saveOutlineIndex({ ...index, acts: [...index.acts, act] });
  }

  async function handleAddScene(actId: string) {
    if (!projectPath) return;
    const id = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const filename = `${id}.md`;
    const actScenes = index.scenes.filter((s) => s.actId === actId);
    const order = actScenes.length > 0 ? Math.max(...actScenes.map((s) => s.order)) + 1 : 1;

    await window.bookSmithy.fs.writeFile(
      `${projectPath}/Outline/scenes/${filename}`,
      serializeFrontmatter(
        { title: '', actId, created: new Date().toISOString() },
        '\n',
      ),
    );

    const scene: OutlineEntry = {
      id,
      title: '',
      filename,
      type: 'scene',
      actId,
      order,
      summary: '',
    };
    await saveOutlineIndex({ ...index, scenes: [...index.scenes, scene] });
  }

  async function handleSelectScene(scene: OutlineEntry) {
    if (!projectPath) return;
    setSelectedSceneId(scene.id);
    try {
      const raw = await window.bookSmithy.fs.readFile(
        `${projectPath}/Outline/scenes/${scene.filename}`,
      );
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setSceneContent(parsed.content);
    } catch {
      setSceneContent('');
    }
  }

  function handleSceneContentChange(html: string) {
    setSceneContent(html);
    if (selectedSceneId) {
      const scene = indexRef.current.scenes.find((s) => s.id === selectedSceneId);
      if (scene && projectPath) {
        autoSave(`${projectPath}/Outline/scenes/${scene.filename}`, html, {
          title: scene.title,
          actId: scene.actId || '',
        });
      }
    }
  }

  async function handleDeleteScene(scene: OutlineEntry) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Outline/scenes/${scene.filename}`,
    );
    const remaining = index.scenes.filter((s) => s.id !== scene.id);
    const renumbered = normalizeSceneOrders(remaining, scene.actId);
    await saveOutlineIndex({ ...index, scenes: renumbered });
    if (selectedSceneId === scene.id) {
      setSelectedSceneId(null);
      setSceneContent('');
    }
  }

  async function handleDeleteAct(act: OutlineEntry) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Outline/acts/${act.filename}`,
    );
    for (const scene of index.scenes.filter((s) => s.actId === act.id)) {
      await window.bookSmithy.fs.deleteFile(
        `${projectPath}/Outline/scenes/${scene.filename}`,
      );
    }
    const remainingActs = index.acts.filter((a) => a.id !== act.id);
    const remainingScenes = index.scenes.filter((s) => s.actId !== act.id);
    const renumberedActs = normalizeActOrders(remainingActs);
    await saveOutlineIndex({
      ...index,
      acts: renumberedActs,
      scenes: remainingScenes,
    });
    if (selectedSceneId && index.scenes.find((s) => s.id === selectedSceneId)?.actId === act.id) {
      setSelectedSceneId(null);
      setSceneContent('');
    }
  }

  function handleActSummaryCommit(actId: string, value: string) {
    const updated = {
      ...indexRef.current,
      acts: indexRef.current.acts.map((a) =>
        a.id === actId ? { ...a, summary: value } : a,
      ),
    };
    saveOutlineIndex(updated);
  }

  function handleSceneSummaryCommit(sceneId: string, value: string) {
    const updated = {
      ...indexRef.current,
      scenes: indexRef.current.scenes.map((s) =>
        s.id === sceneId ? { ...s, summary: value } : s,
      ),
    };
    saveOutlineIndex(updated);
  }

  function handleDragStart(sceneId: string) {
    setDragItem(sceneId);
  }

  function handleDragEnd() {
    setDragItem(null);
    setDropTarget(null);
  }

  function handleSceneDragOver(e: React.DragEvent, sceneId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem || dragItem === sceneId) {
      setDropTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDropTarget({ sceneId, position });
  }

  function handleActDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleSceneDrop(e: React.DragEvent, targetSceneId: string, targetActId: string) {
    e.stopPropagation();
    if (!dragItem || dragItem === targetSceneId) {
      handleDragEnd();
      return;
    }
    const scene = index.scenes.find((s) => s.id === dragItem);
    if (!scene) { handleDragEnd(); return; }

    const oldActId = scene.actId;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    const targetActScenes = index.scenes
      .filter((s) => s.actId === targetActId && s.id !== dragItem)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    const targetIdx = targetActScenes.findIndex((s) => s.id === targetSceneId);
    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
    targetActScenes.splice(insertIdx, 0, { ...scene, actId: targetActId });

    const reordered = targetActScenes.map((s, i) => ({ ...s, order: i + 1 }));
    let updatedScenes = index.scenes
      .filter((s) => s.id !== dragItem && s.actId !== targetActId)
      .concat(reordered);

    if (oldActId && oldActId !== targetActId) {
      updatedScenes = normalizeSceneOrders(updatedScenes, oldActId);
    }

    saveOutlineIndex({ ...index, scenes: updatedScenes });
    handleDragEnd();
  }

  function handleActDrop(targetActId: string) {
    if (!dragItem) return;
    const scene = index.scenes.find((s) => s.id === dragItem);
    if (!scene) { handleDragEnd(); return; }

    const oldActId = scene.actId;
    let updatedScenes = index.scenes.map((s) =>
      s.id === dragItem ? { ...s, actId: targetActId, order: 999 } : s,
    );
    updatedScenes = normalizeSceneOrders(updatedScenes, targetActId);
    if (oldActId && oldActId !== targetActId) {
      updatedScenes = normalizeSceneOrders(updatedScenes, oldActId);
    }
    saveOutlineIndex({ ...index, scenes: updatedScenes });
    handleDragEnd();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-zinc-200 select-none cursor-default">Outline</h2>
        <button
          onClick={handleAddAct}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Act
        </button>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        <div className="w-64 shrink-0 overflow-y-auto space-y-2">
          {sortedActs.map((act, actIdx) => {
            const actPosition = actIdx + 1;
            const actScenes = index.scenes
              .filter((s) => s.actId === act.id)
              .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

            return (
              <div
                key={act.id}
                className="bg-zinc-900/30 rounded-xl border border-zinc-800/50"
                onDragOver={handleActDragOver}
                onDrop={() => handleActDrop(act.id)}
                onDragLeave={() => setDropTarget(null)}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-purple-500/15 text-[10px] font-bold text-purple-400 uppercase tracking-wider select-none cursor-default">
                    Act {actPosition}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleAddScene(act.id)}
                      className="p-1 text-zinc-500 hover:text-purple-400 transition-colors"
                      title="Add scene"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAct(act)}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {act.summary !== undefined && (
                  <div className="px-3 pb-1 -mt-1">
                    <InlineField
                      value={act.summary || ''}
                      placeholder="Description..."
                      onCommit={(v) => handleActSummaryCommit(act.id, v)}
                      isSelected={false}
                      className="text-xs w-full"
                    />
                  </div>
                )}
                <div className="px-2 pb-2 space-y-0.5">
                  {actScenes.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center py-2">
                      No scenes
                    </p>
                  ) : (
                    actScenes.map((scene, sceneIdx) => {
                      const scenePosition = sceneIdx + 1;
                      const isSelected = selectedSceneId === scene.id;
                      const showBefore = dropTarget?.sceneId === scene.id && dropTarget.position === 'before';
                      const showAfter = dropTarget?.sceneId === scene.id && dropTarget.position === 'after';
                      return (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={() => handleDragStart(scene.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleSceneDragOver(e, scene.id)}
                          onDrop={(e) => handleSceneDrop(e, scene.id, act.id)}
                          className={`group relative flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                            isSelected
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'text-zinc-400 hover:bg-zinc-800/50'
                          }`}
                          onClick={() => handleSelectScene(scene)}
                        >
                          {showBefore && <div className="absolute -top-px left-2 right-2 h-0.5 bg-purple-500 rounded-full pointer-events-none" />}
                          {showAfter && <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-purple-500 rounded-full pointer-events-none" />}
                          <GripVertical className="w-3 h-3 text-zinc-600 shrink-0 cursor-grab mt-1" />
                          <span
                            className={`shrink-0 mt-0.5 px-1.5 py-0 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-zinc-800/60 text-zinc-500'
                            }`}
                          >
                            S{scenePosition}
                          </span>
                          <div className="flex-1 min-w-0">
                            <InlineField
                              value={scene.summary || ''}
                              placeholder="Description..."
                              onCommit={(v) => handleSceneSummaryCommit(scene.id, v)}
                              isSelected={isSelected}
                              onClick={() => handleSelectScene(scene)}
                              className="text-xs w-full"
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-all shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          {index.acts.length === 0 && (
            <div className="text-center text-zinc-600 text-sm py-8">
              Add acts to start structuring your story
            </div>
          )}
        </div>

        <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
          {selectedSceneId ? (
            <MarkdownEditor
              content={sceneContent}
              onChange={handleSceneContentChange}
              placeholder="Write scene beats, notes, and descriptions..."
              className="h-full overflow-y-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
              Select a scene to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
