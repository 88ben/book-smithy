import React from 'react';
import { useProjectStore } from '@renderer/stores/projectStore';

interface StatusBarProps {
  wordCount?: number;
  chapterCount?: number;
}

export function StatusBar({ wordCount = 0, chapterCount = 0 }: StatusBarProps) {
  const { projectInfo, currentSection } = useProjectStore();
  const goal = projectInfo?.wordCountGoal || 80000;
  const progress = Math.min(100, Math.round((wordCount / goal) * 100));

  return (
    <footer className="flex items-center justify-between h-7 px-4 bg-zinc-900/60 border-t border-zinc-800/50 text-xs text-zinc-500">
      <div className="flex items-center gap-4">
        <span className="capitalize">{currentSection}</span>
        {chapterCount > 0 && (
          <span>
            {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>
          {wordCount.toLocaleString()} / {goal.toLocaleString()} words
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/70 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{progress}%</span>
        </div>
      </div>
    </footer>
  );
}
