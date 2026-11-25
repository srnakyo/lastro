import { XMLParser } from "fast-xml-parser";

export interface TestCaseResult {
  ref: string;
  file: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  durationMs: number;
  message: string | null;
}

type Node = Record<string, unknown>;
const list = (v: unknown): Node[] => (Array.isArray(v) ? (v as Node[]) : v ? [v as Node] : []);

function caseStatus(c: Node): Pick<TestCaseResult, "status" | "message"> {
  const failure = list(c.failure)[0];
  const error = list(c.error)[0];
  if (failure) return { status: "failed", message: String(failure["@_message"] ?? failure["#text"] ?? "").slice(0, 2000) };
  if (error) return { status: "error", message: String(error["@_message"] ?? error["#text"] ?? "").slice(0, 2000) };
  if (c.skipped !== undefined) return { status: "skipped", message: null };
  return { status: "passed", message: null };
}

function suites(node: Node): Node[] {
  return list(node.testsuite).flatMap((s) => [s, ...suites(s)]);
}

/**
 * Reads a JUnit XML report (Vitest, Jest, Playwright, pytest, PHPUnit, bun, gotestsum) into test results.
 * A test is identified as "file::name", where file is the case's file attribute or its suite's.
 */
export function parseJunit(xml: string): TestCaseResult[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", allowBooleanAttributes: true });
  const doc = parser.parse(xml) as Node;
  const root = (doc.testsuites ?? doc) as Node;
  return suites(root).flatMap((suite) =>
    list(suite.testcase).map((c) => {
      const file = String(c["@_file"] ?? suite["@_file"] ?? suite["@_name"] ?? c["@_classname"] ?? "");
      const name = String(c["@_name"] ?? "");
      return { ref: `${file}::${name}`, file, name, durationMs: Math.round(Number(c["@_time"] ?? 0) * 1000), ...caseStatus(c) };
    }),
  );
}
