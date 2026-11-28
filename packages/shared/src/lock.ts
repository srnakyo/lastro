/** Hash of a criterion and the tests linked to it: stored when the requirement is approved, and in the export. */
export async function criterionHash(text: string, tests: string[]): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify({ text, tests: [...tests].sort() }));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Whether sealed lines are all still there, in the same order: what was sealed only grew. */
export function onlyGrew(sealed: string[], now: string[]): boolean {
  let i = 0;
  for (const line of now) if (i < sealed.length && line === sealed[i]) i += 1;
  return i === sealed.length;
}
