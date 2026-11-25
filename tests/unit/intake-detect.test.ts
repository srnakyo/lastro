import { describe, expect, it } from "bun:test";
import { detectFormat, extract } from "@lastro/intake";
import { RED_PNG } from "../helpers/intake-files";

const text = (content: string) => new TextEncoder().encode(content);

describe("format detection", () => {
  it.each([
    ["brief.md", "markdown"],
    ["brief.MARKDOWN", "markdown"],
    ["notes.txt", "markdown"],
    ["spec.docx", "docx"],
    ["spec.pdf", "pdf"],
    ["call.m4a", "audio"],
    ["voice.opus", "audio"],
    ["voice.oga", "audio"],
    ["demo.mkv", "video"],
    ["demo.mov", "video"],
    ["screen.jpeg", "image"],
    ["screen.webp", "image"],
  ])("%s is %s", (name, format) => {
    expect(detectFormat({ name, bytes: text("plain") }).format).toBe(format as never);
  });

  it("tells a WhatsApp export from plain text by its content", () => {
    expect(detectFormat({ name: "chat.txt", bytes: text("[01/02/2026, 10:00:00] Ana: hi") }).format).toBe("whatsapp");
  });

  it("falls back to the content type when the name has no known extension", () => {
    expect(detectFormat({ name: "upload", bytes: new Uint8Array(), contentType: "application/pdf" }).format).toBe("pdf");
    expect(detectFormat({ name: "upload", bytes: new Uint8Array(), contentType: "audio/x-flac" }).format).toBe("audio");
  });

  it("refuses unknown material with a clear error", () => {
    expect(() => detectFormat({ name: "sheet.xlsx", bytes: new Uint8Array() })).toThrow(/unsupported file type/);
  });
});

describe("intake of images", () => {
  it("makes one passage @img that shows the image, stored as an asset", async () => {
    const source = await extract({ name: "Screen shot 1.png", bytes: RED_PNG });
    expect(source.kind).toBe("image");
    expect(source.passages).toEqual([{ anchor: "@img", text: "{{asset:Screen-shot-1.png}}" }]);
    expect(source.assets).toEqual([{ name: "Screen-shot-1.png", anchor: "@img", contentType: "image/png", bytes: RED_PNG }]);
    expect(source.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
