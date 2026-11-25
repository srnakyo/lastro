import type { RunReportInput } from "@lastro/shared";

type Status = "passed" | "failed";
type StageReport = RunReportInput["stages"][number];

/** The tests each stage reports, by requirement. Refs follow the JUnit "file::name" convention. */
const UNIT: Record<string, string[]> = {
  "REQ-CRT01": ["tests/cart.test.ts::keeps items for 7 days", "tests/cart.test.ts::drops items after 7 days"],
  "REQ-SHP01": ["tests/shipping.test.ts::free above 300 in the south", "tests/shipping.test.ts::charges outside south and southeast", "tests/utils.test.ts::formats money"],
  "REQ-CPN01": ["tests/coupon.test.ts::refuses a second coupon", "tests/coupon.test.ts::floors the total at shipping"],
  "REQ-PAY01": ["tests/utils.test.ts::formats money"],
};
const E2E: Record<string, string[]> = {
  "REQ-CRT01": ["tests/e2e/cart.spec.ts::cart survives sign-out"],
  "REQ-PAY01": ["tests/e2e/checkout.spec.ts::offers pix and card", "tests/e2e/checkout.spec.ts::shows the total before confirming"],
  "REQ-STK01": ["tests/e2e/product.spec.ts::last units at 3 or fewer"],
};
const TYPES: Record<string, string> = { "REQ-CRT01": "behavior", "REQ-SHP01": "calculation", "REQ-CPN01": "calculation", "REQ-PAY01": "behavior", "REQ-STK01": "ui" };
const CONDITIONS: Record<string, string[]> = { behavior: ["desktop", "mobile"], ui: ["desktop", "mobile", "dark"] };

interface RunSpec {
  hoursAgo: number;
  trigger: "dev" | "agent" | "ci";
  commit: string;
  requirements: string[];
  /** "ref" or "ref@condition" that fail in this run. */
  failing?: string[];
  lintWarnings?: number;
}

const split = (ref: string) => ({ file: ref.split("::")[0] ?? ref, name: ref.split("::")[1] ?? ref });

function stage(spec: RunSpec, requirement: string, name: string, condition: string | null, refs: string[]): StageReport {
  const results = refs.map((ref) => {
    const failed = spec.failing?.includes(ref) || (condition && spec.failing?.includes(`${ref}@${condition}`));
    const status: Status = failed ? "failed" : "passed";
    return { ref, ...split(ref), status, durationMs: 20 + (ref.length * 7) % 400, message: failed ? `Expected the condition of "${split(ref).name}" to hold${condition ? ` on ${condition}` : ""}` : null };
  });
  const failed = results.some((r) => r.status === "failed");
  return {
    requirement, stage: name, condition, command: name === "e2e" ? "bunx playwright test" : "bun test", exitCode: failed ? 1 : 0, status: failed ? "failed" : "passed",
    durationMs: name === "e2e" ? 18_000 + refs.length * 2_300 : 1_400 + refs.length * 90,
    output: failed ? results.filter((r) => r.status === "failed").map((r) => `✗ ${r.ref}\n  ${r.message}`).join("\n") : `${results.length} passed`,
    results, findings: [],
  };
}

function lint(spec: RunSpec, requirement: string): StageReport {
  const findings = Array.from({ length: spec.lintWarnings ?? 0 }, (_, i) => ({ tool: "ESLint", ruleId: "complexity", level: "warning" as const, file: `src/checkout/step-${i + 1}.ts`, line: 12 + i * 9, message: "Function has a complexity of 11. Maximum allowed is 10." }));
  return { requirement, stage: "lint", condition: null, command: "bun run lint:sarif", exitCode: 0, status: "passed", durationMs: 3_100, output: `${findings.length} warnings`, results: [], findings };
}

/** Every test a stage reports in this run: the suite runs once and covers all the requirements at once. */
function suite(spec: RunSpec, name: "unit" | "e2e", condition: string | null): string[] {
  const refs = spec.requirements.flatMap((code) => {
    const type = TYPES[code] ?? "behavior";
    if (name === "unit") return type === "ui" ? [] : (UNIT[code] ?? []);
    return condition && (CONDITIONS[type] ?? []).includes(condition) ? (E2E[code] ?? []) : [];
  });
  return [...new Set(refs)];
}

/** The stages the runner would produce for these requirements, following SHOP_CONFIG. */
function stagesFor(spec: RunSpec): StageReport[] {
  return spec.requirements.flatMap((code) => {
    const type = TYPES[code] ?? "behavior";
    const stages = [lint(spec, code)];
    if (type !== "ui") stages.push(stage(spec, code, "unit", null, suite(spec, "unit", null)));
    for (const condition of type === "calculation" ? [] : (CONDITIONS[type] ?? [])) stages.push(stage(spec, code, "e2e", condition, suite(spec, "e2e", condition)));
    return stages;
  });
}

export function shopReport(spec: RunSpec): RunReportInput {
  const stages = stagesFor(spec);
  return {
    trigger: spec.trigger, commit: spec.commit, branch: spec.trigger === "ci" ? "main" : "feat/checkout", dirty: false,
    environment: { node: "v22.11.0", platform: "linux", ...(spec.trigger === "ci" ? { ci: "github-actions" } : {}) },
    startedAt: new Date(Date.now() - spec.hoursAgo * 3_600_000).toISOString(),
    durationMs: stages.reduce((sum, s) => sum + (s.durationMs ?? 0), 0),
    trees: Object.fromEntries(spec.requirements.map((c) => [c, `sha256:${spec.commit}`])),
    stages,
  };
}

/** Eight runs over six days: failures, a fix, a flaky coupon test, a phone-only failure and a pending preview. */
export const SHOP_RUNS: RunSpec[] = [
  { hoursAgo: 146, trigger: "dev", commit: "a1b2c3d", requirements: ["REQ-CRT01", "REQ-SHP01"], failing: ["tests/cart.test.ts::drops items after 7 days"], lintWarnings: 3 },
  { hoursAgo: 122, trigger: "agent", commit: "b2c3d4e", requirements: ["REQ-CRT01", "REQ-SHP01"], lintWarnings: 2 },
  { hoursAgo: 98, trigger: "agent", commit: "c3d4e5f", requirements: ["REQ-CPN01"], failing: ["tests/coupon.test.ts::floors the total at shipping"], lintWarnings: 2 },
  { hoursAgo: 97, trigger: "agent", commit: "c3d4e5f", requirements: ["REQ-CPN01"], lintWarnings: 2 },
  { hoursAgo: 50, trigger: "ci", commit: "d4e5f6a", requirements: ["REQ-PAY01"], failing: ["tests/e2e/checkout.spec.ts::shows the total before confirming@mobile"], lintWarnings: 1 },
  { hoursAgo: 26, trigger: "agent", commit: "e5f6a7b", requirements: ["REQ-STK01"], lintWarnings: 1 },
  { hoursAgo: 5, trigger: "agent", commit: "f6a7b8c", requirements: ["REQ-PAY01"], failing: ["tests/e2e/checkout.spec.ts::shows the total before confirming@mobile"] },
  { hoursAgo: 1, trigger: "ci", commit: "0a1b2c3", requirements: ["REQ-CRT01", "REQ-SHP01", "REQ-CPN01"] },
];
