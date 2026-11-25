/** Hash of a criterion and the tests linked to it, stored when the requirement is approved. */
export async function criterionHash(text: string, tests: string[]): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify({ text, tests: [...tests].sort() }));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `sha256:${Buffer.from(digest).toString("hex")}`;
}
