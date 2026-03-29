import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Lightbulb,
  Globe,
  Users,
  List,
  PenTool,
  RotateCcw,
  FileDown,
  Target,
  BookOpen,
  TrendingUp,
  Edit3,
} from 'lucide-react';
import {
  useProjectStore,
  type ToggleableFeature,
} from '@renderer/stores/projectStore';
import { countWords } from '@renderer/lib/wordcount';

interface PhaseCard {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
  feature?: ToggleableFeature;
}

const PHASES: PhaseCard[] = [
  {
    id: 'ideation',
    label: 'Ideation',
    icon: Lightbulb,
    description: 'Brainstorm your premise, themes, and ideas',
    color: 'text-yellow-400',
    feature: 'ideation',
  },
  {
    id: 'worldbuilding',
    label: 'World Building',
    icon: Globe,
    description: 'Craft locations, lore, and systems',
    color: 'text-emerald-400',
    feature: 'worldbuilding',
  },
  {
    id: 'characters',
    label: 'Characters',
    icon: Users,
    description: 'Develop characters and relationships',
    color: 'text-blue-400',
    feature: 'characters',
  },
  {
    id: 'outline',
    label: 'Outline',
    icon: List,
    description: 'Structure your plot and scenes',
    color: 'text-purple-400',
    feature: 'outline',
  },
  {
    id: 'manuscript',
    label: 'Manuscript',
    icon: PenTool,
    description: 'Write your chapters',
    color: 'text-amber-400',
  },
  {
    id: 'revision',
    label: 'Revision',
    icon: RotateCcw,
    description: 'Review and refine your work',
    color: 'text-rose-400',
  },
  {
    id: 'export',
    label: 'Export',
    icon: FileDown,
    description: 'Export your finished manuscript',
    color: 'text-cyan-400',
  },
];

const FEATURE_META: Record<ToggleableFeature, { label: string }> = {
  ideation: { label: 'Ideation' },
  worldbuilding: { label: 'World' },
  characters: { label: 'Characters' },
  outline: { label: 'Outline' },
};

const INLINE_BASE =
  'bg-transparent border-none outline-none transition-colors text-zinc-300 hover:text-white focus:text-white';

function InlineInput({
  value,
  onCommit,
  className = '',
  placeholder,
  type = 'text',
  autoSize = false,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
  autoSize?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (autoSize && measureRef.current && ref.current) {
      const text = local || placeholder || '';
      measureRef.current.textContent = text;
      ref.current.style.width = `${measureRef.current.offsetWidth + 4}px`;
    }
  }, [local, autoSize, placeholder]);

  const commit = useCallback(() => {
    const trimmed = local.trim();
    if (trimmed !== value) onCommit(trimmed);
  }, [local, value, onCommit]);

  return (
    <>
      <input
        ref={ref}
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur();
        }}
        placeholder={placeholder}
        className={`${INLINE_BASE} ${className}`}
      />
      {autoSize && (
        <span
          ref={measureRef}
          aria-hidden
          className={className}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            height: 0,
            overflow: 'hidden',
            whiteSpace: 'pre',
          }}
        />
      )}
    </>
  );
}

function InlineNumberInput({
  value,
  onCommit,
  className = '',
  autoSize = false,
}: {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
  autoSize?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const formatNum = (n: number) => (n > 0 ? n.toLocaleString() : '');
  const [local, setLocal] = useState(() => formatNum(value));

  useEffect(() => {
    setLocal(formatNum(value));
  }, [value]);

  useEffect(() => {
    if (autoSize && measureRef.current && ref.current) {
      const text = local || '0';
      measureRef.current.textContent = text;
      ref.current.style.width = `${measureRef.current.offsetWidth + 4}px`;
    }
  }, [local, autoSize]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^\d]/g, '');
    const n = parseInt(digits, 10);
    setLocal(isNaN(n) ? '' : n.toLocaleString());
  }

  const commit = useCallback(() => {
    const n = parseInt(local.replace(/,/g, ''), 10);
    if (!isNaN(n) && n > 0 && n !== value) onCommit(n);
    else setLocal(formatNum(value));
  }, [local, value, onCommit]);

  return (
    <>
      <input
        ref={ref}
        inputMode="numeric"
        value={local}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur();
        }}
        className={`${INLINE_BASE} ${className}`}
      />
      {autoSize && (
        <span
          ref={measureRef}
          aria-hidden
          className={className}
          style={{
            position: 'absolute',
            visibility: 'hidden',
            height: 0,
            overflow: 'hidden',
            whiteSpace: 'pre',
          }}
        />
      )}
    </>
  );
}

function InlineTextarea({
  value,
  onCommit,
  className = '',
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    autoResize();
  }, [local]);

  const commit = useCallback(() => {
    const trimmed = local.trim();
    if (trimmed !== value) onCommit(trimmed);
  }, [local, value, onCommit]);

  return (
    <textarea
      ref={ref}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        autoResize();
      }}
      onBlur={commit}
      rows={1}
      placeholder={placeholder}
      className={`${INLINE_BASE} resize-none overflow-hidden ${className}`}
    />
  );
}

export function Dashboard() {
  const { projectInfo, projectPath, setCurrentSection, saveProjectInfo } =
    useProjectStore();
  const [stats, setStats] = useState({
    wordCount: 0,
    chapterCount: 0,
    characterCount: 0,
    sceneCount: 0,
  });
  const [editingPhases, setEditingPhases] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<ToggleableFeature | null>(null);

  useEffect(() => {
    if (projectPath) loadStats();
  }, [projectPath]);

  async function loadStats() {
    if (!projectPath) return;
    try {
      const [manuscriptIdx, charIdx, outlineIdx] = await Promise.all([
        window.bookSmithy.fs.readJsonFile(
          `${projectPath}/Manuscript/_index.json`,
        ),
        window.bookSmithy.fs.readJsonFile(
          `${projectPath}/Characters/_index.json`,
        ),
        window.bookSmithy.fs.readJsonFile(
          `${projectPath}/Outline/_index.json`,
        ),
      ]);

      const chapters = manuscriptIdx?.chapters || [];
      let totalWords = 0;
      for (const ch of chapters) {
        try {
          const content = await window.bookSmithy.fs.readFile(
            `${projectPath}/Manuscript/chapters/${ch.filename}`,
          );
          if (content) totalWords += countWords(content);
        } catch {
          /* skip */
        }
      }

      setStats({
        wordCount: totalWords,
        chapterCount: chapters.length,
        characterCount: (charIdx?.characters || []).length,
        sceneCount: (outlineIdx?.scenes || []).length,
      });
    } catch {
      /* empty project */
    }
  }

  function saveField(key: string, value: unknown) {
    saveProjectInfo({ [key]: value });
  }

  const features = projectInfo?.enabledFeatures;

  function isFeatureEnabled(id: ToggleableFeature): boolean {
    return features?.[id] !== false;
  }

  async function handleToggleFeature(id: ToggleableFeature) {
    if (!projectPath || !features) return;
    if (isFeatureEnabled(id)) {
      setConfirmDisable(id);
    } else {
      await window.bookSmithy.project.ensureFeatureDirs(projectPath, id);
      await saveProjectInfo({ enabledFeatures: { ...features, [id]: true } });
    }
  }

  async function handleDisableFeature(deleteData: boolean) {
    if (!confirmDisable || !projectPath || !features) return;
    if (deleteData) {
      await window.bookSmithy.project.deleteFeatureData(projectPath, confirmDisable);
    }
    await saveProjectInfo({ enabledFeatures: { ...features, [confirmDisable]: false } });
    setConfirmDisable(null);
  }

  const goal = projectInfo?.wordCountGoal || 80000;
  const progress = Math.min(100, Math.round((stats.wordCount / goal) * 100));

  const visiblePhases = editingPhases
    ? PHASES
    : PHASES.filter((p) => !p.feature || isFeatureEnabled(p.feature));

  return (
    <div className="p-8 max-w-5xl mx-auto select-none cursor-default">
      {/* Project header — always inline-editable */}
      <div className="mb-8">
        <InlineInput
          value={projectInfo?.name || ''}
          onCommit={(v) => saveField('name', v)}
          placeholder="Untitled"
          className="text-3xl font-bold w-full"
        />
        <div className="flex items-center gap-1 mt-1">
          <span className="text-zinc-500 text-sm pl-1">by</span>
          <InlineInput
            value={projectInfo?.author || ''}
            onCommit={(v) => saveField('author', v)}
            placeholder="Author name"
            className="text-sm text-zinc-400"
          />
        </div>
        <div className="mt-1.5">
          <InlineInput
            value={projectInfo?.genre || ''}
            onCommit={(v) => saveField('genre', v)}
            placeholder="Genre"
            autoSize
            className="text-xs text-zinc-500 !bg-zinc-800/50 rounded-full px-3 py-1 hover:!bg-zinc-800/70 focus:!bg-zinc-800/70 hover:text-zinc-400 focus:text-zinc-400"
          />
        </div>
        <InlineTextarea
          value={projectInfo?.description || ''}
          onCommit={(v) => saveField('description', v)}
          placeholder="Add a description..."
          className="text-sm text-zinc-500 mt-2 w-full max-w-xl"
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-zinc-500">Words</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {stats.wordCount.toLocaleString()}
          </div>
          <div className="mt-2">
            <div className="w-full h-1.5 bg-zinc-800 rounded-full">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 mt-1 inline-flex items-baseline gap-1">
              <span>{progress}% of</span>
              <InlineNumberInput
                value={goal}
                onCommit={(n) => saveField('wordCountGoal', n)}
                autoSize
                className="text-xs text-zinc-500 tabular-nums"
              />
              <span>goal</span>
            </span>
          </div>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500">Chapters</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {stats.chapterCount}
          </div>
        </div>
        {isFeatureEnabled('characters') && (
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-500">Characters</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.characterCount}
            </div>
          </div>
        )}
        {isFeatureEnabled('outline') && (
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-500">Scenes</span>
            </div>
            <div className="text-2xl font-bold text-zinc-100">
              {stats.sceneCount}
            </div>
          </div>
        )}
      </div>

      {/* Writing Phases — edit icon toggles feature switches */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-200">
          Writing Phases
        </h2>
        <button
          onClick={() => setEditingPhases(!editingPhases)}
          className={`p-2 rounded-lg transition-colors ${
            editingPhases
              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/15'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
          }`}
          title={editingPhases ? 'Done editing' : 'Customize features'}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {visiblePhases.map((phase) => {
          const disabled = phase.feature && !isFeatureEnabled(phase.feature);
          return (
            <div
              key={phase.id}
              className={`group relative flex items-start gap-3 p-4 border rounded-xl text-left transition-all ${
                disabled
                  ? 'bg-zinc-900/10 border-zinc-800/30 opacity-50'
                  : 'bg-zinc-900/30 hover:bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700 cursor-pointer'
              }`}
              onClick={() => {
                if (!disabled && !editingPhases) setCurrentSection(phase.id);
              }}
            >
              <phase.icon
                className={`w-5 h-5 ${disabled ? 'text-zinc-600' : phase.color} shrink-0 mt-0.5`}
              />
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${disabled ? 'text-zinc-600' : 'text-zinc-200 group-hover:text-zinc-100'}`}>
                  {phase.label}
                </div>
                <div className={`text-xs mt-0.5 ${disabled ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {phase.description}
                </div>
              </div>
              {editingPhases && phase.feature && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFeature(phase.feature!);
                  }}
                  className={`relative shrink-0 rounded-full transition-colors ${
                    !disabled ? 'bg-amber-600' : 'bg-zinc-700'
                  }`}
                  style={{ width: 40, height: 22 }}
                >
                  <span
                    className={`absolute bg-white rounded-full shadow transition-transform ${
                      !disabled ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
                    style={{ width: 18, height: 18, top: 2, left: 2 }}
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {confirmDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-zinc-100 font-semibold mb-2">
              Disable {FEATURE_META[confirmDisable].label}?
            </h3>
            <p className="text-zinc-400 text-sm mb-5">
              Would you like to keep the data hidden or permanently delete it?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDisableFeature(false)}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm transition-colors"
              >
                Keep Hidden
              </button>
              <button
                onClick={() => handleDisableFeature(true)}
                className="w-full py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                Delete Data
              </button>
              <button
                onClick={() => setConfirmDisable(null)}
                className="w-full py-2 px-4 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
