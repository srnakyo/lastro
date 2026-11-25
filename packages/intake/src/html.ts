/** A minimal HTML tree for the well-formed markup mammoth produces. */
export interface HtmlElement {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}
export type HtmlNode = HtmlElement | string;

const VOID = new Set(["img", "br", "hr", "col", "input", "meta", "link"]);
const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>/]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>|[^<]+|</g;
const ATTR = /([^\s=>/]+)(?:\s*=\s*"([^"]*)")?/g;

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" }[lower] ?? "";
  });
}

function parseAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(ATTR)) {
    if (match[1]) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? "");
  }
  return attrs;
}

/** Parses HTML into a tree under a "#root" element. Unclosed elements close at the end. */
export function parseHtml(html: string): HtmlElement {
  const root: HtmlElement = { tag: "#root", attrs: {}, children: [] };
  const stack: HtmlElement[] = [root];
  for (const match of html.matchAll(TOKEN)) {
    const parent = stack[stack.length - 1] ?? root;
    const [token, closing, rawTag, attrs, selfClosing] = match;
    if (token.startsWith("<!--")) continue;
    if (!rawTag) {
      parent.children.push(decodeEntities(token));
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (closing) {
      const at = stack.map((e) => e.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    const element: HtmlElement = { tag, attrs: parseAttrs(attrs ?? ""), children: [] };
    parent.children.push(element);
    if (!selfClosing && !VOID.has(tag)) stack.push(element);
  }
  return root;
}

export const isElement = (node: HtmlNode): node is HtmlElement => typeof node !== "string";
