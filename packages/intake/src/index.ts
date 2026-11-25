import { extractTelegram, extractWhatsApp } from "./chat";
import { detectFormat } from "./detect";
import { extractDocx } from "./docx";
import { sourceHash } from "./hash";
import { extractImage } from "./image";
import { extractMarkdown } from "./markdown";
import { extractMedia } from "./media";
import { extractPdf } from "./pdf";
import type { ExtractedSource, Extraction, IntakeFile, IntakeOptions } from "./types";

export type { ExtractedAsset, ExtractedKind, ExtractedPassage, ExtractedSource, IntakeFile, IntakeOptions } from "./types";
export { detectFormat, type Detected, type Format } from "./detect";
export { splitCommand } from "./command";
export { formatTimestamp } from "./timestamps";
export { pageBlocks, type PlacedText } from "./pdf-layout";

async function extractByFormat(file: IntakeFile, options: IntakeOptions): Promise<Extraction> {
  const detected = detectFormat(file);
  switch (detected.format) {
    case "markdown":
      return extractMarkdown(file);
    case "whatsapp":
      return extractWhatsApp(file);
    case "telegram":
      return extractTelegram(file);
    case "docx":
      return extractDocx(file);
    case "pdf":
      return extractPdf(file);
    case "audio":
    case "video":
      return extractMedia(file, detected.format, options);
    case "image":
      return extractImage(file, detected.contentType);
  }
}

/** Extracts anchored passages from material a requester sent. Lastro never calls an LLM. */
export async function extract(file: IntakeFile, options: IntakeOptions = {}): Promise<ExtractedSource> {
  const extraction = await extractByFormat(file, options);
  return { ...extraction, hash: sourceHash(file.bytes) };
}
