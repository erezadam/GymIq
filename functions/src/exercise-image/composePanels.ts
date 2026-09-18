/**
 * composePanels — pure sharp module (no Firebase, no OpenAI, fully testable).
 *
 * Composes the two exercise panels into a single horizontal RTL image:
 *   [ END (left) ] [ 32px white gap + small black arrow pointing LEFT ] [ START (right) ]
 * The RIGHT panel is the START pose (reading direction is RTL: start on the
 * right, end on the left), matching the product decision in the record rules
 * (panelLayout: horizontal, RTL).
 *
 * Output: webp quality 80; if the result exceeds maxBytes, retries at 70;
 * still too large -> returns { ok: false } (the caller marks the draft failed).
 */

import sharp from 'sharp'

export const PANEL_SIZE = 1024
export const GAP = 32
export const CANVAS_WIDTH = PANEL_SIZE * 2 + GAP // 2080
export const DEFAULT_MAX_BYTES = 250 * 1024

// Small black arrow pointing LEFT (toward the END panel), vertically centered
// in the 32px gap. Drawn as an SVG overlay.
const ARROW_SVG = Buffer.from(
  `<svg width="${GAP}" height="${PANEL_SIZE}" xmlns="http://www.w3.org/2000/svg">` +
    `<polygon points="4,${PANEL_SIZE / 2} 28,${PANEL_SIZE / 2 - 14} 28,${PANEL_SIZE / 2 + 14}" fill="#000"/>` +
    `</svg>`
)

export type ComposeResult =
  | { ok: true; buffer: Buffer; bytes: number; quality: number }
  | { ok: false; error: string }

export interface ComposeOptions {
  maxBytes?: number
}

/**
 * @param endPng   1024x1024 PNG of the END pose (placed on the LEFT)
 * @param startPng 1024x1024 PNG of the START pose (placed on the RIGHT)
 */
export async function composePanels(
  endPng: Buffer,
  startPng: Buffer,
  options: ComposeOptions = {}
): Promise<ComposeResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES

  const qualities = [80, 70]
  let lastBytes = 0
  for (const quality of qualities) {
    // Rebuild the pipeline per attempt — sharp pipelines are single-use.
    const buffer = await sharp({
      create: {
        width: CANVAS_WIDTH,
        height: PANEL_SIZE,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        { input: endPng, left: 0, top: 0 }, // left panel = END
        { input: startPng, left: PANEL_SIZE + GAP, top: 0 }, // right panel = START
        { input: ARROW_SVG, left: PANEL_SIZE, top: 0 }, // arrow in the gap
      ])
      .webp({ quality })
      .toBuffer()

    lastBytes = buffer.length
    if (buffer.length <= maxBytes) {
      return { ok: true, buffer, bytes: buffer.length, quality }
    }
  }

  return {
    ok: false,
    error: `Composed webp is ${lastBytes} bytes, exceeds limit of ${maxBytes} bytes even at quality 70`,
  }
}
