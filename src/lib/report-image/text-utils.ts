export function stripEmoji(str: string): string {
  return str.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    ""
  );
}

export function escapeXml(str: string): string {
  return stripEmoji(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface WrappedLine {
  text: string;
  isHeader: boolean;
}

export function wrapLines(text: string, maxChars: number): WrappedLine[] {
  const rawLines = text.split("\n");
  const result: WrappedLine[] = [];

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      result.push({ text: "", isHeader: false });
      continue;
    }

    const clean = trimmed
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "");

    const isHeader =
      (clean === clean.toUpperCase() && clean.length > 3) ||
      trimmed.startsWith("#") ||
      /^\*\*[^*]+\*\*:?\s*$/.test(trimmed);

    if (clean.length <= maxChars) {
      result.push({ text: clean, isHeader });
    } else {
      const words = clean.split(" ");
      let current = "";
      let first = true;
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length > maxChars && current) {
          result.push({ text: current, isHeader: first ? isHeader : false });
          current = word;
          first = false;
        } else {
          current = test;
        }
      }
      if (current) result.push({ text: current, isHeader: false });
    }
  }
  return result;
}

export interface DoctorImageInfo {
  name?: string | null;
  matricula?: string | null;
  especialidad?: string | null;
  tagline?: string | null;
  firmaDigital?: string | null;
}
