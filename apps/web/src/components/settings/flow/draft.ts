import type { ProjectConfig, Stage } from "@lastro/shared";

export interface DraftStage {
  kind: "run" | "check";
  name: string;
  conditions: string[];
  manual: boolean;
  by: string;
}

export interface DraftCondition {
  name: string;
  env: string;
  setup: string;
  note: string;
}

export interface DraftCommand {
  name: string;
  run: string;
  junit: string;
  sarif: string;
}

export interface Draft {
  base: ProjectConfig;
  global: DraftStage[];
  types: { name: string; required: string[]; flow: DraftStage[] }[];
  conditions: DraftCondition[];
  commands: DraftCommand[];
  gate: ProjectConfig["gate"];
  requireFinal: boolean;
}

export const FIELDS = ["where", "who", "data_source", "period", "reach", "when_missing", "examples", "visual_ref"];

const toStage = (s: Stage): DraftStage =>
  typeof s === "string"
    ? { kind: "run", name: s, conditions: [], manual: false, by: "" }
    : { kind: s.check ? "check" : "run", name: s.run ?? s.check ?? "", conditions: s.conditions ?? [], manual: !!s.manual, by: s.by ?? "" };

function fromStage(s: DraftStage): Stage {
  if (s.kind === "run" && !s.manual && s.conditions.length === 0) return s.name;
  return {
    ...(s.kind === "run" ? { run: s.name } : { check: s.name }),
    ...(s.conditions.length ? { conditions: s.conditions } : {}),
    ...(s.manual || s.kind === "check" ? { manual: true } : {}),
    ...(s.by ? { by: s.by } : {}),
  };
}

const envText = (env?: Record<string, string>) => Object.entries(env ?? {}).map(([k, v]) => `${k}=${v}`).join("\n");
function envMap(text: string) {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const at = line.indexOf("=");
    if (at > 0) out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

export function toDraft(config: ProjectConfig): Draft {
  return {
    base: config,
    global: config.global_flow.map(toStage),
    types: Object.entries(config.types).map(([name, t]) => ({ name, required: t.required, flow: t.flow.map(toStage) })),
    conditions: Object.entries(config.conditions).map(([name, c]) => ({ name, env: envText(c.env), setup: c.setup ?? "", note: c.note ?? "" })),
    commands: Object.entries(config.commands).map(([name, c]) => ({ name, run: c.run, junit: c.report?.junit ?? "", sarif: c.report?.sarif ?? "" })),
    gate: config.gate,
    requireFinal: config.approval.require_final_source,
  };
}

/** Back to lastro.yml's shape; empty names are dropped. */
export function fromDraft(d: Draft): ProjectConfig {
  const named = <T extends { name: string }>(items: T[]) => items.filter((i) => i.name.trim());
  return {
    ...d.base,
    approval: { ...d.base.approval, require_final_source: d.requireFinal },
    global_flow: named(d.global).map(fromStage),
    types: Object.fromEntries(named(d.types).map((t) => [t.name.trim(), { required: t.required, flow: named(t.flow).map(fromStage) }])),
    conditions: Object.fromEntries(named(d.conditions).map((c) => [c.name.trim(), { ...(c.env.trim() ? { env: envMap(c.env) } : {}), ...(c.setup.trim() ? { setup: c.setup.trim() } : {}), ...(c.note.trim() ? { note: c.note.trim() } : {}) }])),
    commands: Object.fromEntries(named(d.commands).map((c) => [c.name.trim(), { run: c.run, ...(c.junit || c.sarif ? { report: { ...(c.junit ? { junit: c.junit } : {}), ...(c.sarif ? { sarif: c.sarif } : {}) } } : {}) }])),
    gate: d.gate,
  };
}

/** Which flow a stage action targets: the global flow, or a type by index. */
export type FlowRef = "global" | number;

export type Action =
  | { type: "reset"; config: ProjectConfig }
  | { type: "stage.add"; flow: FlowRef }
  | { type: "stage.set"; flow: FlowRef; index: number; stage: Partial<DraftStage> }
  | { type: "stage.move"; flow: FlowRef; index: number; by: -1 | 1 }
  | { type: "stage.remove"; flow: FlowRef; index: number }
  | { type: "type.add"; name: string }
  | { type: "type.remove"; index: number }
  | { type: "type.required"; index: number; field: string; on: boolean }
  | { type: "condition.add" }
  | { type: "condition.set"; index: number; value: Partial<DraftCondition> }
  | { type: "condition.remove"; index: number }
  | { type: "command.add" }
  | { type: "command.set"; index: number; value: Partial<DraftCommand> }
  | { type: "command.remove"; index: number }
  | { type: "gate.set"; value: Partial<ProjectConfig["gate"]> }
  | { type: "approval.final"; on: boolean };

const blankStage: DraftStage = { kind: "run", name: "", conditions: [], manual: false, by: "" };

function editFlow(d: Draft, flow: FlowRef, edit: (stages: DraftStage[]) => DraftStage[]): Draft {
  if (flow === "global") return { ...d, global: edit(d.global) };
  return { ...d, types: d.types.map((t, i) => (i === flow ? { ...t, flow: edit(t.flow) } : t)) };
}

function move<T>(items: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[index], next[to]] = [next[to] as T, next[index] as T];
  return next;
}

const setAt = <T,>(items: T[], index: number, value: Partial<T>) => items.map((x, i) => (i === index ? { ...x, ...value } : x));
const without = <T,>(items: T[], index: number) => items.filter((_, i) => i !== index);

export function reducer(d: Draft, a: Action): Draft {
  switch (a.type) {
    case "reset": return toDraft(a.config);
    case "stage.add": return editFlow(d, a.flow, (s) => [...s, { ...blankStage, name: d.commands[0]?.name ?? "" }]);
    case "stage.set": return editFlow(d, a.flow, (s) => setAt(s, a.index, a.stage));
    case "stage.move": return editFlow(d, a.flow, (s) => move(s, a.index, a.by));
    case "stage.remove": return editFlow(d, a.flow, (s) => without(s, a.index));
    case "type.add": return d.types.some((t) => t.name === a.name) || !a.name.trim() ? d : { ...d, types: [...d.types, { name: a.name.trim(), required: [], flow: [] }] };
    case "type.remove": return { ...d, types: without(d.types, a.index) };
    case "type.required": return { ...d, types: d.types.map((t, i) => (i === a.index ? { ...t, required: a.on ? [...new Set([...t.required, a.field])] : t.required.filter((f) => f !== a.field) } : t)) };
    case "condition.add": return { ...d, conditions: [...d.conditions, { name: "", env: "", setup: "", note: "" }] };
    case "condition.set": return { ...d, conditions: setAt(d.conditions, a.index, a.value) };
    case "condition.remove": return { ...d, conditions: without(d.conditions, a.index) };
    case "command.add": return { ...d, commands: [...d.commands, { name: "", run: "", junit: "", sarif: "" }] };
    case "command.set": return { ...d, commands: setAt(d.commands, a.index, a.value) };
    case "command.remove": return { ...d, commands: without(d.commands, a.index) };
    case "gate.set": return { ...d, gate: { ...d.gate, ...a.value } };
    case "approval.final": return { ...d, requireFinal: a.on };
  }
}
