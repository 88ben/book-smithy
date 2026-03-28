import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { useProjectStore } from '@renderer/stores/projectStore';
import { Dashboard } from '@renderer/pages/Dashboard';
import { Ideation } from '@renderer/pages/Ideation';
import { WorldBuilding } from '@renderer/pages/WorldBuilding';
import { Characters } from '@renderer/pages/Characters';
import { Outline } from '@renderer/pages/Outline';
import { Manuscript } from '@renderer/pages/Manuscript';
import { Revision } from '@renderer/pages/Revision';
import { ExportPage } from '@renderer/pages/Export';
import { countWords } from '@renderer/lib/wordcount';

function SectionContent() {
  const { currentSection } = useProjectStore();

  switch (currentSection) {
    case 'dashboard':
      return <Dashboard />;
    case 'ideation':
      return <Ideation />;
    case 'worldbuilding':
      return <WorldBuilding />;
    case 'characters':
      return <Characters />;
    case 'outline':
      return <Outline />;
    case 'manuscript':
      return <Manuscript />;
    case 'revision':
      return <Revision />;
    case 'export':
      return <ExportPage />;
    default:
      return <Dashboard />;
  }
}

export function AppShell() {
  const { focusMode, projectPath } = useProjectStore();
  const [totalWordCount, setTotalWordCount] = useState(0);
  const [chapterCount, setChapterCount] = useState(0);

  useEffect(() => {
    if (!projectPath) return;
    loadStats();
  }, [projectPath]);

  async function loadStats() {
    if (!projectPath) return;
    try {
      const index = await window.bookSmithy.fs.readJsonFile(
        `${projectPath}/Manuscript/_index.json`,
      );
      const chapters = index?.chapters || [];
      setChapterCount(chapters.length);

      let total = 0;
      for (const ch of chapters) {
        try {
          const content = await window.bookSmithy.fs.readFile(
            `${projectPath}/Manuscript/chapters/${ch.filename}`,
          );
          if (content) total += countWords(content);
        } catch {
          // skip
        }
      }
      setTotalWordCount(total);
    } catch {
      // no manuscript yet
    }
  }

  if (focusMode) {
    return (
      <div className="h-screen w-screen flex flex-col">
        <SectionContent />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <SectionContent />
        </main>
      </div>
      <StatusBar wordCount={totalWordCount} chapterCount={chapterCount} />
    </div>
  );
}
