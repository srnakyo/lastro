import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The linked tests whose file does not exist or does not have a test with that exact name. */
export function missingTests(root: string, links: Record<string, Record<string, string[]>>): string[] {
  const refs = [...new Set(Object.values(links).flatMap((criteria) => Object.values(criteria).flat()))];
  return refs.filter((ref) => {
    // Only the first "::" splits: a test name can have its own (file::test name).
    const at = ref.indexOf("::");
    const [file, name] = [ref.slice(0, at), ref.slice(at + 2)];
    const path = join(root, file);
    return !existsSync(path) || !readFileSync(path, "utf8").includes(`"${name}"`);
  });
}
