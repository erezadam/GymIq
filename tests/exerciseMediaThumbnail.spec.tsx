/**
 * exerciseMediaThumbnail.spec.tsx — guards the 2:1 thumbnail crop behavior.
 *
 * New exercise images are 2080x1024 (start panel on the right, end panel on
 * the left, arrow in the middle). A square thumbnail with object-cover crops
 * the CENTER — showing the arrow instead of the exercise. ExerciseMedia must
 * detect wide images (ratio >= 1.8) on load and, for the `thumbnail` variant
 * only, add `object-left` so the crop anchors on the end panel (physical left,
 * intentionally not logical start/end — the panels are physical and must not
 * flip under RTL). Square images and non-thumbnail variants are unchanged.
 */

import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'

function loadWithSize(img: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: width })
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: height })
  fireEvent.load(img)
}

describe('ExerciseMedia 2:1 thumbnail crop', () => {
  it('adds object-left to a thumbnail when the loaded image is wide (2080x1024)', () => {
    const { getByAltText } = render(
      <ExerciseMedia
        imageUrl="https://example.com/exercise.webp"
        alt="wide thumb"
        variant="thumbnail"
        className="w-12 h-12 object-cover"
      />
    )
    const img = getByAltText('wide thumb') as HTMLImageElement
    expect(img.className).not.toContain('object-left')
    loadWithSize(img, 2080, 1024)
    expect(img.className).toContain('object-left')
    // existing classes preserved
    expect(img.className).toContain('object-cover')
  })

  it('does NOT add object-left for a square image (1024x1024)', () => {
    const { getByAltText } = render(
      <ExerciseMedia
        imageUrl="https://example.com/exercise.webp"
        alt="square thumb"
        variant="thumbnail"
        className="w-12 h-12 object-cover"
      />
    )
    const img = getByAltText('square thumb') as HTMLImageElement
    loadWithSize(img, 1024, 1024)
    expect(img.className).not.toContain('object-left')
  })

  it('does NOT add object-left for the hero variant even with a wide image', () => {
    const { getByAltText } = render(
      <ExerciseMedia
        imageUrl="https://example.com/exercise.webp"
        alt="wide hero"
        variant="hero"
        className="w-full h-64 object-cover"
      />
    )
    const img = getByAltText('wide hero') as HTMLImageElement
    loadWithSize(img, 2080, 1024)
    expect(img.className).not.toContain('object-left')
  })
})
