import { describe, it, expect, vi } from 'vitest'
import { applyStagnationFloor } from '../functions/src/ai-trainer/stagnationFloor'

const logger = () => ({ warn: vi.fn() })

describe('applyStagnationFloor (16/07/2026 — recommendation below lastWeight despite increase flag)', () => {
  it('flag ON + LLM=9 on lastWeight=10 → result strictly > 10 and warn logged', () => {
    const log = logger()
    const w = applyStagnationFloor({ exerciseId: 'e1', llmWeight: 9, lastWeight: 10, stagnant: true }, log)
    expect(w).toBeGreaterThan(10)
    expect(w).toBe(10.5) // max(roundToHalf(10*1.05)=10.5, 10+0.5=10.5)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn.mock.calls[0][1]).toMatchObject({ exerciseId: 'e1', llmWeight: 9, lastWeight: 10 })
  })

  it('flag ON + LLM equal to lastWeight → also floored (strictly greater, not >=)', () => {
    const log = logger()
    const w = applyStagnationFloor({ exerciseId: 'e1', llmWeight: 10, lastWeight: 10, stagnant: true }, log)
    expect(w).toBeGreaterThan(10)
    expect(log.warn).toHaveBeenCalledTimes(1)
  })

  it('flag OFF + LLM=9 → stays 9, no log (no blanket clamp)', () => {
    const log = logger()
    const w = applyStagnationFloor({ exerciseId: 'e1', llmWeight: 9, lastWeight: 10, stagnant: false }, log)
    expect(w).toBe(9)
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('flag MISSING (undefined) with history → warn "missing where expected", weight untouched', () => {
    const log = logger()
    const w = applyStagnationFloor({ exerciseId: 'e1', llmWeight: 9, lastWeight: 10, stagnant: undefined }, log)
    expect(w).toBe(9)
    expect(log.warn).toHaveBeenCalledTimes(1)
    expect(log.warn.mock.calls[0][0]).toMatch(/missing/i)
  })

  it('no history (lastWeight undefined/0) → untouched, no log', () => {
    const log = logger()
    expect(applyStagnationFloor({ exerciseId: 'e1', llmWeight: 12, lastWeight: undefined, stagnant: true }, log)).toBe(12)
    expect(applyStagnationFloor({ exerciseId: 'e1', llmWeight: 12, lastWeight: 0, stagnant: true }, log)).toBe(12)
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('flag ON + LLM above lastWeight → LLM value kept, no override log', () => {
    const log = logger()
    const w = applyStagnationFloor({ exerciseId: 'e1', llmWeight: 11, lastWeight: 10, stagnant: true }, log)
    expect(w).toBe(11)
    expect(log.warn).not.toHaveBeenCalled()
  })
})
