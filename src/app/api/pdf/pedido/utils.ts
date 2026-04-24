export function extractDiagnosticoPresuntivo(text: string | null): string | null {
  if (!text) return null;
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim().replace(/\*+/g, "").trim();
    if (/diagn[oó]stico\s+presuntivo/i.test(trimmed)) {
      const match = trimmed.match(/diagn[oó]stico\s+presuntivo\s*:\s*(.+)/i);
      if (match && match[1].trim()) return match[1].trim();
      // Diagnosis might be on the next line(s)
      const idx = lines.indexOf(line);
      const result: string[] = [];
      for (let i = idx + 1; i < lines.length; i++) {
        const next = lines[i].trim().replace(/\*+/g, "").trim();
        // Skip leading blank lines between header and content
        if (!next && result.length === 0) continue;
        if (!next || next.endsWith(":") || next.startsWith("**")) break;
        result.push(next.replace(/^-\s*/, ""));
      }
      if (result.length > 0) return result.join(". ");
    }
  }
  return null;
}
