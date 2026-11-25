import { describe, expect, it } from "bun:test";
import { markQuote } from "../../apps/web/src/lib/highlight";

describe("quote highlight (REQ-K1P4V)", () => {
  it("marks the quote inside the passage, across emphasis and line breaks", () => {
    expect(markQuote("The discount has to show on the invoice, including the **annual\nplan**. Above 50 seats.", "has to show on the invoice, including the annual plan"))
      .toBe("The discount <mark>has to show on the invoice, including the **annual\nplan**</mark>. Above 50 seats.");
  });
  it("leaves the passage alone when the quote is not in it", () => {
    expect(markQuote("Nothing here.", "missing words")).toBe("Nothing here.");
  });
});
