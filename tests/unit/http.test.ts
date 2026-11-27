import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { LastroError } from "@lastro/core";
import { projectConfigSchema } from "@lastro/shared";
import { body, errorResponse } from "../../apps/web/src/api-lib/http";

describe("error responses of the API", () => {
  it("answers a domain error with its code and the status of that code", async () => {
    const res = errorResponse(new LastroError("NOT_FOUND", "requirement REQ-1 not found"));
    expect([res.status, await res.json()]).toEqual([404, { error: "requirement REQ-1 not found", code: "NOT_FOUND", details: null }]);
  });

  it("answers an invalid body with 422 and the issues", async () => {
    const parsed = projectConfigSchema.safeParse({});
    const res = errorResponse(parsed.error);
    const json = (await res.json()) as { code: string; details: { path: string[] }[] };
    expect([res.status, json.code, json.details.length > 0]).toEqual([422, "VALIDATION", true]);
  });

  describe("an error nobody expected", () => {
    let logged: ReturnType<typeof spyOn>;
    beforeEach(() => {
      logged = spyOn(console, "error").mockImplementation(() => undefined);
    });
    afterEach(() => logged.mockRestore());

    it("answers 500 without internals", async () => {
      const res = errorResponse(new Error("connection to 10.0.0.5 refused"));
      expect([res.status, await res.json()]).toEqual([500, { error: "internal error", code: "INTERNAL" }]);
    });

    it("logs the real error without the secrets in it", () => {
      errorResponse(new Error("failed with token lst_abcd1234_abcdefghijklmnopqrstuvwx"));
      expect(String(logged.mock.calls[0]?.[0])).not.toContain("abcdefghijklmnopqrstuvwx");
    });

    it("logs a thrown value that is not an Error", () => {
      errorResponse("just a string");
      expect(logged.mock.calls[0]?.[0]).toBe("just a string");
    });
  });
});

describe("reading a request body", () => {
  it("parses JSON", async () => {
    expect(await body(new Request("http://x.test", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
  });

  it("gives an empty object when there is no body", async () => {
    expect(await body(new Request("http://x.test", { method: "POST" }))).toEqual({});
  });
});
