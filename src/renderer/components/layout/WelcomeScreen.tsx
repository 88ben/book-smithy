import React, { useState } from 'react';
import { BookOpen, FolderOpen, Globe, Lightbulb, List, Plus, Users } from 'lucide-react';
import {
  useProjectStore,
  DEFAULT_ENABLED_FEATURES,
  type ToggleableFeature,
} from '@renderer/stores/projectStore';

const FEATURE_OPTIONS: { id: ToggleableFeature; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'ideation', label: 'Ideation', icon: Lightbulb, description: 'Premise, themes, and research notes' },
  { id: 'worldbuilding', label: 'World', icon: Globe, description: 'Locations, lore, and systems' },
  { id: 'characters', label: 'Characters', icon: Users, description: 'Character profiles and relationships' },
  { id: 'outline', label: 'Outline', icon: List, description: 'Plot structure and scenes' },
];

export function WelcomeScreen() {
  const { openProject, createProject } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState({ ...DEFAULT_ENABLED_FEATURES });

  function toggleFeature(id: ToggleableFeature) {
    setEnabledFeatures((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const location = await window.bookSmithy.project.selectDirectory();
    if (!location) return;
    setCreating(true);
    try {
      await createProject(newName.trim(), location, enabledFeatures);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-amber-500" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Book Smithy</h1>
        <p className="text-zinc-400 mb-10">
          Forge your story from idea to finished book
        </p>

        {!showCreate ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <button
              onClick={openProject}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Open Existing Project
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Project name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="w-full py-3 px-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
            />

            <div className="text-left">
              <p className="text-xs text-zinc-500 mb-2 px-1">Features to include:</p>
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleFeature(opt.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      enabledFeatures[opt.id]
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'
                    }`}
                  >
                    <opt.icon className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{opt.label}</div>
                      <div className="text-[10px] opacity-60 truncate">{opt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowCreate(false); setEnabledFeatures({ ...DEFAULT_ENABLED_FEATURES }); }}
                className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                {creating ? 'Creating...' : 'Choose Location & Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
