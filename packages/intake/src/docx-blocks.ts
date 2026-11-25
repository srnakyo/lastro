import { isElement, type HtmlElement, type HtmlNode } from "./html";
import type { CollectedImage } from "./docx-images";
import { extensionForContentType } from "./text";
import { assetRef, type ExtractedAsset, type ExtractedPassage } from "./types";

const HEADING = /^h[1-6]$/;
const LIST = new Set(["ul", "ol"]);
const ASSET_REF = /\{\{asset:[^}]+\}\}/g;
const BLOCK_INSIDE = new Set(["p", ...LIST, "table"]);

/**
 * Walks the HTML of a document block by block. Paragraphs, list items and tables become passages
 * "@p<n>"; their images become assets "@p<n>/img<k>" in the order they appear.
 */
export class DocxBlocks {
  readonly passages: ExtractedPassage[] = [];
  readonly assets: ExtractedAsset[] = [];
  private heading: string | null = null;
  private pending: ExtractedAsset[] = [];
  /** Images found in a heading: they open the next passage, the heading keeps only text. */
  private carried: string[] = [];

  constructor(private readonly images: Map<string, CollectedImage>) {}

  walk(root: HtmlElement): this {
    for (const node of root.children) {
      if (!isElement(node)) this.emit(node, null);
      else if (HEADING.test(node.tag)) this.setHeading(node);
      else if (LIST.has(node.tag)) this.list(node, []);
      else if (node.tag === "table") this.table(node);
      else this.emit(this.render(node.children), null);
    }
    return this;
  }

  private get nextNumber(): number {
    return this.passages.length + 1;
  }

  private setHeading(node: HtmlElement): void {
    const text = this.render(node.children);
    this.carried.push(...(text.match(ASSET_REF) ?? []));
    this.heading = text.replace(ASSET_REF, "").trim() || this.heading;
  }

  /** Adds one passage when the block has text or images; empty blocks take no number. */
  private emit(text: string, label: string | null): void {
    const body = [...this.carried, text.trim()].filter((part) => part !== "").join("\n");
    if (body === "") return;
    this.carried = [];
    this.passages.push({
      anchor: `@p${this.nextNumber}`,
      text: body,
      ...(label ? { label } : {}),
      ...(this.heading ? { heading: this.heading } : {}),
    });
    this.assets.push(...this.pending);
    this.pending = [];
  }

  /** Ordered items keep their number ("item 3", nested "item 3.2"); bullets have no label. */
  private list(list: HtmlElement, numbers: number[]): void {
    const ordered = list.tag === "ol";
    let index = 0;
    for (const item of list.children.filter(isElement).filter((child) => child.tag === "li")) {
      index++;
      const path = ordered ? [...numbers, index] : numbers;
      const own = item.children.filter((child) => !isElement(child) || !LIST.has(child.tag));
      this.emit(this.render(own), ordered ? `item ${path.join(".")}` : null);
      for (const nested of item.children.filter(isElement).filter((child) => LIST.has(child.tag))) this.list(nested, path);
    }
  }

  private table(table: HtmlElement): void {
    const rows = descendants(table, "tr").map((row) =>
      row.children
        .filter(isElement)
        .filter((cell) => cell.tag === "td" || cell.tag === "th")
        .map((cell) => this.render(cell.children).trim().replace(/\n+/g, " "))
        .join(" | "),
    );
    this.emit(rows.filter((row) => row.replace(/[\s|]/g, "") !== "").join("\n"), null);
  }

  private render(nodes: HtmlNode[]): string {
    return nodes.map((node) => this.renderNode(node)).join("");
  }

  private renderNode(node: HtmlNode): string {
    if (!isElement(node)) return node;
    if (node.tag === "br") return "\n";
    if (node.tag === "img") return this.image(node);
    const inner = this.render(node.children);
    if ((node.tag === "strong" || node.tag === "b") && inner.trim() !== "") return `**${inner}**`;
    if (BLOCK_INSIDE.has(node.tag) || node.tag === "li") return `${inner}\n`;
    return inner;
  }

  private image(node: HtmlElement): string {
    const image = this.images.get(node.attrs.src ?? "");
    if (!image) return "";
    const n = this.nextNumber;
    const k = this.pending.length + 1;
    const name = `p${n}-img${k}.${extensionForContentType(image.contentType)}`;
    this.pending.push({ name, anchor: `@p${n}/img${k}`, contentType: image.contentType, bytes: image.bytes });
    return assetRef(name);
  }
}

function descendants(element: HtmlElement, tag: string): HtmlElement[] {
  return element.children.filter(isElement).flatMap((child) => (child.tag === tag ? [child] : descendants(child, tag)));
}
