const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Wraps the quote inside a passage's Markdown in <mark>, tolerating what the quote check ignores: emphasis
 * and code marks and any whitespace between words. Returns the text unchanged when the quote is not there.
 */
export function markQuote(markdown: string, quote: string): string {
  const words = quote.replace(/\*\*|__|`|\*/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return markdown;
  const gap = "[\\s*_`]+";
  const pattern = new RegExp(`[*_\`]*${words.map(escapeRegex).join(gap)}[*_\`]*`, "u");
  const match = pattern.exec(markdown);
  if (!match) return markdown;
  return `${markdown.slice(0, match.index)}<mark>${match[0]}</mark>${markdown.slice(match.index + match[0].length)}`;
}
