import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

export function registerExportHandlers() {
  ipcMain.handle(
    'dialog:selectSavePath',
    async (
      _event,
      defaultName: string,
      filters: { name: string; extensions: string[] }[],
    ) => {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters,
      });
      if (result.canceled) return null;
      return result.filePath;
    },
  );

  ipcMain.handle(
    'export:markdown',
    async (_event, projectPath: string, outputPath: string) => {
      const manuscriptIndex = JSON.parse(
        await fs.readFile(
          path.join(projectPath, 'Manuscript', '_index.json'),
          'utf-8',
        ),
      );

      const parts: string[] = [];

      const projectInfo = JSON.parse(
        await fs.readFile(
          path.join(projectPath, '.booksmith', 'project.json'),
          'utf-8',
        ),
      );
      parts.push(`# ${projectInfo.name}\n`);
      if (projectInfo.author) {
        parts.push(`*By ${projectInfo.author}*\n`);
      }
      parts.push('---\n');

      const chapters = (manuscriptIndex.chapters || [])
        .slice()
        .sort((a: { order?: number }, b: { order?: number }) =>
          (a.order ?? 0) - (b.order ?? 0),
        );

      for (const chapter of chapters) {
        try {
          const chapterPath = path.join(
            projectPath,
            'Manuscript',
            'chapters',
            chapter.filename,
          );
          const content = await fs.readFile(chapterPath, 'utf-8');
          const bodyContent = content.replace(/^---[\s\S]*?---\n*/, '');
          parts.push(bodyContent);
          parts.push('\n---\n');
        } catch {
          // skip missing chapters
        }
      }

      await fs.writeFile(outputPath, parts.join('\n'), 'utf-8');
      return outputPath;
    },
  );

  ipcMain.handle(
    'export:pdf',
    async (_event, _projectPath: string, _outputPath: string) => {
      // PDF export placeholder - will use a headless renderer approach
      return null;
    },
  );
}
