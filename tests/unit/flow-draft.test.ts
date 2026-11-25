import { describe, expect, it } from "bun:test";
import { projectConfigSchema } from "@lastro/shared";
import { fromDraft, reducer, toDraft } from "../../apps/web/src/components/settings/flow/draft";

const config = projectConfigSchema.parse({
  project: "p",
  commands: { unit: { run: "bun test", report: { junit: "u.xml" } }, e2e: { run: "playwright test" } },
  conditions: { dark: { env: { THEME: "dark" }, note: "dark theme" } },
  types: { ui: { required: ["where"], flow: ["unit", { run: "e2e", conditions: ["dark"] }, { check: "preview", manual: true, by: "client" }] } },
  global_flow: ["unit"],
});

describe("QA flow editor draft", () => {
  it("round-trips lastro.yml without changing it", () => {
    expect(fromDraft(toDraft(config))).toEqual(config);
  });

  it("adds, edits, moves and removes stages, and keeps short forms short", () => {
    let d = toDraft(config);
    d = reducer(d, { type: "stage.add", flow: 0 });
    d = reducer(d, { type: "stage.set", flow: 0, index: 3, stage: { name: "e2e", conditions: ["dark"] } });
    d = reducer(d, { type: "stage.move", flow: 0, index: 3, by: -1 });
    d = reducer(d, { type: "stage.remove", flow: 0, index: 0 });
    expect(fromDraft(d).types.ui?.flow).toEqual([{ run: "e2e", conditions: ["dark"] }, { run: "e2e", conditions: ["dark"] }, { check: "preview", manual: true, by: "client" }]);
  });

  it("edits types, conditions, commands and the gate", () => {
    let d = toDraft(config);
    d = reducer(d, { type: "type.add", name: "calculation" });
    d = reducer(d, { type: "type.required", index: 1, field: "data_source", on: true });
    d = reducer(d, { type: "condition.set", index: 0, value: { env: "THEME=dark\nZOOM=200" } });
    d = reducer(d, { type: "command.set", index: 1, value: { sarif: "lint.sarif" } });
    d = reducer(d, { type: "gate.set", value: { max_stop_blocks: 5 } });
    const out = fromDraft(d);
    expect(out.types.calculation).toEqual({ required: ["data_source"], flow: [] });
    expect(out.conditions.dark?.env).toEqual({ THEME: "dark", ZOOM: "200" });
    expect(out.commands.e2e?.report).toEqual({ sarif: "lint.sarif" });
    expect(out.gate.max_stop_blocks).toBe(5);
    expect(projectConfigSchema.parse(out)).toEqual(out);
  });
});
