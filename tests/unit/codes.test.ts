import { describe, expect, it } from "bun:test";
import { newCode, randomCode } from "@lastro/core";
import { codeSchema, invariantCodeSchema } from "@lastro/shared";

describe("codes", () => {
  it("generates Crockford base32 codes that the schema accepts", () => {
    const codes = new Set(Array.from({ length: 10_000 }, () => randomCode("REQ")));
    for (const code of codes) expect(code).toMatch(/^REQ-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(codes.size).toBeGreaterThan(9_990);
  });

  it("refuses letters outside Crockford base32", () => {
    expect(codeSchema("Q").safeParse("Q-U8C1D").success).toBe(false);
    expect(codeSchema("Q").safeParse("Q-V8C1D").success).toBe(true);
  });

  it("gives up after repeated collisions", async () => {
    await expect(newCode("REQ", async () => true)).rejects.toThrow("could not generate");
  });
});

describe("invariant codes (REQ-2K9DM)", () => {
  it("are INV-XXXXX like every other entity, and older INV-1 codes stay valid", async () => {
    const code = await newCode("INV", async () => false);
    expect(code).toMatch(/^INV-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(invariantCodeSchema.safeParse(code).success).toBe(true);
    expect(invariantCodeSchema.safeParse("INV-1").success).toBe(true);
  });
});
