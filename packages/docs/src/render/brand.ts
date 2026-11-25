import { BRAND } from "@lastro/shared/brand";

/** The drawn signature for the top of a generated document, inline so the HTML and the PDF stay self-contained. */
export function brandMarkup(): string {
  const { width, height, paths } = BRAND.lockup;
  const d = paths.map((p) => `<path d="${p}"/>`).join("");
  return `<div class="brand"><svg viewBox="0 0 ${width} ${height}" fill="currentColor" role="img" aria-label="Lastro">${d}</svg></div>`;
}
