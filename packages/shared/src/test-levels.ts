import type { ProjectConfig } from "./config";

/** A path glob (`**`, `*`, `?`) as a regular expression over a forward-slash path. */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] as string;
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      out += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** The file of a test reference ("tests/cart.test.ts::keeps items" → "tests/cart.test.ts"). */
export const testFile = (ref: string) => (ref.split("::")[0] ?? ref).replace(/\\/g, "/").replace(/^\.\//, "");

/**
 * The level of a test by the path of its file, or null. Patterns anchored at a folder (`tests/integration/**`)
 * win over generic ones (`**\/*.test.*`), so the result does not depend on the order the levels are stored in.
 */
export function testLevel(ref: string, levels: Record<string, string[]>): string | null {
  const file = testFile(ref);
  const entries = Object.entries(levels);
  for (const anchored of [true, false]) {
    for (const [level, patterns] of entries) {
      if (patterns.some((p) => p.startsWith("**") !== anchored && globToRegExp(p).test(file))) return level;
    }
  }
  return null;
}

/** The levels a set of tests covers. */
export function levelsCovered(refs: string[], levels: Record<string, string[]>): Set<string> {
  return new Set(refs.map((r) => testLevel(r, levels)).filter((l): l is string => l !== null));
}

/** The name of the stage Lastro adds when a type's tests have rules the runner checks (examples, coverage). */
export const TEST_QUALITY_STAGE = "test-quality";

/** Whether requirements of this type get the test-quality stage. */
export function needsTestQuality(config: ProjectConfig, type: string): boolean {
  const coverage = config.types[type]?.tests.coverage;
  return config.tests.examples_in_tests || coverage?.functions !== undefined || coverage?.lines !== undefined;
}
