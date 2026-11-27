import { describe, expect, it } from "bun:test";
import { starterProjectConfig, type ProjectConfig } from "@lastro/shared";
import { loosenings } from "../../packages/core/src/projects/loosening";

const base = () => starterProjectConfig("waship");
/** A type of the config, which the starter always has. */
function type(c: ProjectConfig, name: string) {
  const t = c.types[name];
  if (!t) throw new Error(`no type ${name}`);
  return t;
}
const change = (edit: (c: ProjectConfig) => void) => {
  const next = structuredClone(base());
  edit(next);
  return loosenings(base(), next);
};

describe("what an agent may not change in the QA configuration", () => {
  it("lets it set up and tighten: commands, conditions, flow stages, more levels, higher coverage, review mode", () => {
    expect(
      change((c) => {
        c.commands.unit = { run: "bun test --reporter=junit", report: { junit: "out/unit.xml" } };
        c.conditions.phone = { env: { E2E_VIEWPORT: "390x844" } };
        type(c, "ui").flow.push({ run: "e2e", conditions: ["phone"] });
        c.global_flow.push("lint");
        type(c, "calculation").tests.levels.push("integration");
        type(c, "behavior").tests.coverage = { functions: 100, lines: 95 };
        c.tests.levels.e2e = [...(c.tests.levels.e2e ?? []), "app/**/*.e2e.ts"];
        c.autonomy = "review";
        c.gate.max_stop_blocks = 2;
      }),
    ).toEqual([]);
  });

  it("names every rule it would loosen", () => {
    expect(change((c) => { c.tests.red_first = false; c.tests.examples_in_tests = false; c.tests.coverage_report = undefined; c.tests.coverage_exclude = ["src/**"]; })).toEqual([
      "tests.red_first off", "tests.examples_in_tests off", "tests.coverage_report removed", "tests.coverage_exclude adds src/**",
    ]);
    expect(change((c) => { delete c.types.calculation; type(c, "ui").tests.levels = ["unit"]; type(c, "behavior").tests.coverage = { functions: 80 }; type(c, "ui").required = []; })).toEqual([
      "behavior coverage of functions from 100% to 80", "behavior coverage of lines from 90% to none", "type calculation removed", "ui no longer requires where", "ui no longer asks for e2e tests",
    ]);
    expect(change((c) => { c.gate.block_agent_stop = false; c.gate.max_stop_blocks = 9; c.gate.ci = "off"; c.gate.human_identities = ["agent@x.test"]; c.approval.require_final_source = false; })).toEqual([
      "approval.require_final_source off", "gate.block_agent_stop off", "gate.max_stop_blocks raised", "gate.ci from required to off", "gate.human_identities changed",
    ]);
  });

  it("counts removed stages, conditions and level patterns, and review back to auto", () => {
    const prev = structuredClone(base());
    prev.autonomy = "review";
    prev.global_flow = ["lint"];
    type(prev, "ui").flow = [{ run: "e2e", conditions: ["phone"] }];
    prev.conditions.phone = { note: "390 px" };
    const next = structuredClone(prev);
    next.autonomy = "auto";
    next.global_flow = [];
    type(next, "ui").flow = [];
    next.conditions = {};
    next.tests.levels.unit = [];
    expect(loosenings(prev, next)).toEqual([
      "autonomy from review to auto",
      ...(prev.tests.levels.unit ?? []).map((glob) => `tests.levels.unit drops ${glob}`),
      "a stage of the ui flow removed",
      "a stage of the global flow removed",
      "condition phone removed",
    ]);
  });
});
