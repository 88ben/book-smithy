import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectStore, type OutlineEntry } from '@renderer/stores/projectStore';
import { MarkdownEditor } from '@renderer/components/editor/MarkdownEditor';
import { parseFrontmatter, serializeFrontmatter } from '@renderer/lib/frontmatter';

interface OutlineIndex {
  structureType: string;
  acts: OutlineEntry[];
  scenes: OutlineEntry[];
}

const STRUCTURE_TYPES = [
  { id: 'three-act', label: 'Three-Act Structure' },
  { id: 'heros-journey', label: "Hero's Journey" },
  { id: 'save-the-cat', label: 'Save the Cat' },
  { id: 'freeform', label: 'Freeform' },
];

export function Outline() {
  const { projectPath } = useProjectStore();
  const [index, setIndex] = useState<OutlineIndex>({
    structureType: 'three-act',
    acts: [],
    scenes: [],
  });
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [sceneContent, setSceneContent] = useState('');
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dragItem, setDragItem] = useState<string | null>(null);

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
        setIndex(data);
        setExpandedActs(new Set((data.acts || []).map((a: OutlineEntry) => a.id)));
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
    const id = `act-${Date.now()}`;
    const filename = `${id}.md`;
    const filePath = `${projectPath}/Outline/acts/${filename}`;

    await window.bookSmithy.fs.writeFile(
      filePath,
      serializeFrontmatter(
        { title: `Act ${index.acts.length + 1}`, created: new Date().toISOString() },
        `\n# Act ${index.acts.length + 1}\n\nDescribe this act...\n`,
      ),
    );

    const act: OutlineEntry = {
      id,
      title: `Act ${index.acts.length + 1}`,
      filename,
      type: 'act',
      order: index.acts.length,
    };
    const updated = { ...index, acts: [...index.acts, act] };
    await saveOutlineIndex(updated);
    setExpandedActs((prev) => new Set([...prev, id]));
  }

  async function handleAddScene(actId?: string) {
    if (!projectPath) return;
    const id = `scene-${Date.now()}`;
    const filename = `${id}.md`;
    const filePath = `${projectPath}/Outline/scenes/${filename}`;

    const actScenes = index.scenes.filter((s) => s.actId === actId);

    await window.bookSmithy.fs.writeFile(
      filePath,
      serializeFrontmatter(
        {
          title: `Scene ${actScenes.length + 1}`,
          actId: actId || '',
          created: new Date().toISOString(),
        },
        `\n# Scene ${actScenes.length + 1}\n\nBeat notes and scene summary...\n`,
      ),
    );

    const scene: OutlineEntry = {
      id,
      title: `Scene ${actScenes.length + 1}`,
      filename,
      type: 'scene',
      actId,
      order: actScenes.length,
      summary: '',
    };
    const updated = { ...index, scenes: [...index.scenes, scene] };
    await saveOutlineIndex(updated);
  }

  async function handleSelectScene(scene: OutlineEntry) {
    const filePath = `${projectPath}/Outline/scenes/${scene.filename}`;
    setSelectedScene(filePath);
    try {
      const raw = await window.bookSmithy.fs.readFile(filePath);
      if (!raw) throw new Error('missing');
      const parsed = parseFrontmatter(raw);
      setSceneContent(parsed.content);
    } catch {
      setSceneContent('');
    }
  }

  function handleSceneContentChange(html: string) {
    setSceneContent(html);
    if (selectedScene) {
      autoSave(selectedScene, html, { updated: new Date().toISOString() });
    }
  }

  async function handleDeleteScene(scene: OutlineEntry) {
    if (!projectPath) return;
    await window.bookSmithy.fs.deleteFile(
      `${projectPath}/Outline/scenes/${scene.filename}`,
    );
    const updated = {
      ...index,
      scenes: index.scenes.filter((s) => s.id !== scene.id),
    };
    await saveOutlineIndex(updated);
    if (selectedScene === `${projectPath}/Outline/scenes/${scene.filename}`) {
      setSelectedScene(null);
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
    const updated = {
      ...index,
      acts: index.acts.filter((a) => a.id !== act.id),
      scenes: index.scenes.filter((s) => s.actId !== act.id),
    };
    await saveOutlineIndex(updated);
  }

  function handleStructureChange(type: string) {
    saveOutlineIndex({ ...index, structureType: type });
  }

  function toggleAct(actId: string) {
    setExpandedActs((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId);
      else next.add(actId);
      return next;
    });
  }

  function handleDragStart(sceneId: string) {
    setDragItem(sceneId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetActId: string | undefined) {
    if (!dragItem) return;
    const updated = {
      ...index,
      scenes: index.scenes.map((s) =>
        s.id === dragItem ? { ...s, actId: targetActId } : s,
      ),
    };
    saveOutlineIndex(updated);
    setDragItem(null);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <select
          value={index.structureType}
          onChange={(e) => handleStructureChange(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50"
        >
          {STRUCTURE_TYPES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddAct}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Act
        </button>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        <div className="w-80 shrink-0 overflow-y-auto space-y-2">
          {index.acts.map((act) => {
            const actScenes = index.scenes
              .filter((s) => s.actId === act.id)
              .sort((a, b) => a.order - b.order);
            const isExpanded = expandedActs.has(act.id);

            return (
              <div
                key={act.id}
                className="bg-zinc-900/30 rounded-xl border border-zinc-800/50"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(act.id)}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <button
                    onClick={() => toggleAct(act.id)}
                    className="flex items-center gap-2 text-sm font-medium text-zinc-200"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                    {act.title}
                  </button>
                  <div className="flex items-center gap-1">
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
                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1">
                    {actScenes.length === 0 ? (
                      <p className="text-xs text-zinc-600 text-center py-2">
                        No scenes
                      </p>
                    ) : (
                      actScenes.map((scene) => (
                        <div
                          key={scene.id}
                          draggable
                          onDragStart={() => handleDragStart(scene.id)}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                            selectedScene ===
                            `${projectPath}/Outline/scenes/${scene.filename}`
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'text-zinc-400 hover:bg-zinc-800/50'
                          }`}
                          onClick={() => handleSelectScene(scene)}
                        >
                          <GripVertical className="w-3 h-3 text-zinc-600 shrink-0 cursor-grab" />
                          <span className="truncate">{scene.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene);
                            }}
                            className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-zinc-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
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
          {selectedScene ? (
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
