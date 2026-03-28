import React, { useEffect, useState } from 'react';
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
  ALL_TOGGLEABLE_FEATURES,
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
    description: 'Brainstorm your premise, themes, and core ideas',
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

const FEATURE_META: Record<ToggleableFeature, { label: string; icon: React.ElementType; color: string }> = {
  ideation: { label: 'Ideation', icon: Lightbulb, color: 'text-yellow-400' },
  worldbuilding: { label: 'World', icon: Globe, color: 'text-emerald-400' },
  characters: { label: 'Characters', icon: Users, color: 'text-blue-400' },
  outline: { label: 'Outline', icon: List, color: 'text-purple-400' },
};

export function Dashboard() {
  const { projectInfo, projectPath, setCurrentSection, saveProjectInfo } =
    useProjectStore();
  const [stats, setStats] = useState({
    wordCount: 0,
    chapterCount: 0,
    characterCount: 0,
    sceneCount: 0,
  });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    author: '',
    genre: '',
    description: '',
    wordCountGoal: 80000,
  });
  const [confirmDisable, setConfirmDisable] = useState<ToggleableFeature | null>(null);

  useEffect(() => {
    if (projectPath) loadStats();
  }, [projectPath]);

  useEffect(() => {
    if (projectInfo) {
      setEditForm({
        name: projectInfo.name,
        author: projectInfo.author,
        genre: projectInfo.genre,
        description: projectInfo.description,
        wordCountGoal: projectInfo.wordCountGoal,
      });
    }
  }, [projectInfo]);

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

  async function handleSaveInfo() {
    await saveProjectInfo(editForm);
    setEditing(false);
  }

  const features = projectInfo?.enabledFeatures;

  function isFeatureEnabled(id: ToggleableFeature): boolean {
    return features?.[id] !== false;
  }

  async function handleEnableFeature(id: ToggleableFeature) {
    if (!projectPath || !features) return;
    await window.bookSmithy.project.ensureFeatureDirs(projectPath, id);
    await saveProjectInfo({ enabledFeatures: { ...features, [id]: true } });
  }

  function handleRequestDisable(id: ToggleableFeature) {
    setConfirmDisable(id);
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        {editing ? (
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Title
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Author
                </label>
                <input
                  value={editForm.author}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, author: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Genre
                </label>
                <input
                  value={editForm.genre}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, genre: e.target.value }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Word Count Goal
                </label>
                <input
                  type="number"
                  value={editForm.wordCountGoal}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      wordCountGoal: parseInt(e.target.value) || 80000,
                    }))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-1">
                Description
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs text-zinc-500 mb-2">
                Features
              </label>
              <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 divide-y divide-zinc-700/50">
                {ALL_TOGGLEABLE_FEATURES.map((id) => {
                  const meta = FEATURE_META[id];
                  const enabled = isFeatureEnabled(id);
                  return (
                    <div key={id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <meta.icon className={`w-4 h-4 ${enabled ? meta.color : 'text-zinc-600'}`} />
                        <span className={`text-sm ${enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                          {meta.label}
                        </span>
                      </div>
                      <button
                        onClick={() => enabled ? handleRequestDisable(id) : handleEnableFeature(id)}
                        className={`relative rounded-full transition-colors ${
                          enabled ? 'bg-amber-600' : 'bg-zinc-700'
                        }`}
                        style={{ width: 40, height: 22 }}
                      >
                        <span
                          className={`absolute bg-white rounded-full shadow transition-transform ${
                            enabled ? 'translate-x-[18px]' : 'translate-x-0'
                          }`}
                          style={{ width: 18, height: 18, top: 2, left: 2 }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveInfo}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-1">
                {projectInfo?.name || 'Untitled'}
              </h1>
              {projectInfo?.author && (
                <p className="text-zinc-400 mb-1">
                  by {projectInfo.author}
                  {projectInfo.genre && (
                    <span className="ml-2 px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
                      {projectInfo.genre}
                    </span>
                  )}
                </p>
              )}
              {projectInfo?.description && (
                <p className="text-zinc-500 text-sm mt-2 max-w-xl">
                  {projectInfo.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Edit project info"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

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
            <span className="text-xs text-zinc-500 mt-1">
              {progress}% of {goal.toLocaleString()} goal
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

      <h2 className="text-lg font-semibold text-zinc-200 mb-4">
        Writing Phases
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {PHASES.filter(
          (p) => !p.feature || isFeatureEnabled(p.feature),
        ).map((phase) => (
          <button
            key={phase.id}
            onClick={() => setCurrentSection(phase.id)}
            className="group flex items-start gap-3 p-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700 rounded-xl text-left transition-all"
          >
            <phase.icon
              className={`w-5 h-5 ${phase.color} shrink-0 mt-0.5`}
            />
            <div>
              <div className="font-medium text-zinc-200 group-hover:text-zinc-100 text-sm">
                {phase.label}
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {phase.description}
              </div>
            </div>
          </button>
        ))}
      </div>

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
