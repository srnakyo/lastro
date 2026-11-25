import { describe, expect, it } from "bun:test";
import { extract } from "@lastro/intake";

const text = (content: string) => new TextEncoder().encode(content);

describe("intake of Markdown and plain text", () => {
  it("anchors every paragraph under its file and section", async () => {
    const source = await extract({ name: "brief.md", bytes: text("# Invoices\n\nFirst.\n\nSecond.") });
    expect(source.kind).toBe("text");
    expect(source.title).toBe("brief.md");
    expect(source.machineTranscript).toBe(false);
    expect(source.passages).toEqual([
      { anchor: "@brief.md#invoices/p1", heading: "Invoices", text: "First." },
      { anchor: "@brief.md#invoices/p2", heading: "Invoices", text: "Second." },
    ]);
    expect(source.assets).toEqual([]);
  });

  it("treats a .txt that is not a chat export as text, without a heading", async () => {
    const source = await extract({ name: "notes.txt", bytes: text("\uFEFFJust a note.\n\nAnother one.") });
    expect(source.kind).toBe("text");
    expect(source.passages.map((p) => p.anchor)).toEqual(["@notes.txt#/p1", "@notes.txt#/p2"]);
    expect(source.passages[0]).not.toHaveProperty("heading");
    expect(source.passages[0]?.text).toBe("Just a note.");
  });

  it("hashes the original bytes", async () => {
    const bytes = text("# A\n\nb");
    const source = await extract({ name: "a.md", bytes });
    expect(source.hash).toBe(`sha256:${new Bun.CryptoHasher("sha256").update(bytes).digest("hex")}`);
  });
});
