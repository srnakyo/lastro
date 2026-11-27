import { describe, expect, it } from "bun:test";
import { stampTestRules } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";

const config = (tests: Record<string, unknown>) => projectConfigSchema.parse({ project: "p", tests });
const MON = new Date("2026-11-23T12:00:00.000Z");
const FRI = new Date("2026-11-27T12:00:00.000Z");

describe("when red first counts from", () => {
  it("stamps the moment it is turned on, and keeps that date while it stays on", () => {
    const on = stampTestRules(config({ red_first: false }), config({ red_first: true }), MON);
    expect(on.tests.red_first_since).toBe(MON.toISOString());
    expect(stampTestRules(on, config({ red_first: true, examples_in_tests: true }), FRI).tests.red_first_since).toBe(MON.toISOString());
  });

  it("drops the date when it goes off, and stamps a new one when it comes back", () => {
    const on = stampTestRules(null, config({ red_first: true }), MON);
    const off = stampTestRules(on, config({ red_first: false, red_first_since: MON.toISOString() }), FRI);
    expect(off.tests.red_first_since).toBeUndefined();
    expect(stampTestRules(off, config({ red_first: true }), FRI).tests.red_first_since).toBe(FRI.toISOString());
  });
});
