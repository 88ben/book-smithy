/**
 * Lightweight YAML frontmatter parser/serializer.
 * Avoids pulling in gray-matter's full dep tree in the renderer.
 */

export interface ParsedFile {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(raw: string): ParsedFile {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: raw };
  }

  const yamlBlock = match[1];
  const content = match[2];

  const data: Record<string, unknown> = {};
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    if (typeof value === 'string') {
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''));
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }
    }

    data[key] = value;
  }

  return { data, content };
}

export function serializeFrontmatter(
  data: Record<string, unknown>,
  content: string,
): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => String(v)).join(', ')}]`);
    } else if (typeof value === 'string' && value.includes(':')) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  lines.push('');

  const body = content.startsWith('\n') ? content : content;
  return lines.join('\n') + body;
}
