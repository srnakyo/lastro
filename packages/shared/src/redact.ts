/** Removes passwords and tokens from a message before it is printed, logged or shown (REQ-G2J5R). */
export function redactSecrets(text: string): string {
  return text
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^/\s:@"']+:)[^@\s"']+@/gi, "$1***@")
    .replace(/\blst_([a-z0-9]{8})_[a-z0-9]{16,}\b/gi, "lst_$1_***")
    .replace(/(password|passwd|pwd|secret|token)(["']?\s*[=:]\s*["']?)[^\s"',;&]+/gi, "$1$2***");
}
