import { safeName } from "./text";
import { assetRef, type Extraction, type IntakeFile } from "./types";

/** A single image: one passage "@img" that shows it. */
export function extractImage(file: IntakeFile, contentType: string): Extraction {
  const name = safeName(file.name);
  return {
    kind: "image",
    title: file.name,
    machineTranscript: false,
    passages: [{ anchor: "@img", text: assetRef(name) }],
    assets: [{ name, anchor: "@img", contentType, bytes: file.bytes }],
  };
}
