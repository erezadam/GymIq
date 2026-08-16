/**
 * Regression guard for the 2026-08-16 AI-trainer position-bias incident.
 *
 * The exercise pool reaches the GPT prompt sorted (getExercises → orderBy('name')).
 * A fixed order made gpt-4.1 anchor on the same early items every call (~67%
 * identical picks, ~100% single-equipment). shufflePool() breaks that at the
 * packing point. These tests document what the PRODUCT needs — a non-sorted,
 * per-call-varying prompt order — and fail if the pool is ever streamed sorted or
 * if two consecutive calls produce the same order.
 */
import { describe, it, expect } from 'vitest'
import { shufflePool } from '../functions/src/ai-trainer/poolShuffle'

const sorted = Array.from({ length: 60 }, (_, i) => i)

describe('shufflePool — AI-trainer prompt pool ordering', () => {
  it('does NOT stream the pool in its sorted input order', () => {
    const out = shufflePool(sorted)
    // Fails if the pool reaches the prompt sorted (the incident's root cause).
    expect(out).not.toEqual(sorted)
  })

  it('two consecutive calls produce different orders', () => {
    const a = shufflePool(sorted)
    const b = shufflePool(sorted)
    // Fails if consecutive generations get the same order (repeat-workout bug).
    expect(a).not.toEqual(b)
  })

  it('is a true permutation — same elements, none lost or duplicated', () => {
    const out = shufflePool(sorted)
    expect([...out].sort((x, y) => x - y)).toEqual(sorted)
  })

  it('never mutates the caller pool (id remapping relies on the original)', () => {
    const input = sorted.slice()
    shufflePool(input)
    expect(input).toEqual(sorted)
  })
})
