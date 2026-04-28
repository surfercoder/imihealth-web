function trimAtSectionBreak(raw: string): string {
  const cleaned = raw.replace(/\*+/g, "").trim();
  const sectionBreak = cleaned.search(/[)\s.][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+:/);
  if (sectionBreak > 0) {
    return cleaned.slice(0, sectionBreak + 1).trim();
  }
  return cleaned;
}

export function extractDiagnosticoPresuntivo(text: string | null): string | null {
  if (!text) return null;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim().replace(/\*+/g, "").trim();
    const inlineMatch = trimmed.match(/diagn[oó]stico\s+presuntivo\s*:\s*(.+)/i);
    if (inlineMatch && inlineMatch[1].trim()) {
      const content = inlineMatch[1].trim();
      // CIE-10 wrapped in parens is an annotation on the diagnosis — keep the whole line.
      if (/\([^)]*CIE-10[^)]*\)/i.test(content)) {
        return content;
      }
      // CIE-10 appearing standalone (after a period/space) takes precedence.
      const cieInContent = content.match(/CIE-10[^\n]*/i);
      if (cieInContent) {
        return trimAtSectionBreak(cieInContent[0]);
      }
      return content;
    }
  }

  const cieMatch = text.match(/CIE-10[^\n]*/i);
  if (cieMatch) {
    return trimAtSectionBreak(cieMatch[0]);
  }

  for (const line of lines) {
    const trimmed = line.trim().replace(/\*+/g, "").trim();
    if (/diagn[oó]stico\s+presuntivo/i.test(trimmed)) {
      const idx = lines.indexOf(line);
      const result: string[] = [];
      for (let i = idx + 1; i < lines.length; i++) {
        const next = lines[i].trim().replace(/\*+/g, "").trim();
        if (!next && result.length === 0) continue;
        if (!next || next.endsWith(":") || next.startsWith("**")) break;
        result.push(next.replace(/^-\s*/, ""));
      }
      if (result.length > 0) return result.join(". ");
    }
  }
  return null;
}
