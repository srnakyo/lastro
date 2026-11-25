import { values } from "../values";
import { label, nodeId, STATUS_CLASSES } from "./mermaid";

export interface TraceRequirement {
  code: string;
  title: string;
  /** false when a cited source is not final yet: drawn as a gap. */
  finalSource?: boolean;
  citations: { source: string; anchor: string; found: boolean }[];
  criteria: { code: string; tests: string[] }[];
}

/** Latest result by test ref, with the run it came from when known. */
export type TestStates = Record<string, string | { status: string; runId?: string | null; commit?: string | null }>;

const stateOf = (v: TestStates[string] | undefined) => (typeof v === "string" ? { status: v } : (v ?? { status: "" }));
const testClass = (status: string) => (status === "passed" ? "passed" : status === "failed" || status === "error" ? "failed" : "pending");

/** Node ids of a traceability diagram, so a page can make them clickable. */
export const traceIds = {
  requirement: (code: string) => nodeId("req", code),
  passage: (source: string, anchor: string) => nodeId("p", `${source}${anchor}`),
  run: (id: string) => nodeId("run", id),
};

/**
 * Source passages → requirements → criteria → tests → runs (REQ-M4R7W). Gaps are drawn red: a quote not
 * found, a requirement whose source is not final, a criterion with no test ("no test"); a test with no run
 * is grey ("not run").
 */
export function traceabilityDiagram(requirements: TraceRequirement[], tests: TestStates, lang: "en" | "pt-BR" = "en"): string {
  const v = values(lang);
  const lines = ["flowchart LR"];
  const declared = new Set<string>();
  const addNode = (id: string, line: string) => {
    if (!declared.has(id)) lines.push(line);
    declared.add(id);
  };
  for (const r of requirements) {
    const req = traceIds.requirement(r.code);
    const gap = r.finalSource === false;
    addNode(req, `  ${req}["${label(`${r.code} ${r.title}${gap ? ` · ${v.word("sourceNotFinal")}` : ""}`)}"]:::${gap ? "gap" : "item"}`);
    for (const c of r.citations) {
      const passage = traceIds.passage(c.source, c.anchor);
      addNode(passage, `  ${passage}["${label(`${c.source} ${c.anchor}${c.found ? "" : ` · ${v.word("quoteNotFound")}`}`)}"]:::${c.found ? "passed" : "failed"}`);
      lines.push(`  ${passage} --> ${req}`);
    }
    for (const criterion of r.criteria) {
      const ac = nodeId("ac", `${r.code}${criterion.code}`);
      addNode(ac, `  ${ac}["${label(criterion.tests.length ? criterion.code : `${criterion.code} · ${v.word("noTest")}`)}"]:::${criterion.tests.length ? "item" : "failed"}`);
      lines.push(`  ${req} --> ${ac}`);
      for (const ref of criterion.tests) {
        const state = stateOf(tests[ref]);
        const test = nodeId("t", ref);
        addNode(test, `  ${test}["${label(`${ref.split("::")[1] ?? ref}${state.status ? "" : ` · ${v.word("notRun")}`}`)}"]:::${testClass(state.status)}`);
        lines.push(`  ${ac} --> ${test}`);
        if ("runId" in state && state.runId) {
          const run = traceIds.run(state.runId);
          addNode(run, `  ${run}(["${label(`${v.word("run")} ${state.commit ?? state.runId.slice(0, 8)}`)}"]):::${testClass(state.status)}`);
          lines.push(`  ${test} --> ${run}`);
        }
      }
    }
  }
  return [...lines, ...STATUS_CLASSES.map((c) => `  ${c}`), "  classDef gap fill:#e11d4814,stroke:#e11d48,color:#e11d48,stroke-dasharray:5 3"].join("\n");
}
