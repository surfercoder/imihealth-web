"use client";

export function MarkdownDisplay({ text }: { text: string }) {
  const lines = text.split("\n");
  const seen = new Map<string, number>();

  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {lines.map((raw) => {
        const trimmed = raw.trim();
        const base = trimmed || "blank";
        /* v8 ignore next */
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        /* v8 ignore next */
        const key = count === 0 ? base : `${base}-${count}`;

        if (!trimmed) {
          return <div key={key} className="h-2" />;
        }

        const isHeader =
          trimmed.startsWith("#") ||
          (trimmed.endsWith(":") && trimmed === trimmed.toUpperCase()) ||
          /^\*\*[^*]+\*\*:?\s*$/.test(trimmed);

        const clean = raw
          .replace(/^#+\s*/, "")
          .replace(/\*\*/g, "")
          .replace(/\*/g, "")
          .replace(/\\$/, "")
          .trim();

        if (isHeader) {
          return (
            <p key={key} className="font-semibold text-card-foreground mt-3 first:mt-0">
              {clean}
            </p>
          );
        }

        return (
          <p key={key} className="text-card-foreground">
            {clean}
          </p>
        );
      })}
    </div>
  );
}
