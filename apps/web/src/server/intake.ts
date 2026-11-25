import { intakeService, LastroError } from "@lastro/core";
import { extract } from "@lastro/intake";
import { ROLES, type Actor } from "@lastro/shared";
import { storeFromEnv } from "@lastro/storage";

const MAX_BYTES = 200 * 1024 * 1024;

/** The part of FormData read here (DOM and Node typings of FormData differ). */
interface UploadForm {
  get(name: string): unknown;
}

/** Turns an uploaded file (multipart "file", "from", optional "source" and "final") into a source or a new version. */
export async function ingestUpload(projectId: string, actor: Actor, form: UploadForm) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new LastroError("VALIDATION", "send the file in the \"file\" field");
  if (file.size > MAX_BYTES) throw new LastroError("VALIDATION", "file larger than 200 MB");
  const from = String(form.get("from") ?? "client");
  if (!(ROLES as readonly string[]).includes(from)) throw new LastroError("VALIDATION", `from must be one of ${ROLES.join(", ")}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = await extract(
    { name: file.name, bytes, contentType: file.type || undefined },
    { transcribeCommand: process.env.LASTRO_TRANSCRIBE_COMMAND, ffmpegCommand: process.env.LASTRO_FFMPEG },
  );
  const source = form.get("source");
  return intakeService.fromExtracted(projectId, actor, extracted, {
    from: from as (typeof ROLES)[number],
    final: form.get("final") === "true",
    store: storeFromEnv(),
    original: { bytes, contentType: file.type || "application/octet-stream" },
    sourceCode: typeof source === "string" && source ? source : undefined,
  });
}
