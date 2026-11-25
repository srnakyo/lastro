import { LastroError } from "@lastro/core";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { fillTemplate, runCommand, splitCommand } from "./command";
import { extensionOf } from "./text";
import { TimestampAnchors } from "./timestamps";
import { assetRef, type ExtractedAsset, type ExtractedPassage, type Extraction, type IntakeFile, type IntakeOptions } from "./types";

const transcriptSchema = z.object({
  segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() }).loose()),
}).loose();

type Segment = z.infer<typeof transcriptSchema>["segments"][number];

async function transcribe(template: string, input: string, outputDir: string): Promise<Segment[]> {
  // The template runs as written: Lastro never adds an initial prompt or candidate phrases,
  // because a primed transcription invents requests nobody made.
  await runCommand(fillTemplate(splitCommand(template), { input, output_dir: outputDir }), "transcription");
  const json = (await readdir(outputDir)).filter((name) => name.endsWith(".json")).sort()[0];
  if (!json) throw new Error(`transcription wrote no JSON file into its output folder`);
  return transcriptSchema.parse(JSON.parse(await readFile(join(outputDir, json), "utf8"))).segments;
}

async function frameAt(ffmpeg: string, input: string, seconds: number, output: string): Promise<Uint8Array> {
  const args = [...splitCommand(ffmpeg), "-hide_banner", "-loglevel", "error", "-ss", seconds.toFixed(3), "-i", input, "-frames:v", "1", "-q:v", "2", "-y", output];
  await runCommand(args, "frame extraction");
  return new Uint8Array(await readFile(output));
}

interface MediaWork {
  file: IntakeFile;
  kind: "audio" | "video";
  options: IntakeOptions;
  dir: string;
}

async function buildPassages(work: MediaWork, input: string, segments: Segment[]) {
  const anchors = new TimestampAnchors();
  const passages: ExtractedPassage[] = [];
  const assets: ExtractedAsset[] = [];
  for (const segment of segments) {
    const text = segment.text.trim();
    if (text === "") continue;
    const { anchor, frameName } = anchors.next(segment.start);
    if (work.kind === "video" && work.options.ffmpegCommand) {
      const bytes = await frameAt(work.options.ffmpegCommand, input, segment.start, join(work.dir, frameName));
      assets.push({ name: frameName, anchor, contentType: "image/jpeg", bytes });
      passages.push({ anchor, text: `${text}\n\n${assetRef(frameName)}` });
    } else {
      passages.push({ anchor, text });
    }
  }
  return { passages, assets };
}

/** Audio and video through an external transcription command: one passage per segment, "@t<mm>:<ss>". */
export async function extractMedia(file: IntakeFile, kind: "audio" | "video", options: IntakeOptions): Promise<Extraction> {
  if (!options.transcribeCommand) {
    throw new LastroError("VALIDATION", `${file.name}: ${kind} needs a transcription command; set LASTRO_TRANSCRIBE_COMMAND on the server (with {input} and {output_dir})`);
  }
  const dir = await mkdtemp(join(tmpdir(), "lastro-intake-"));
  try {
    // The original name never reaches the command line: the file is saved under a fixed name.
    const input = join(dir, `input${extensionOf(file.name)}`);
    const outputDir = join(dir, "out");
    await writeFile(input, file.bytes);
    await mkdir(outputDir);
    const segments = await transcribe(options.transcribeCommand, input, outputDir);
    const { passages, assets } = await buildPassages({ file, kind, options, dir }, input, segments);
    return { kind, title: file.name, machineTranscript: true, passages, assets };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
