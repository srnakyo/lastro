import { markdownPassages } from "@lastro/core";
import { decodeText } from "./text";
import type { Extraction, IntakeFile } from "./types";

/** Markdown and plain text: one passage per paragraph, anchored as "@<file>#<slug>/p<n>". */
export function extractMarkdown(file: IntakeFile): Extraction {
  const passages = markdownPassages([{ name: file.name, content: decodeText(file.bytes) }]).map((p) => ({
    anchor: p.anchor,
    text: p.text,
    ...(p.heading ? { heading: p.heading } : {}),
  }));
  return { kind: "text", title: file.name, machineTranscript: false, passages, assets: [] };
}
