import { splitMarkdown } from "./markdown";

export interface PassageDraft {
  anchor: string;
  heading: string | null;
  label: string | null;
  text: string;
}

/**
 * Turns Markdown files into anchored passages, one per paragraph, numbered from 1 within each section.
 * Anchors look like "@05-lifecycle.md#requirement-states/p2"; a citation may point to the section
 * ("@05-lifecycle.md#requirement-states") and is matched against all its paragraphs.
 */
export function markdownPassages(files: { name: string; content: string }[]): PassageDraft[] {
  return files.flatMap((file) =>
    splitMarkdown(file.content).flatMap((section) =>
      section.paragraphs.map((text, index) => ({
        anchor: `@${file.name}#${section.slug}/p${index + 1}`,
        heading: section.heading || null,
        label: null,
        text,
      })),
    ),
  );
}
