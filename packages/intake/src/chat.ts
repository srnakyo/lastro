import { whatsAppPassages } from "./chat-whatsapp";
import { telegramChat } from "./chat-telegram";
import { decodeText } from "./text";
import type { Extraction, IntakeFile } from "./types";

/** WhatsApp text export: messages anchored "@msg:<n>", labelled "<author> <date time>". */
export function extractWhatsApp(file: IntakeFile): Extraction {
  return { kind: "chat", title: file.name, machineTranscript: false, passages: whatsAppPassages(decodeText(file.bytes)), assets: [] };
}

/** Telegram JSON export: messages anchored "@msg:<id>". */
export function extractTelegram(file: IntakeFile): Extraction {
  const chat = telegramChat(decodeText(file.bytes));
  return { kind: "chat", title: chat.title ?? file.name, machineTranscript: false, passages: chat.passages, assets: [] };
}
