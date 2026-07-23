/**
 * Pure helpers for the admin-editable AI prompt library (aiPrompts collection).
 *
 * Kept free of firebase-admin imports so vitest can exercise the parsing and
 * templating behavior directly (same pattern as ai-trainer/stagnationFloor.ts).
 * The Firestore read itself lives in promptConfig.ts.
 */

/** Canonical prompt document ids in the aiPrompts collection. */
export const PROMPT_IDS = {
  workoutGeneration: 'workout_generation',
  trainingAnalysis: 'training_analysis',
  programBuilder: 'program_builder',
  releaseNoteDrafter: 'release_note_drafter',
} as const

export interface PromptOverride {
  systemPrompt?: string
  model?: string
  maxTokens?: number
}

/**
 * Single source of truth for the models each prompt may run on.
 * The admin UI renders these as a strict dropdown (aiPromptRegistry mirrors
 * this list — a vitest drift guard asserts the two stay identical), and the
 * server drops any saved model that is not listed, falling back to the
 * built-in default instead of crashing generation.
 */
export const ALLOWED_MODELS: Record<string, readonly string[]> = {
  [PROMPT_IDS.workoutGeneration]: ['gpt-4o-mini', 'gpt-4o'],
  [PROMPT_IDS.trainingAnalysis]: ['gpt-4o', 'gpt-4o-mini'],
  [PROMPT_IDS.programBuilder]: ['gpt-4o', 'gpt-4o-mini'],
  [PROMPT_IDS.releaseNoteDrafter]: ['claude-haiku-4-5-20251001'],
}

export interface OverrideModelLogger {
  warn(message: string, meta?: Record<string, unknown>): void
}

/**
 * Drop a saved model that is not in the prompt's allow-list.
 * Fail-soft + never silent: the override's other fields survive, the model
 * falls back to the built-in default at the call site, and the drop is logged.
 */
export function sanitizeOverrideModel(
  promptId: string,
  override: PromptOverride,
  log: OverrideModelLogger
): PromptOverride {
  if (!override.model) return override
  const allowed = ALLOWED_MODELS[promptId]
  if (!allowed || allowed.includes(override.model)) return override

  log.warn('aiPrompts override model not in allow-list — falling back to built-in default model', {
    promptId,
    savedModel: override.model,
    allowedModels: allowed,
  })
  const { model: _dropped, ...rest } = override
  return rest
}

/**
 * Validate raw Firestore data into a usable override.
 * Empty strings, non-positive numbers and wrong types are dropped so a
 * half-filled admin doc can never break generation — missing fields simply
 * fall back to the built-in defaults at the call site.
 * Returns null when nothing usable remains.
 */
export function parsePromptOverride(data: unknown): PromptOverride | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  const override: PromptOverride = {}

  if (typeof raw.systemPrompt === 'string' && raw.systemPrompt.trim().length > 0) {
    override.systemPrompt = raw.systemPrompt
  }
  if (typeof raw.model === 'string' && raw.model.trim().length > 0) {
    override.model = raw.model.trim()
  }
  if (typeof raw.maxTokens === 'number' && Number.isFinite(raw.maxTokens) && raw.maxTokens > 0) {
    override.maxTokens = Math.floor(raw.maxTokens)
  }

  return Object.keys(override).length > 0 ? override : null
}

/**
 * Replace {{placeholder}} tokens with runtime values.
 * Unknown placeholders are left untouched so a typo in an edited prompt is
 * visible in the output instead of silently becoming an empty string.
 */
export function applyPromptTemplate(
  text: string,
  vars: Record<string, string | number>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  )
}
