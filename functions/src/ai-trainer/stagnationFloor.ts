/**
 * Stagnation floor for LLM weight recommendations.
 * Pure module — no firebase imports — unit-tested from the root Vitest suite.
 *
 * Contract (16/07/2026 incident): when the client-side stagnation flag is ON
 * (last 3 identical completed self-workouts), the recommended weight must be
 * STRICTLY greater than lastWeight. Without the flag there is NO floor —
 * the LLM may recommend a decrease (no deload path exists today, but a blanket
 * clamp must not silently create one). Every override / missing-flag case is
 * reported through the injected logger — never silent (No silent AI filtering).
 */

export interface StagnationLogger {
  warn(message: string, meta?: Record<string, unknown>): void
}

export interface StagnationFloorInput {
  exerciseId: string
  /** Weight recommended by the LLM (kg) */
  llmWeight: number
  /** Best-set weight of the user's most recent workout for this exercise; undefined/0 = no history */
  lastWeight: number | undefined
  /** Client-computed stagnation flag; undefined = entry missing from exerciseRecommendations doc */
  stagnant: boolean | undefined
}

export const roundToHalf = (n: number): number => Math.round(n * 2) / 2

export function applyStagnationFloor(input: StagnationFloorInput, log: StagnationLogger): number {
  const { exerciseId, llmWeight, lastWeight, stagnant } = input
  if (!lastWeight || lastWeight <= 0) return llmWeight // no history — nothing to enforce
  if (stagnant === undefined) {
    // Exercise has history, so the client should have written a flag entry for it.
    // Silent skip would reintroduce the contradiction unnoticed — warn and pass through.
    log.warn('stagnation flag missing where expected', { exerciseId, llmWeight, lastWeight })
    return llmWeight
  }
  if (!stagnant || llmWeight > lastWeight) return llmWeight
  const finalWeight = Math.max(roundToHalf(lastWeight * 1.05), lastWeight + 0.5)
  log.warn('LLM recommendation overridden: stagnation flag requires weight increase', {
    exerciseId,
    llmWeight,
    lastWeight,
    finalWeight,
  })
  return finalWeight
}
