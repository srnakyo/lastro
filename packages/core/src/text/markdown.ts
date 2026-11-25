import { slugify } from "./slug";

export interface MarkdownSection {
  slug: string;
  heading: string;
  level: number;
  paragraphs: string[];
}

function paragraphsOf(body: string): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    if (!inFence && line.trim() === "") {
      if (current.length > 0) out.push(current.join("\n"));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) out.push(current.join("\n"));
  return out.map((p) => p.trim()).filter((p) => p !== "");
}

/** Splits Markdown into sections by heading, ignoring headings inside code fences. */
export function splitMarkdown(markdown: string): MarkdownSection[] {
  const sections: { slug: string; heading: string; level: number; body: string }[] = [];
  let current = { slug: "", heading: "", level: 0, body: "" };
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    const match = inFence ? null : /^(#{1,6})\s+(.*)$/.exec(line);
    if (match?.[1] && match[2] !== undefined) {
      sections.push(current);
      current = { slug: slugify(match[2]), heading: match[2], level: match[1].length, body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  sections.push(current);
  // Repeated headings get "-1", "-2"... like GitHub, so every anchor stays unique.
  const seen = new Map<string, number>();
  for (const s of sections) {
    const count = seen.get(s.slug) ?? 0;
    seen.set(s.slug, count + 1);
    if (count > 0) s.slug = `${s.slug}-${count}`;
  }
  return sections
    .map((s) => ({ slug: s.slug, heading: s.heading, level: s.level, paragraphs: paragraphsOf(s.body) }))
    .filter((s) => s.heading !== "" || s.paragraphs.length > 0);
}
