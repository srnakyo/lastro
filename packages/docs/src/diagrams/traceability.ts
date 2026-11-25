import { label, nodeId, STATUS_CLASSES } from "./mermaid";

export interface TraceRequirement {
  code: string;
  title: string;
  citations: { source: string; anchor: string; found: boolean }[];
  criteria: { code: string; tests: string[] }[];
}

/** Latest result by test ref. */
export type TestStates = Record<string, string>;

const testClass = (status: string | undefined) => (status === "passed" ? "passed" : status === "failed" || status === "error" ? "failed" : "pending");

/** Source passages → requirements → criteria → tests. A criterion without a test, or a quote not found, is red. */
export function traceabilityDiagram(requirements: TraceRequirement[], tests: TestStates): string {
  const lines = ["flowchart LR"];
  const declared = new Set<string>();
  const declare = (id: string, line: string) => {
    if (!declared.has(id)) lines.push(line);
    declared.add(id);
  };
  for (const r of requirements) {
    const req = nodeId("req", r.code);
    declare(req, `  ${req}["${label(`${r.code} ${r.title}`)}"]:::item`);
    for (const c of r.citations) {
      const passage = nodeId("p", `${c.source}${c.anchor}`);
      declare(passage, `  ${passage}["${label(`${c.source} ${c.anchor}`)}"]:::${c.found ? "passed" : "failed"}`);
      lines.push(`  ${passage} --> ${req}`);
    }
    for (const criterion of r.criteria) {
      const ac = nodeId("ac", `${r.code}${criterion.code}`);
      declare(ac, `  ${ac}["${label(criterion.code)}"]:::${criterion.tests.length ? "node" : "failed"}`);
      lines.push(`  ${req} --> ${ac}`);
      for (const ref of criterion.tests) {
        const test = nodeId("t", ref);
        declare(test, `  ${test}["${label(ref.split("::")[1] ?? ref)}"]:::${testClass(tests[ref])}`);
        lines.push(`  ${ac} --> ${test}`);
      }
    }
  }
  return [...lines, ...STATUS_CLASSES.map((c) => `  ${c}`)].join("\n");
}
