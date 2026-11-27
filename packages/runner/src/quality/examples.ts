import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "../sarif";
import { finding, type QualityTarget } from "./target";

/**
 * A number the requester stated: on its own (not inside a code like REQ-7V6KE, zoom-125 or 05-intro.md),
 * with thousands written 10,000 or 10.000, decimals 1.5 or 1,5, and an optional short unit (200ms, 8%, 3x).
 */
const NUMBER = /(?<![\p{L}\d_.,]|[\p{L}\d]-)(\d{1,3}(?:([.,])\d{3})(?:\2\d{3})*(?![\d])|\d+(?:[.,]\d+)?)(?=[a-z]{0,3}(?![\p{L}\d])|%)(?!-[\p{L}\d])/gu;

/** The numbers an example states ("R$ 301 to Recife" → 301, "10,000 IDs" → 10000): what its test has to use. */
export function exampleNumbers(example: { given: string; expect: string }): string[] {
  const text = `${example.given} ${example.expect}`;
  return [...new Set([...text.matchAll(NUMBER)].map((m) => normalize(m[1] ?? "")))];
}

/** Thousands separators go, the decimal mark becomes a dot: 10,000 → 10000, 1,5 → 1.5. */
function normalize(n: string): string {
  if (/^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.test(n)) return n.replace(/[.,]/g, "");
  return n.replace(",", ".");
}

/** Whether a number appears in a test file on its own, however the code writes it (10_000, 10000, 1.5, 1,5). */
export function hasNumber(text: string, n: string): boolean {
  const code = text.replace(/(\d)_(?=\d)/g, "$1");
  const forms = new Set([n, n.replace(".", ",")]);
  return [...forms].some((f) => new RegExp(`(?<![\\d.,])${f.replace(/[.]/g, "\\.")}(?![\\d])`).test(code));
}

/** Every requester example with numbers must have them in one of the requirement's test files. */
export function examplesFindings(cwd: string, target: QualityTarget): Finding[] {
  const texts = (target.testFiles ?? []).map((f) => (existsSync(join(cwd, f)) ? readFileSync(join(cwd, f), "utf8") : ""));
  const out: Finding[] = [];
  for (const example of target.examples ?? []) {
    const missing = exampleNumbers(example).filter((n) => !texts.some((t) => hasNumber(t, n)));
    if (missing.length) out.push(finding("examples-in-tests", `the example "${example.given} → ${example.expect}" uses ${missing.join(", ")}, which no test of ${target.code} uses`));
  }
  return out;
}
