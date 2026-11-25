/** Text areas edit lists one per line, and maps as "key = value" lines. */
export const toLines = (items: string[]) => items.join("\n");
export const fromLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

export const toPairs = (map: Record<string, string>, sep = " = ") => Object.entries(map).map(([k, v]) => `${k}${sep}${v}`).join("\n");
export function fromPairs(text: string, sep = "="): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fromLines(text)) {
    const at = line.indexOf(sep);
    if (at > 0) out[line.slice(0, at).trim()] = line.slice(at + sep.length).trim();
  }
  return out;
}
