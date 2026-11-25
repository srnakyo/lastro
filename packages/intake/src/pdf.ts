import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pageBlocks, type PlacedText } from "./pdf-layout";
import type { ExtractedPassage, Extraction, IntakeFile } from "./types";

type PdfDocument = Awaited<ReturnType<typeof getDocument>["promise"]>;

async function pageItems(document: PdfDocument, pageNumber: number): Promise<PlacedText[]> {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();
  const items: PlacedText[] = [];
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const [, , , d = 0, x = 0, y = 0] = item.transform as number[];
    items.push({ str: item.str, x, y, width: item.width, size: item.height || Math.abs(d) });
  }
  page.cleanup();
  return items;
}

/** PDF text, page by page, in blocks separated by vertical gaps: anchors "@pg<page>/b<block>". */
export async function extractPdf(file: IntakeFile): Promise<Extraction> {
  // pdf.js takes ownership of the buffer it reads, so it gets a copy.
  const task = getDocument({ data: new Uint8Array(file.bytes), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const document = await task.promise;
  try {
    const passages: ExtractedPassage[] = [];
    for (let page = 1; page <= document.numPages; page++) {
      pageBlocks(await pageItems(document, page)).forEach((text, index) => passages.push({ anchor: `@pg${page}/b${index + 1}`, text }));
    }
    return { kind: "pdf", title: file.name, machineTranscript: false, passages, assets: [] };
  } finally {
    await task.destroy();
  }
}
