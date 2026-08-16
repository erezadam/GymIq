/**
 * Pool ordering for the AI-trainer GPT prompt.
 *
 * Why this exists (incident 2026-08-16): the exercise pool reaches the prompt in
 * the order `getExercises()` returns it — `orderBy('name')`, i.e. alphabetical by
 * English name (src/lib/firebase/exercises.ts). An isolated gpt-4.1 experiment
 * (docs/investigations/2026-08-16-ai-trainer-repeat-dumbbell.md) proved that a
 * FIXED input order makes the model anchor on the same early items every call:
 * ~67% identical picks across 3 generations and ~100% single-equipment output.
 * Shuffling the same pool dropped overlap to 0% and diversified the equipment —
 * with no change to the prompt text. Position bias, not prompt wording.
 *
 * The fix lives ONLY here, at the point where the pool is packed into the prompt.
 * It must NOT move into getExercises (that ordering serves every exercise list the
 * user sees on screen) and it must run server-side (the client pool arrives from a
 * PWA that may be running stale bundled code).
 */

/**
 * Fisher-Yates shuffle. Returns a NEW array — never mutates the input, so the
 * caller's pool (used elsewhere for id remapping) stays intact. Uses Math.random
 * so two consecutive calls yield independent orders; this is deliberately
 * model-agnostic (no temperature/seed on the OpenAI call), so it survives a future
 * model swap that rejects non-default sampling params.
 */
export function shufflePool<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
