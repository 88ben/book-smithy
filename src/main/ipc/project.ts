import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

type ToggleableFeature = 'ideation' | 'worldbuilding' | 'characters' | 'outline';

const DEFAULT_ENABLED_FEATURES: Record<ToggleableFeature, boolean> = {
  ideation: true,
  worldbuilding: true,
  characters: true,
  outline: true,
};

const ALWAYS_DIRS = [
  '.booksmith',
  'Manuscript',
  'Manuscript/chapters',
  'Revisions',
  'Revisions/snapshots',
  'Assets',
  'Assets/images',
];

const FEATURE_DIRS: Record<ToggleableFeature, string[]> = {
  ideation: ['Ideation', 'Ideation/notes'],
  worldbuilding: ['World', 'World/locations', 'World/lore', 'World/systems'],
  characters: ['Characters'],
  outline: ['Outline', 'Outline/acts', 'Outline/scenes'],
};

interface ProjectInfo {
  name: string;
  author: string;
  genre: string;
  description: string;
  wordCountGoal: number;
  createdAt: string;
  updatedAt: string;
  enabledFeatures: Record<ToggleableFeature, boolean>;
}

function defaultProjectInfo(
  name: string,
  enabledFeatures?: Record<ToggleableFeature, boolean>,
): ProjectInfo {
  const now = new Date().toISOString();
  return {
    name,
    author: '',
    genre: '',
    description: '',
    wordCountGoal: 80000,
    createdAt: now,
    updatedAt: now,
    enabledFeatures: enabledFeatures || { ...DEFAULT_ENABLED_FEATURES },
  };
}

function getFeatureSeedFiles(
  feature: ToggleableFeature,
  createdAt: string,
): Record<string, string> {
  switch (feature) {
    case 'ideation':
      return {
        'Ideation/premise.md': [
          '---',
          'title: Premise',
          `created: ${createdAt}`,
          '---',
          '',
          '# Premise',
          '',
          'What is the core idea of your story?',
          '',
        ].join('\n'),
        'Ideation/themes.md': [
          '---',
          'title: Themes',
          `created: ${createdAt}`,
          '---',
          '',
          '# Themes',
          '',
          'What themes will your story explore?',
          '',
        ].join('\n'),
        'Ideation/_index.json': JSON.stringify(
          { notes: [], links: [], nodePositions: {} },
          null,
          2,
        ),
      };
    case 'worldbuilding':
      return {
        'World/_index.json': JSON.stringify(
          { categories: ['locations', 'lore', 'systems'] },
          null,
          2,
        ),
      };
    case 'characters':
      return {
        'Characters/_index.json': JSON.stringify(
          { characters: [], relationships: [] },
          null,
          2,
        ),
      };
    case 'outline':
      return {
        'Outline/_index.json': JSON.stringify(
          { structureType: 'three-act', acts: [], scenes: [] },
          null,
          2,
        ),
      };
  }
}

export function registerProjectHandlers() {
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'project:create',
    async (
      _event,
      name: string,
      location: string,
      enabledFeatures?: Record<ToggleableFeature, boolean>,
    ) => {
      const projectPath = path.join(location, name);
      const features = enabledFeatures || { ...DEFAULT_ENABLED_FEATURES };

      for (const dir of ALWAYS_DIRS) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }

      for (const [feature, enabled] of Object.entries(features)) {
        if (enabled) {
          for (const dir of FEATURE_DIRS[feature as ToggleableFeature] || []) {
            await fs.mkdir(path.join(projectPath, dir), { recursive: true });
          }
        }
      }

      const projectInfo = defaultProjectInfo(name, features);
      await fs.writeFile(
        path.join(projectPath, '.booksmith', 'project.json'),
        JSON.stringify(projectInfo, null, 2),
      );

      const alwaysFiles: Record<string, string> = {
        'Manuscript/_index.json': JSON.stringify({ chapters: [] }, null, 2),
        'Revisions/_index.json': JSON.stringify({ snapshots: [] }, null, 2),
      };

      for (const [filePath, content] of Object.entries(alwaysFiles)) {
        await fs.writeFile(path.join(projectPath, filePath), content);
      }

      for (const [feature, enabled] of Object.entries(features)) {
        if (enabled) {
          const seedFiles = getFeatureSeedFiles(
            feature as ToggleableFeature,
            projectInfo.createdAt,
          );
          for (const [filePath, content] of Object.entries(seedFiles)) {
            await fs.writeFile(path.join(projectPath, filePath), content);
          }
        }
      }

      return projectPath;
    },
  );

  ipcMain.handle(
    'project:ensureFeatureDirs',
    async (_event, projectPath: string, feature: ToggleableFeature) => {
      const dirs = FEATURE_DIRS[feature] || [];
      for (const dir of dirs) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
      }

      const seedFiles = getFeatureSeedFiles(feature, new Date().toISOString());
      for (const [filePath, content] of Object.entries(seedFiles)) {
        const fullPath = path.join(projectPath, filePath);
        try {
          await fs.access(fullPath);
        } catch {
          await fs.writeFile(fullPath, content);
        }
      }
    },
  );

  ipcMain.handle(
    'project:deleteFeatureData',
    async (_event, projectPath: string, feature: ToggleableFeature) => {
      const rootDir = FEATURE_DIRS[feature]?.[0];
      if (!rootDir) return;
      const fullPath = path.join(projectPath, rootDir);
      try {
        await fs.rm(fullPath, { recursive: true, force: true });
      } catch {
        // already gone
      }
    },
  );

  ipcMain.handle('project:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled) return null;

    const projectPath = result.filePaths[0];
    const projectJsonPath = path.join(
      projectPath,
      '.booksmith',
      'project.json',
    );

    try {
      await fs.access(projectJsonPath);
      return projectPath;
    } catch {
      return null;
    }
  });

  ipcMain.handle('project:getInfo', async (_event, projectPath: string) => {
    try {
      const content = await fs.readFile(
        path.join(projectPath, '.booksmith', 'project.json'),
        'utf-8',
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  });
}
