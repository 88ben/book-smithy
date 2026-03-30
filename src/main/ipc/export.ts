import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import epub from 'epub-gen-memory';

interface ChapterIndex {
  title: string;
  filename: string;
  order?: number;
  status?: string;
}

async function loadProjectAndChapters(projectPath: string) {
  const manuscriptIndex = JSON.parse(
    await fs.readFile(
      path.join(projectPath, 'Manuscript', '_index.json'),
      'utf-8',
    ),
  );

  const projectInfo = JSON.parse(
    await fs.readFile(
      path.join(projectPath, '.booksmith', 'project.json'),
      'utf-8',
    ),
  );

  const chapters: ChapterIndex[] = (manuscriptIndex.chapters || [])
    .slice()
    .sort((a: ChapterIndex, b: ChapterIndex) =>
      (a.order ?? 0) - (b.order ?? 0),
    );

  return { projectInfo, chapters };
}

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
      const { projectInfo, chapters } = await loadProjectAndChapters(projectPath);

      const parts: string[] = [];
      parts.push(`# ${projectInfo.name}\n`);
      if (projectInfo.author) {
        parts.push(`*By ${projectInfo.author}*\n`);
      }
      parts.push('---\n');

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
    'export:epub',
    async (_event, projectPath: string, outputPath: string) => {
      const { projectInfo, chapters } = await loadProjectAndChapters(projectPath);

      const epubChapters: { title: string; content: string }[] = [];

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const displayTitle = ch.title?.trim() || `Chapter ${i + 1}`;
        try {
          const chapterPath = path.join(
            projectPath,
            'Manuscript',
            'chapters',
            ch.filename,
          );
          const raw = await fs.readFile(chapterPath, 'utf-8');
          const body = raw.replace(/^---[\s\S]*?---\n*/, '');
          const html = markdownToHtml(body);
          epubChapters.push({ title: displayTitle, content: html });
        } catch {
          epubChapters.push({ title: displayTitle, content: '<p></p>' });
        }
      }

      const buffer = await epub(
        {
          title: projectInfo.name || 'Untitled',
          author: projectInfo.author || 'Unknown Author',
          description: projectInfo.description || '',
          lang: 'en',
          tocTitle: 'Table of Contents',
          css: `body { font-family: Georgia, "Times New Roman", serif; line-height: 1.8; }
h1, h2, h3 { margin-top: 1.5em; }
p { margin: 0.5em 0; text-indent: 1.5em; }
hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }`,
        },
        epubChapters,
      );

      await fs.writeFile(outputPath, buffer);
      return outputPath;
    },
  );

  ipcMain.handle(
    'export:pdf',
    async (_event, _projectPath: string, _outputPath: string) => {
      return null;
    },
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(?:^<li>.*<\/li>\n?)+/gm, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br />')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><(h[1-3]|hr|ul|ol)/g, '<$1')
    .replace(/<\/(h[1-3])><\/p>/g, '</$1>')
    .replace(/<hr \/><\/p>/g, '<hr />')
    .replace(/<\/ul><\/p>/g, '</ul>');
}
