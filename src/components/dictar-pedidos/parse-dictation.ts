export interface ParsedDictation {
  items: string[];
  diagnostico: string | null;
}

const MARKER_RE = /(?<![\p{L}])(solicit[oó]|diagn[oó]stic[oó])(?![\p{L}])/giu;

function cleanFragment(text: string): string {
  return text
    .replace(/^[\s:,.;¡!¿?-]+/u, "")
    .replace(/[\s:,.;¡!¿?-]+$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isDiagnosticoMarker(marker: string): boolean {
  return /diagn/iu.test(marker);
}

export function parseDictation(text: string): ParsedDictation {
  if (!text) return { items: [], diagnostico: null };

  const matches = Array.from(text.matchAll(MARKER_RE));
  if (matches.length === 0) return { items: [], diagnostico: null };

  const items: string[] = [];
  let diagnostico: string | null = null;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;

    if (isDiagnosticoMarker(match[0])) {
      const tail = cleanFragment(text.slice(start));
      diagnostico = tail || null;
      break;
    }

    const nextIndex = matches[i + 1]?.index ?? text.length;
    const fragment = cleanFragment(text.slice(start, nextIndex));
    if (fragment) items.push(fragment);
  }

  return { items, diagnostico };
}
