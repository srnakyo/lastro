/** Small Markdown builders shared by every document. */
export const cell = (text: string | number | null | undefined) => String(text ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function table(head: string[], rows: (string | number | null | undefined)[][]): string {
  if (rows.length === 0) return "";
  return [`| ${head.map(cell).join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

export const quote = (text: string) => text.split("\n").map((l) => `> ${l}`).join("\n");

export const mermaid = (source: string) => `\`\`\`mermaid\n${source}\n\`\`\``;

export const join = (...blocks: (string | false | null | undefined)[]) => `${blocks.filter((b): b is string => !!b && b.trim().length > 0).join("\n\n")}\n`;

export const pct = (part: number, total: number) => (total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`);
