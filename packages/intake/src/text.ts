/** Decodes UTF-8 text, dropping a byte order mark. */
export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/, "");
}

/** The extension of a file name, lowercase and with the dot ("" when there is none). */
export function extensionOf(name: string): string {
  const match = /\.[^./\\]+$/.exec(name);
  return match ? match[0].toLowerCase() : "";
}

/** An asset name safe for storage keys and Markdown: letters, digits, dot, dash and underscore. */
export function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[.-]+/, "") || "file";
}

/** File extension for an image content type: image/jpeg → jpg, image/svg+xml → svg. */
export function extensionForContentType(contentType: string): string {
  const subtype = (contentType.split("/")[1] ?? "bin").split(";")[0]?.trim().toLowerCase() ?? "bin";
  const clean = subtype.replace(/^x-/, "").replace(/\+xml$/, "");
  return clean === "jpeg" ? "jpg" : clean || "bin";
}
