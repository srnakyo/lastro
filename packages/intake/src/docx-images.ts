import mammoth from "mammoth";

export interface CollectedImage {
  contentType: string;
  bytes: Uint8Array;
}

const PREFIX = "lastro-image:";

/**
 * Collects the images mammoth finds. Each one is replaced in the HTML by a numbered src, so its
 * place in the document comes from the markup, whatever order mammoth reads the bytes in.
 */
export class ImageCollector {
  private readonly images: Promise<CollectedImage>[] = [];

  converter() {
    return mammoth.images.imgElement((image) => {
      const id = this.images.length;
      this.images.push(image.readAsArrayBuffer().then((buffer) => ({ contentType: image.contentType, bytes: new Uint8Array(buffer) })));
      return Promise.resolve({ src: `${PREFIX}${id}` });
    });
  }

  /** Waits for every image; call after the conversion finished. */
  async resolve(): Promise<Map<string, CollectedImage>> {
    const images = await Promise.all(this.images);
    return new Map(images.map((image, id) => [`${PREFIX}${id}`, image]));
  }
}
