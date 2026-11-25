import { XMLParser } from "fast-xml-parser";

export interface TestCaseResult {
  ref: string;
  file: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  durationMs: number;
  message: string | null;
}

export interface JunitOptions {
  /** The repository root: absolute file paths under it become relative (PHPUnit, pytest). */
  root?: string;
  /** Prepended to relative file paths (Playwright reports them relative to its testDir). */
  prefix?: string;
}

type Node = Record<string, unknown>;
const list = (v: unknown): Node[] => (Array.isArray(v) ? (v as Node[]) : v ? [v as Node] : []);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const looksLikePath = (v: string | null) => !!v && (/[\\/]/.test(v) || /\.[a-z]{1,5}$/i.test(v)) && !v.includes(" ");

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

/** pytest's classname "tests.test_cart.TestCart" → "tests/test_cart.py": module path, without the class. */
function pythonModule(classname: string | null): string | null {
  if (!classname || !/^[\w.]+$/.test(classname) || !classname.includes(".")) return null;
  const parts = classname.split(".");
  while (parts.length > 1 && /^[A-Z]/.test(parts.at(-1) ?? "")) parts.pop();
  return `${parts.join("/")}.py`;
}

/**
 * The file of a test case, whichever tool wrote the report: the case's file attribute (bun, PHPUnit,
 * pytest xunit1), the suite's file or filepath (bun, jest-junit with addFileAttribute), a path-like
 * classname or suite name (Vitest, Playwright), or pytest's dotted module name.
 */
function caseFile(c: Node, suite: Node): string {
  const direct = str(c["@_file"]) ?? str(suite["@_file"]) ?? str(suite["@_filepath"]);
  if (direct) return direct;
  const classname = str(c["@_classname"]);
  if (looksLikePath(classname)) return classname ?? "";
  const name = str(suite["@_name"]);
  if (looksLikePath(name)) return name ?? "";
  return pythonModule(classname) ?? name ?? classname ?? "";
}

function relative(file: string, options: JunitOptions): string {
  const clean = file.replace(/\\/g, "/");
  const root = options.root?.replace(/\\/g, "/").replace(/\/?$/, "/");
  if (root && clean.startsWith(root)) return clean.slice(root.length);
  if (options.prefix && !clean.startsWith("/") && !clean.startsWith(options.prefix)) return `${options.prefix}${clean}`;
  return clean;
}

/** Reads a JUnit XML report (bun, Vitest, Jest, Playwright, pytest, PHPUnit, gotestsum) into "file::name" test results. */
export function parseJunit(xml: string, options: JunitOptions = {}): TestCaseResult[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", allowBooleanAttributes: true });
  const doc = parser.parse(xml) as Node;
  const root = (doc.testsuites ?? doc) as Node;
  const all = [...suites(root), ...(root.testcase ? [root] : [])];
  return all.flatMap((suite) =>
    list(suite.testcase).map((c) => {
      const file = relative(caseFile(c, suite), options);
      const name = String(c["@_name"] ?? "");
      return { ref: `${file}::${name}`, file, name, durationMs: Math.round(Number(c["@_time"] ?? 0) * 1000), ...caseStatus(c) };
    }),
  );
}
