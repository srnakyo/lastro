import { z } from "zod";
import type { ExtractedPassage } from "./types";

const textPart = z.union([z.string(), z.object({ text: z.string() }).loose()]);

const messageSchema = z
  .object({
    id: z.number(),
    type: z.string(),
    date: z.string(),
    from: z.string().nullish(),
    text: z.union([z.string(), z.array(textPart)]).default(""),
    photo: z.string().optional(),
    file: z.string().optional(),
    media_type: z.string().optional(),
  })
  .loose();

const exportSchema = z.object({ name: z.string().nullish(), messages: z.array(messageSchema) }).loose();

type TelegramMessage = z.infer<typeof messageSchema>;

function parseExport(content: string) {
  try {
    return exportSchema.safeParse(JSON.parse(content));
  } catch {
    return null;
  }
}

export function isTelegramExport(content: string): boolean {
  return parseExport(content)?.success === true;
}

function messageText(message: TelegramMessage): string {
  const text = typeof message.text === "string" ? message.text : message.text.map((part) => (typeof part === "string" ? part : part.text)).join("");
  const media = message.photo ? `[photo ${message.photo}]` : message.file ? `[${message.media_type ?? "file"} ${message.file}]` : "";
  return [text, media].filter((part) => part.trim() !== "").join("\n");
}

/** Telegram "result.json": one passage per message, anchored by the message id. Service events are skipped. */
export function telegramChat(content: string): { title: string | null; passages: ExtractedPassage[] } {
  const parsed = exportSchema.parse(JSON.parse(content));
  const passages = parsed.messages
    .filter((message) => message.type === "message")
    .map((message) => ({
      anchor: `@msg:${message.id}`,
      label: `${message.from ?? "unknown"} ${message.date.replace("T", " ")}`,
      text: messageText(message),
    }));
  return { title: parsed.name ?? null, passages };
}
