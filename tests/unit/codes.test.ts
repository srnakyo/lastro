import { describe, expect, it } from "bun:test";
import { newCode, randomCode } from "@lastro/core";
import { codeSchema } from "@lastro/shared";

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
