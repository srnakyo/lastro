/** Extracted text of a source that does not live in the repository: one anchor comment before each passage. */
export function writeExtracted(passages: { anchor: string; heading?: string; text: string }[]): string {
  return passages.map((p) => `<!-- ${p.anchor}${p.heading ? ` | ${p.heading.replace(/-->/g, "")}` : ""} -->\n${p.text}`).join("\n\n") + "\n";
}

export function readExtracted(content: string): { anchor: string; heading?: string; text: string }[] {
  const parts = content.split(/<!-- (@[^|>]+?)(?: \| (.*?))? -->\n/);
  const passages: { anchor: string; heading?: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 3) {
    const anchor = parts[i]?.trim() ?? "";
    const heading = parts[i + 1];
    const text = (parts[i + 2] ?? "").trim();
    passages.push({ anchor, ...(heading ? { heading } : {}), text });
  }
  return passages;
}
