import mammoth from "mammoth";
import { DocxBlocks } from "./docx-blocks";
import { ImageCollector } from "./docx-images";
import { parseHtml } from "./html";
import type { Extraction, IntakeFile } from "./types";

/** Word documents through mammoth's HTML: one passage per paragraph, list item and table, images in place. */
export async function extractDocx(file: IntakeFile): Promise<Extraction> {
  const images = new ImageCollector();
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(file.bytes) }, { convertImage: images.converter() });
  const blocks = new DocxBlocks(await images.resolve()).walk(parseHtml(result.value));
  return { kind: "docx", title: file.name, machineTranscript: false, passages: blocks.passages, assets: blocks.assets };
}
