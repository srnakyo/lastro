import type { ExtractedPassage } from "./types";

const DATE = String.raw`(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})`;
const TIME = String.raw`(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp]\.?\s?[Mm]\.?)?)`;
/** "[24/09/2026, 11:10:05] Name: text" (iPhone) and "24/09/2026 11:10 - Name: text" (Android). */
const HEADERS = [
  new RegExp(String.raw`^\[${DATE},?\s${TIME}\]\s(?:([^:]+?):(?:\s|$))?([\s\S]*)$`),
  new RegExp(String.raw`^${DATE},?\s${TIME}\s[-–]\s(?:([^:]+?):(?:\s|$))?([\s\S]*)$`),
];

interface Header {
  date: string;
  time: string;
  author: string | null;
  text: string;
}

/** Exports mark lines with invisible direction marks; they are not part of the text. */
const clean = (line: string) => line.replace(/[\u200e\u200f\u202a-\u202e]/g, "").replace(/\r$/, "");

function parseHeader(line: string): Header | null {
  for (const pattern of HEADERS) {
    const match = pattern.exec(line);
    if (match?.[1] && match[2]) return { date: match[1], time: match[2].replace(/\s+/g, " "), author: match[3]?.trim() ?? null, text: match[4] ?? "" };
  }
  return null;
}

/** A text file is a WhatsApp export when its first non-empty line is a message header. */
export function isWhatsAppExport(content: string): boolean {
  const first = content.split("\n").map(clean).find((line) => line.trim() !== "");
  return first !== undefined && parseHeader(first) !== null;
}

function toPassage(header: Header, lines: string[], index: number): ExtractedPassage {
  const when = `${header.date} ${header.time}`;
  return { anchor: `@msg:${index}`, label: header.author ? `${header.author} ${when}` : when, text: lines.join("\n").trim() };
}

/** One passage per message, every author kept; lines without a header continue the message above. */
export function whatsAppPassages(content: string): ExtractedPassage[] {
  const passages: ExtractedPassage[] = [];
  let current: { header: Header; lines: string[] } | null = null;
  for (const line of content.split("\n").map(clean)) {
    const header = parseHeader(line);
    if (header) {
      if (current) passages.push(toPassage(current.header, current.lines, passages.length + 1));
      current = { header, lines: [header.text] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) passages.push(toPassage(current.header, current.lines, passages.length + 1));
  return passages;
}
