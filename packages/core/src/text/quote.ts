import { normalizeForQuote } from "./normalize";

export interface AnchoredText {
  anchor: string;
  text: string;
}

export interface QuoteMatch {
  found: boolean;
  /** Anchor of the passage that holds the quote, or null. */
  passageAnchor: string | null;
}

/** A citation anchor covers the passage with that exact anchor and every passage below it. */
export function passagesUnder<T extends AnchoredText>(passages: T[], anchor: string): T[] {
  return passages.filter((p) => p.anchor === anchor || p.anchor.startsWith(`${anchor}/`));
}

/** Checks that the quote exists literally (ignoring emphasis and line breaks) under the anchor. */
export function matchQuote(passages: AnchoredText[], anchor: string, quote: string): QuoteMatch {
  const needle = normalizeForQuote(quote);
  if (needle === "") return { found: false, passageAnchor: null };
  const scope = passagesUnder(passages, anchor);
  const hit = scope.find((p) => normalizeForQuote(p.text).includes(needle));
  if (hit) return { found: true, passageAnchor: hit.anchor };
  const joined = normalizeForQuote(scope.map((p) => p.text).join(" "));
  return { found: joined.includes(needle), passageAnchor: joined.includes(needle) ? (scope[0]?.anchor ?? null) : null };
}
