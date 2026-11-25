import { LastroError } from "@lastro/core";
import { isWhatsAppExport } from "./chat-whatsapp";
import { isTelegramExport } from "./chat-telegram";
import { decodeText, extensionOf } from "./text";
import type { IntakeFile } from "./types";

export type Format = "markdown" | "whatsapp" | "telegram" | "docx" | "pdf" | "audio" | "video" | "image";

export interface Detected {
  format: Format;
  contentType: string;
}

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const BY_EXTENSION: Record<string, Detected> = {
  ".md": { format: "markdown", contentType: "text/markdown" },
  ".markdown": { format: "markdown", contentType: "text/markdown" },
  ".txt": { format: "markdown", contentType: "text/plain" },
  ".json": { format: "telegram", contentType: "application/json" },
  ".docx": { format: "docx", contentType: DOCX_TYPE },
  ".pdf": { format: "pdf", contentType: "application/pdf" },
  ".mp3": { format: "audio", contentType: "audio/mpeg" },
  ".m4a": { format: "audio", contentType: "audio/mp4" },
  ".ogg": { format: "audio", contentType: "audio/ogg" },
  ".oga": { format: "audio", contentType: "audio/ogg" },
  ".opus": { format: "audio", contentType: "audio/opus" },
  ".wav": { format: "audio", contentType: "audio/wav" },
  ".mp4": { format: "video", contentType: "video/mp4" },
  ".mov": { format: "video", contentType: "video/quicktime" },
  ".webm": { format: "video", contentType: "video/webm" },
  ".mkv": { format: "video", contentType: "video/x-matroska" },
  ".png": { format: "image", contentType: "image/png" },
  ".jpg": { format: "image", contentType: "image/jpeg" },
  ".jpeg": { format: "image", contentType: "image/jpeg" },
  ".webp": { format: "image", contentType: "image/webp" },
  ".gif": { format: "image", contentType: "image/gif" },
};

function byContentType(contentType: string | undefined): Detected | null {
  const type = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (type === "") return null;
  const known = Object.values(BY_EXTENSION).find((d) => d.contentType === type);
  if (known) return known;
  if (type === DOCX_TYPE) return { format: "docx", contentType: type };
  if (type.startsWith("text/")) return { format: "markdown", contentType: type };
  if (type.startsWith("audio/")) return { format: "audio", contentType: type };
  if (type.startsWith("video/")) return { format: "video", contentType: type };
  if (["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return { format: "image", contentType: type };
  return null;
}

/** Text files that are chat exports become chats; JSON files must be Telegram exports. */
function refineByContent(file: IntakeFile, detected: Detected): Detected {
  if (detected.format === "markdown" && isWhatsAppExport(decodeText(file.bytes))) return { ...detected, format: "whatsapp" };
  if (detected.format !== "telegram") return detected;
  if (isTelegramExport(decodeText(file.bytes))) return detected;
  throw new LastroError("VALIDATION", `${file.name} is JSON but not a Telegram chat export (result.json with messages[])`);
}

/** Detects the kind of material by extension first, then by content type, then by content. */
export function detectFormat(file: IntakeFile): Detected {
  const detected = BY_EXTENSION[extensionOf(file.name)] ?? byContentType(file.contentType);
  if (!detected) {
    throw new LastroError("VALIDATION", `${file.name}: unsupported file type; send Markdown, text, DOCX, PDF, a chat export, audio, video or an image`);
  }
  return refineByContent(file, detected);
}
