export function countWords(text: string): number {
  const cleaned = text
    .replace(/^---[\s\S]*?---\n*/, '')
    .replace(/<[^>]*>/g, ' ')
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function formatWordCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}
