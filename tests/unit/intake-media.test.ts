import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { extract, formatTimestamp, splitCommand } from "@lastro/intake";

const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
const transcribeCommand = `"${process.execPath}" "${fixture("fake-transcribe.ts")}" {input} {output_dir}`;
const ffmpegCommand = `"${process.execPath}" "${fixture("fake-ffmpeg.ts")}"`;
const media = new Uint8Array([0, 1, 2, 3]);
const leftovers = async () => (await readdir(tmpdir())).filter((name) => name.startsWith("lastro-intake-"));

describe("intake of audio", () => {
  it("makes one passage per transcribed segment, anchored by its start", async () => {
    const before = await leftovers();
    const source = await extract({ name: "client call; rm -rf $(x).m4a", bytes: media }, { transcribeCommand });
    expect(source.kind).toBe("audio");
    expect(source.machineTranscript).toBe(true);
    expect(source.passages).toEqual([
      { anchor: "@t00:00", text: "The invoice needs the discount line." },
      { anchor: "@t01:05", text: "Also on the annual plan." },
      { anchor: "@t01:05/2", text: "Right." },
      { anchor: "@t01:02:05", text: "Past one hour." },
    ]);
    expect(source.assets).toEqual([]);
    expect(await leftovers()).toEqual(before);
  });

  it("explains which setting is missing when there is no transcription command", async () => {
    await expect(extract({ name: "call.mp3", bytes: media })).rejects.toThrow(/LASTRO_TRANSCRIBE_COMMAND/);
  });

  it("reports a failing transcription command", async () => {
    await expect(extract({ name: "call.ogg", bytes: media }, { transcribeCommand: `"${process.execPath}" "${fixture("fake-transcribe.ts")}" {input}` })).rejects.toThrow(
      /transcription failed: expected exactly/,
    );
  });
});

describe("intake of video", () => {
  it("adds one frame per segment, referenced in its passage", async () => {
    const source = await extract({ name: "demo.mp4", bytes: media }, { transcribeCommand, ffmpegCommand });
    expect(source.kind).toBe("video");
    expect(source.machineTranscript).toBe(true);
    expect(source.passages[1]).toEqual({ anchor: "@t01:05", text: "Also on the annual plan.\n\n{{asset:t01-05.jpg}}" });
    expect(source.assets.map((a) => [a.name, a.anchor, a.contentType, new TextDecoder().decode(a.bytes)])).toEqual([
      ["t00-00.jpg", "@t00:00", "image/jpeg", "frame@0.000"],
      ["t01-05.jpg", "@t01:05", "image/jpeg", "frame@65.400"],
      ["t01-05-2.jpg", "@t01:05/2", "image/jpeg", "frame@65.900"],
      ["t01-02-05.jpg", "@t01:02:05", "image/jpeg", "frame@3725.000"],
    ]);
  });

  it("transcribes without frames when ffmpeg is not configured", async () => {
    const source = await extract({ name: "demo.webm", bytes: media }, { transcribeCommand });
    expect(source.assets).toEqual([]);
    expect(source.passages[0]?.text).toBe("The invoice needs the discount line.");
  });
});

describe("timestamps and commands", () => {
  it.each([
    [0, "00:00"],
    [65.9, "01:05"],
    [3599, "59:59"],
    [3600, "01:00:00"],
    [3725, "01:02:05"],
  ])("%p seconds is %s", (seconds, stamp) => expect(formatTimestamp(seconds, ":")).toBe(stamp));

  it("splits a template like a shell without expanding anything", () => {
    expect(splitCommand(`whisper {input} --model "large v3" --output_dir '{output_dir}' a\\ b $(rm)`)).toEqual([
      "whisper", "{input}", "--model", "large v3", "--output_dir", "{output_dir}", "a b", "$(rm)",
    ]);
    expect(() => splitCommand(`whisper "open`)).toThrow(/unclosed/);
  });
});
