import { create } from 'zustand';

export type ToggleableFeature = 'ideation' | 'worldbuilding' | 'characters' | 'outline';

export const ALL_TOGGLEABLE_FEATURES: ToggleableFeature[] = [
  'ideation',
  'worldbuilding',
  'characters',
  'outline',
];

export const DEFAULT_ENABLED_FEATURES: Record<ToggleableFeature, boolean> = {
  ideation: true,
  worldbuilding: true,
  characters: true,
  outline: true,
};

export interface ProjectInfo {
  name: string;
  author: string;
  genre: string;
  description: string;
  wordCountGoal: number;
  createdAt: string;
  updatedAt: string;
  enabledFeatures: Record<ToggleableFeature, boolean>;
}

export interface ChapterEntry {
  id: string;
  title: string;
  filename: string;
  status: 'draft' | 'revising' | 'complete';
  wordCount: number;
  order: number;
}

export interface CharacterEntry {
  id: string;
  name: string;
  filename: string;
  role: string;
}

export interface OutlineEntry {
  id: string;
  title: string;
  filename: string;
  type: 'act' | 'scene';
  actId?: string;
  order: number;
  summary?: string;
}

export interface Relationship {
  source: string;
  target: string;
  label: string;
}

export interface NoteEntry {
  id: string;
  name: string;
  filename: string;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  folder: string;
}

interface ProjectState {
  projectPath: string | null;
  projectInfo: ProjectInfo | null;
  sidebarCollapsed: boolean;
  currentSection: string;
  focusMode: boolean;

  setProjectPath: (path: string | null) => void;
  setProjectInfo: (info: ProjectInfo | null) => void;
  toggleSidebar: () => void;
  setCurrentSection: (section: string) => void;
  setFocusMode: (enabled: boolean) => void;

  openProject: () => Promise<void>;
  createProject: (name: string, location: string, enabledFeatures?: Record<ToggleableFeature, boolean>) => Promise<void>;
  loadProjectInfo: () => Promise<void>;
  saveProjectInfo: (info: Partial<ProjectInfo>) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  projectInfo: null,
  sidebarCollapsed: false,
  currentSection: 'dashboard',
  focusMode: false,

  setProjectPath: (path) => set({ projectPath: path }),
  setProjectInfo: (info) => set({ projectInfo: info }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentSection: (section) => set({ currentSection: section }),
  setFocusMode: (enabled) => set({ focusMode: enabled }),

  openProject: async () => {
    const projectPath = await window.bookSmithy.project.open();
    if (projectPath) {
      set({ projectPath });
      await get().loadProjectInfo();
    }
  },

  createProject: async (name, location, enabledFeatures) => {
    const features = enabledFeatures || DEFAULT_ENABLED_FEATURES;
    const projectPath = await window.bookSmithy.project.create(name, location, features);
    if (projectPath) {
      set({ projectPath });
      await get().loadProjectInfo();
    }
  },

  loadProjectInfo: async () => {
    const { projectPath } = get();
    if (!projectPath) return;
    const info = await window.bookSmithy.project.getInfo(projectPath);
    if (info) {
      if (!info.enabledFeatures) {
        info.enabledFeatures = { ...DEFAULT_ENABLED_FEATURES };
      }
      set({ projectInfo: info });
    }
  },

  saveProjectInfo: async (updates) => {
    const { projectPath, projectInfo } = get();
    if (!projectPath || !projectInfo) return;
    const updated = { ...projectInfo, ...updates, updatedAt: new Date().toISOString() };
    await window.bookSmithy.fs.writeJsonFile(
      `${projectPath}/.booksmith/project.json`,
      updated,
    );
    set({ projectInfo: updated });
  },
}));
