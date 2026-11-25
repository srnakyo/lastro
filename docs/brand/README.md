# Lastro brand files

**English** · [Português](README.pt-BR.md)

The idea: every vessel in the mark is filled to the same line, the level. The symbol, the a and the o have their floor at the same height (42% of the x-height). The symbol stands on the baseline, measures 1.3 x-heights, and its weight fills a third of it.

## Which file

| File | Use | Size |
|---|---|---|
| `lockup.svg` | Horizontal signature (symbol and word). Dashboard, documents, large screens. | 3177 × 735 ratio; 19 px tall and up |
| `wordmark.svg` | The word alone, when the symbol is already nearby. | 2277 × 735 |
| `mark.svg` | Master symbol. Collapsed sidebar, icons, print. | 1000 × 1000 |
| `lockup-sidebar.svg`, `mark-28.svg` | Optional versions fitted to the pixel grid (straight edges only; curves stay true circles and ellipses). Use 1:1 at whole-pixel positions. | 88 × 19, 28 × 28 |
| `favicon.svg` | Browser tab, drawn on the 16 px grid. Ink on light, light on dark through `prefers-color-scheme`. | 16 × 16 |
| `readme-light.svg` / `readme-dark.svg` | README header with the blue level line, for #ffffff and #0d1117. | 840 × 218 |
| `avatar.png` | Square avatar for GitHub and npm; survives the round crop. | 512 × 512 |
| `social-preview.png` | Repository social preview (GitHub › Settings › Social preview). | 1280 × 640 |

The SVGs use `fill="currentColor"` (except the favicon and the README headers): inline, the colour comes from CSS. Inside an `<img>`, currentColor turns black.

In code, the dashboard and the generated documents draw the masters (`mark.svg`, `lockup.svg`) from `packages/shared/src/brand.ts`, which `bun scripts/brand.ts` generates from this folder; the script also copies the favicon to `apps/web/public/`. Run it after changing any SVG here.

In a terminal the signature is text: `◒ lastro` (U+25D2) in the terminal's own font.

## Colours

| Name | Hex | Use |
|---|---|---|
| Ink | #0f172a | the mark on light |
| Light | #e6ebf3 | the mark on dark (#0b1220) |
| Blue | #1d63d8 | the level line only |
| Green | #16a34a | done status (CLI, dashboard) |
| Red | #dc2626 | refused status (CLI, dashboard) |

The mark is always one colour: no gradient, shadow, outline or box around it.

## Clear space and minimum sizes

- Signature: at least the word's x-height all around. Symbol alone: 25% of its diameter.
- `lockup.svg` from 19 px tall; `mark.svg` from 16 px (the favicon covers 16 px in tabs); `wordmark.svg` from a 9 px x-height.

## The level line

The blue line runs exactly over the vessel floors across the full width. It only appears in large pieces (README, social preview, avatar, presentations), never at small sizes and never in another colour.

## Drawing

- Measured on a 500 x-height: level 210, ascender 724, overshoot 11, stems 108, horizontals 90; 50 units of nearest-ink space between letters, 250 from the symbol to the word.
- Every straight cut is level or plumb. The vessel floors are sharp, never rounded.
- One path per file, absolute coordinates, no transforms, at most 2 decimals, every extreme on a node, every subpath closed on its start point, no zero-length segments, counters wound against the outer contour.
