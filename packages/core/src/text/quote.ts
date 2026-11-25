import { normalizeForQuote } from "./normalize";

export interface AnchoredText {
  anchor: string;
  text: string;
}

export interface QuoteMatch {
  found: boolean;
  /** The passage that holds the quote; when the quote is not found, the closest passage, to show where it differs. */
  passageAnchor: string | null;
}

/** A citation anchor covers the passage with that exact anchor and every passage below it. */
export function passagesUnder<T extends AnchoredText>(passages: T[], anchor: string): T[] {
  return passages.filter((p) => p.anchor === anchor || p.anchor.startsWith(`${anchor}/`));
}

const words = (text: string) => normalizeForQuote(text).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Share of the quote's words found in the passage: 1 means every word is there. */
function overlap(quote: string[], passage: string): number {
  if (quote.length === 0) return 0;
  const have = new Set(words(passage));
  return quote.filter((w) => have.has(w)).length / quote.length;
}

/** The passage most like the quote, under the anchor or, when the anchor matches nothing, in the whole source. */
function closest(passages: AnchoredText[], scope: AnchoredText[], quote: string): string | null {
  const pool = scope.length ? scope : passages;
  const needle = words(quote);
  let best: { anchor: string; score: number } | null = null;
  for (const p of pool) {
    const score = overlap(needle, p.text);
    if (score > 0 && (!best || score > best.score)) best = { anchor: p.anchor, score };
  }
  return best?.anchor ?? null;
}

/**
 * Checks that the quote exists literally (ignoring emphasis and repeated whitespace) inside one passage under
 * the anchor. A quote spread over several paragraphs does not match.
 */
export function matchQuote(passages: AnchoredText[], anchor: string, quote: string): QuoteMatch {
  const needle = normalizeForQuote(quote);
  if (needle === "") return { found: false, passageAnchor: null };
  const scope = passagesUnder(passages, anchor);
  const hit = scope.find((p) => normalizeForQuote(p.text).includes(needle));
  if (hit) return { found: true, passageAnchor: hit.anchor };
  return { found: false, passageAnchor: closest(passages, scope, quote) };
}
