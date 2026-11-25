/** Text used to compare quotes: no Markdown emphasis or code marks, single spaces. */
export function normalizeForQuote(text: string): string {
  return text.replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
}
