import React, { useEffect, useState } from 'react';
import {
  FileText,
  FileDown,
  BookOpen,
  Check,
  Loader2,
} from 'lucide-react';
import { useProjectStore, type ChapterEntry } from '@renderer/stores/projectStore';
import { parseFrontmatter } from '@renderer/lib/frontmatter';
import { countWords } from '@renderer/lib/wordcount';
import { sortedChapters, chapterDisplayTitle } from '@renderer/lib/manuscript';

type ExportFormat = 'markdown' | 'html' | 'text';

interface ChapterPreview {
  title: string;
  wordCount: number;
  status: string;
}

export function ExportPage() {
  const { projectPath, projectInfo } = useProjectStore();
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [chapters, setChapters] = useState<ChapterPreview[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    if (projectPath) loadPreview();
  }, [projectPath, format]);

  async function loadPreview() {
    if (!projectPath) return;
    try {
      const data = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Manuscript/_index.json`,
      );
      const chapterEntries: ChapterEntry[] = data?.chapters || [];
      const sorted = sortedChapters(chapterEntries);

      const previews: ChapterPreview[] = [];
      const contentParts: string[] = [];

      if (projectInfo) {
        contentParts.push(`# ${projectInfo.name}`);
        if (projectInfo.author) {
          contentParts.push(`\n*By ${projectInfo.author}*`);
        }
        contentParts.push('\n---\n');
      }

      for (let i = 0; i < sorted.length; i++) {
        const ch = sorted[i];
        const displayName = chapterDisplayTitle(ch, i + 1);
        try {
          const raw = await window.bookSmithy.fs.readFile(
            `${projectPath}/Manuscript/chapters/${ch.filename}`,
          );
          if (!raw) throw new Error('missing');
          const parsed = parseFrontmatter(raw);
          const wc = countWords(parsed.content);
          previews.push({
            title: displayName,
            wordCount: wc,
            status: ch.status,
          });

          const body = raw.replace(/^---[\s\S]*?---\n*/, '');
          contentParts.push(body);
          contentParts.push('\n---\n');
        } catch {
          previews.push({
            title: displayName,
            wordCount: 0,
            status: ch.status,
          });
        }
      }

      setChapters(previews);
      setPreviewContent(contentParts.join('\n'));
    } catch {
      setChapters([]);
      setPreviewContent('');
    }
  }

  async function handleExport() {
    if (!projectPath) return;
    setExporting(true);
    setExported(false);

    try {
      const extensions: Record<ExportFormat, string[]> = {
        markdown: ['md'],
        html: ['html'],
        text: ['txt'],
      };
      const formatNames: Record<ExportFormat, string> = {
        markdown: 'Markdown',
        html: 'HTML',
        text: 'Plain Text',
      };

      const defaultName = `${projectInfo?.name || 'manuscript'}.${extensions[format][0]}`;
      const savePath = await window.bookSmithy.export.selectSavePath(
        defaultName,
        [{ name: formatNames[format], extensions: extensions[format] }],
      );

      if (!savePath) {
        setExporting(false);
        return;
      }

      let content = previewContent;

      if (format === 'html') {
        content = markdownToBasicHtml(previewContent, projectInfo?.name || '');
      } else if (format === 'text') {
        content = previewContent
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
          .replace(/---/g, '_______________');
      }

      await window.bookSmithy.fs.writeFile(savePath, content);
      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } finally {
      setExporting(false);
    }
  }

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  const formats: { id: ExportFormat; label: string; icon: React.ElementType }[] = [
    { id: 'markdown', label: 'Markdown (.md)', icon: FileText },
    { id: 'html', label: 'HTML (.html)', icon: BookOpen },
    { id: 'text', label: 'Plain Text (.txt)', icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">
          Export Manuscript
        </h2>

        <div className="flex items-center gap-3 mb-4">
          {formats.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                format === f.id
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'text-zinc-400 border-zinc-800 hover:bg-zinc-800/50'
              }`}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm text-zinc-400">
            {chapters.length} chapters, {totalWords.toLocaleString()} words
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || chapters.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : exported ? (
              <Check className="w-4 h-4" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {exporting ? 'Exporting...' : exported ? 'Exported!' : 'Export'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6 flex gap-4">
        <div className="w-64 shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800/50">
            <span className="text-xs text-zinc-500 font-medium">Contents</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {chapters.map((ch, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-400"
              >
                <span className="truncate">{ch.title}</span>
                <span className="text-xs text-zinc-600">
                  {ch.wordCount.toLocaleString()}w
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-zinc-800/50">
            <span className="text-xs text-zinc-500 font-medium">Preview</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-320px)]">
            <div className="max-w-2xl mx-auto font-serif text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {previewContent || (
                <span className="text-zinc-600">
                  No manuscript content to preview
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function markdownToBasicHtml(markdown: string, title: string): string {
  let html = markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #333; line-height: 1.8; }
    h1 { text-align: center; margin-bottom: 0.5rem; }
    h2 { margin-top: 2rem; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;
}
