import type { ProjectConfig, Stage } from "@lastro/shared";
import { values } from "../values";
import { label, nodeId, STATUS_CLASSES } from "./mermaid";

/** Latest status per "stage|condition" ("passed", "failed", "error"); absent means not run. */
export type StageStates = Record<string, string>;

interface Step {
  name: string;
  manual: boolean;
  conditions: (string | null)[];
}

function steps(config: ProjectConfig, type: string): Step[] {
  const seen = new Set<string>();
  const toStep = (s: Stage): Step =>
    typeof s === "string"
      ? { name: s, manual: false, conditions: [null] }
      : { name: s.run ?? s.check ?? "stage", manual: !!s.manual, conditions: s.conditions?.length ? s.conditions : [null] };
  return [...config.global_flow, ...(config.types[type]?.flow ?? [])].map(toStep).filter((s) => !seen.has(s.name) && !!seen.add(s.name));
}

function stateClass(step: Step, condition: string | null, states?: StageStates) {
  const status = states?.[`${step.name}|${condition ?? ""}`];
  if (status === "passed") return "passed";
  if (status === "failed" || status === "error") return "failed";
  return step.manual ? "manual" : "pending";
}

/**
 * The QA flow of a requirement type as a left-to-right flowchart: approved, each stage (fanned out
 * per condition), verified. With states, each node takes the color of its latest result.
 */
export function qaFlowDiagram(config: ProjectConfig, type: string, states?: StageStates, lang: "en" | "pt-BR" = "en"): string {
  const v = values(lang);
  const lines = ["flowchart LR", `  start(["${label(v.of("status", "approved"))}"])`];
  let previous = ["start"];
  for (const step of steps(config, type)) {
    const ids = step.conditions.map((condition) => {
      const id = nodeId(step.name, condition ?? "all");
      const text = label(condition ? `${step.name} · ${condition}` : step.name);
      lines.push(step.manual ? `  ${id}{{"${text}"}}:::${stateClass(step, condition, states)}` : `  ${id}["${text}"]:::${stateClass(step, condition, states)}`);
      return id;
    });
    for (const from of previous) for (const to of ids) lines.push(`  ${from} --> ${to}`);
    previous = ids;
  }
  lines.push(`  done(["${label(v.of("status", "verified"))}"])`);
  for (const from of previous) lines.push(`  ${from} --> done`);
  return [...lines, ...STATUS_CLASSES.map((c) => `  ${c}`)].join("\n");
}
