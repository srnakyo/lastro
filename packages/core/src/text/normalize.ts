/**
 * Text used to compare quotes: no Markdown emphasis (`**`, `__`, `*`, `_` around words) or code marks,
 * single spaces. An underscore inside a word (data_source) is kept.
 */
export function normalizeForQuote(text: string): string {
  return text
    .replace(/\*\*|__|`|\*/g, "")
    .replace(/(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
