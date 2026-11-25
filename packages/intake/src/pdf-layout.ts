/** A piece of text on a page: x and y of its baseline (y grows upwards, like PDF), size is the font height. */
export interface PlacedText {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

interface Line {
  y: number;
  size: number;
  items: PlacedText[];
}

function groupLines(items: PlacedText[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  for (const item of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - item.y) <= Math.max(1, line.size * 0.4)) {
      line.items.push(item);
      line.size = Math.max(line.size, item.size);
    } else {
      lines.push({ y: item.y, size: item.size, items: [item] });
    }
  }
  return lines;
}

function lineText(line: Line): string {
  const items = [...line.items].sort((a, b) => a.x - b.x);
  let text = "";
  let end = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const gap = item.x - end > line.size * 0.15;
    if (text !== "" && gap && !/\s$/.test(text) && !/^\s/.test(item.str)) text += " ";
    text += item.str;
    end = item.x + item.width;
  }
  return text.replace(/[ \t]+/g, " ").trim();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * Groups the text of one page into blocks: a new block starts where the vertical gap between two
 * lines is clearly larger than the usual line spacing of the page (or than twice the font size).
 */
export function pageBlocks(items: PlacedText[]): string[] {
  const lines = groupLines(items.filter((item) => item.str !== "")).filter((line) => lineText(line) !== "");
  const gaps = lines.slice(1).map((line, index) => (lines[index]?.y ?? line.y) - line.y);
  const usual = median(gaps.filter((gap) => gap > 0));
  const blocks: string[][] = [];
  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    const gap = previous ? previous.y - line.y : 0;
    const size = Math.max(line.size, previous?.size ?? 0);
    const breaks = !previous || gap <= 0 || gap > Math.min(usual * 1.4, size * 2);
    if (breaks) blocks.push([]);
    blocks[blocks.length - 1]?.push(lineText(line));
  });
  return blocks.map((block) => block.join("\n"));
}
