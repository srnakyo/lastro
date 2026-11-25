import { describe, expect, it } from "bun:test";
import { extract } from "@lastro/intake";

const text = (content: string) => new TextEncoder().encode(content);

const IPHONE = [
  "\u200e[24/09/2026, 11:10:05] Ana Client: The invoice must show the discount.",
  "It applies to the annual plan too.",
  "",
  "And to old invoices.",
  "[24/09/2026, 11:12:40] Dev: Only new invoices, right?",
  "[24/09/2026, 11:13:02] Ana Client: Right: only new ones.",
].join("\n");

const ANDROID = [
  "24/09/2026 11:10 - Messages and calls are end-to-end encrypted.",
  "24/09/2026 11:10 - Ana Client: Send the report on Fridays",
  "with the totals",
  "24/09/2026, 11:15 - Dev: ok",
].join("\r\n");

describe("intake of WhatsApp exports", () => {
  it("reads the iPhone format with multi-line messages and every author", async () => {
    const source = await extract({ name: "chat.txt", bytes: text(IPHONE) });
    expect(source.kind).toBe("chat");
    expect(source.passages).toEqual([
      { anchor: "@msg:1", label: "Ana Client 24/09/2026 11:10:05", text: "The invoice must show the discount.\nIt applies to the annual plan too.\n\nAnd to old invoices." },
      { anchor: "@msg:2", label: "Dev 24/09/2026 11:12:40", text: "Only new invoices, right?" },
      { anchor: "@msg:3", label: "Ana Client 24/09/2026 11:13:02", text: "Right: only new ones." },
    ]);
  });

  it("reads the Android format, keeping system lines and the developer's replies", async () => {
    const source = await extract({ name: "WhatsApp Chat.txt", bytes: text(ANDROID) });
    expect(source.passages.map((p) => [p.anchor, p.label, p.text])).toEqual([
      ["@msg:1", "24/09/2026 11:10", "Messages and calls are end-to-end encrypted."],
      ["@msg:2", "Ana Client 24/09/2026 11:10", "Send the report on Fridays\nwith the totals"],
      ["@msg:3", "Dev 24/09/2026 11:15", "ok"],
    ]);
  });
});

describe("intake of Telegram exports", () => {
  const exported = {
    name: "Billing project",
    type: "private_group",
    id: 42,
    messages: [
      { id: 10, type: "service", date: "2026-09-24T11:00:00", actor: "Ana", action: "create_group", text: "" },
      { id: 11, type: "message", date: "2026-09-24T11:10:05", from: "Ana", text: "The discount must show." },
      { id: 12, type: "message", date: "2026-09-24T11:11:00", from: "Dev", text: ["See ", { type: "link", text: "https://example.test" }, " please"] },
      { id: 13, type: "message", date: "2026-09-24T11:12:00", from: "Ana", text: "", photo: "photos/photo_1.jpg" },
    ],
  };

  it("anchors messages by id, labels them with author and date and keeps every author", async () => {
    const source = await extract({ name: "result.json", bytes: text(JSON.stringify(exported)) });
    expect(source.kind).toBe("chat");
    expect(source.title).toBe("Billing project");
    expect(source.passages).toEqual([
      { anchor: "@msg:11", label: "Ana 2026-09-24 11:10:05", text: "The discount must show." },
      { anchor: "@msg:12", label: "Dev 2026-09-24 11:11:00", text: "See https://example.test please" },
      { anchor: "@msg:13", label: "Ana 2026-09-24 11:12:00", text: "[photo photos/photo_1.jpg]" },
    ]);
  });

  it("refuses JSON that is not a Telegram export", async () => {
    await expect(extract({ name: "data.json", bytes: text('{"rows":[]}') })).rejects.toThrow(/not a Telegram chat export/);
  });
});
