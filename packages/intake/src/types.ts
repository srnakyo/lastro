export type ExtractedKind = "docx" | "pdf" | "chat" | "audio" | "video" | "image" | "text";

/** A binary piece of the source (an image of a document, a video frame). */
export interface ExtractedAsset {
  name: string;
  anchor: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface ExtractedPassage {
  anchor: string;
  label?: string;
  heading?: string;
  text: string;
}

export interface ExtractedSource {
  kind: ExtractedKind;
  title: string;
  machineTranscript: boolean;
  /** "sha256:<hex>" of the original bytes. */
  hash: string;
  passages: ExtractedPassage[];
  /** Images and frames; passage text references them as {{asset:<name>}}. */
  assets: ExtractedAsset[];
}

export interface IntakeOptions {
  /** Shell-like template with {input} and {output_dir}; it must write Whisper-style JSON into output_dir. */
  transcribeCommand?: string;
  /** Path to ffmpeg (or a command prefix); when set, video passages get one frame each. */
  ffmpegCommand?: string;
}

export interface IntakeFile {
  name: string;
  bytes: Uint8Array;
  contentType?: string;
}

/** What each extractor returns; the hash is added once for every kind. */
export type Extraction = Omit<ExtractedSource, "hash">;

export const assetRef = (name: string) => `{{asset:${name}}}`;
