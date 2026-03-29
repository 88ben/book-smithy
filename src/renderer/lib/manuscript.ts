import type { ChapterEntry } from '@renderer/stores/projectStore';

export function sortedChapters(chapters: ChapterEntry[]): ChapterEntry[] {
  return chapters.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function normalizeOrders(chapters: ChapterEntry[]): ChapterEntry[] {
  return sortedChapters(chapters).map((ch, i) => ({ ...ch, order: i + 1 }));
}

export function chapterDisplayTitle(ch: ChapterEntry, position: number): string {
  return ch.title.trim() || `Chapter ${position}`;
}
