import { describe, expect, it } from "bun:test";
import { starterProjectConfig } from "@lastro/shared";

describe("how a new project starts, in the dashboard and with lastro init", () => {
  it("is automatic and strict about tests: red first, the requester's numbers, coverage, and the levels of each type", () => {
    const config = starterProjectConfig("waship");
    expect(config.project).toBe("waship");
    expect(config.server?.project).toBe("waship");
    expect(config.autonomy).toBe("auto");
    expect(config.tests).toMatchObject({ red_first: true, examples_in_tests: true, coverage_report: "coverage/lcov.info" });
    expect(config.types.ui?.tests.levels).toEqual(["unit", "e2e"]);
    expect(config.types.behavior?.tests).toEqual({ levels: ["unit", "integration"], coverage: { functions: 100, lines: 90 } });
    expect(config.types.calculation?.tests.coverage).toEqual({ functions: 100, lines: 100 });
  });
});
