function cleanLine(s: string): string {
  return s.replace(/\*+/g, "").replace(/\\+\s*$/, "").trim();
}

function trimAtInlineSectionBreak(raw: string): string {
  const sectionBreak = raw.search(/[)\s.][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+:/);
  if (sectionBreak > 0) {
    return raw.slice(0, sectionBreak + 1).trim();
  }
  return raw.trim();
}

const SECTION_HEADER_REGEX = /^[A-ZÁÉÍÓÚÑ][^:]*:\s*$/;
const HEADER_REGEX = /^diagn[oó]stico\s+presuntivo\s*:?\s*(.*)$/i;

export function extractDiagnosticoPresuntivo(text: string | null): string | null {
  if (!text) return null;
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = cleanLine(lines[i]);
    const headerMatch = trimmed.match(HEADER_REGEX);
    if (!headerMatch) continue;

    const inline = trimAtInlineSectionBreak(headerMatch[1]);
    if (inline) return inline;

    const collected: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = cleanLine(lines[j]);
      if (!next) {
        if (collected.length === 0) continue;
        break;
      }
      if (SECTION_HEADER_REGEX.test(next)) break;
      const stripped = next.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "");
      collected.push(trimAtInlineSectionBreak(stripped));
    }

    if (collected.length > 0) return collected.join(". ");
  }

  return null;
}
