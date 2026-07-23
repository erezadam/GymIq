/**
 * Behavioral tests for the model allow-list safe-fallback (pure server module).
 * Contract: a saved aiPrompts model outside the prompt's allow-list must be
 * dropped (→ built-in default at the call site), never crash generation, and
 * never be dropped silently (warn log required).
 */
import { describe, it, expect, vi } from 'vitest'
import {
  ALLOWED_MODELS,
  PROMPT_IDS,
  sanitizeOverrideModel,
} from '../functions/src/shared/promptOverrides'

const log = () => ({ warn: vi.fn() })

describe('sanitizeOverrideModel', () => {
  it('keeps an allowed model untouched and does not warn', () => {
    const logger = log()
    const override = { systemPrompt: 'p', model: 'gpt-4o', maxTokens: 100 }
    const result = sanitizeOverrideModel(PROMPT_IDS.workoutGeneration, override, logger)
    expect(result).toEqual(override)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('drops a model outside the allow-list, keeps other fields, and warns', () => {
    const logger = log()
    const result = sanitizeOverrideModel(
      PROMPT_IDS.workoutGeneration,
      { systemPrompt: 'p', model: 'gpt-5-legacy-free-text', maxTokens: 100 },
      logger
    )
    expect(result.model).toBeUndefined()
    expect(result.systemPrompt).toBe('p')
    expect(result.maxTokens).toBe(100)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('allow-list'),
      expect.objectContaining({
        promptId: PROMPT_IDS.workoutGeneration,
        savedModel: 'gpt-5-legacy-free-text',
      })
    )
  })

  it('a model-only override with a bad model collapses to an empty object (caller → full defaults)', () => {
    const result = sanitizeOverrideModel(
      PROMPT_IDS.releaseNoteDrafter,
      { model: 'claude-3-haiku-20240307' },
      log()
    )
    expect(result).toEqual({})
  })

  it('an override without a model passes through untouched', () => {
    const logger = log()
    const override = { systemPrompt: 'p' }
    expect(sanitizeOverrideModel(PROMPT_IDS.programBuilder, override, logger)).toEqual(override)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('cross-provider mixups are rejected (Claude model on an OpenAI prompt and vice versa)', () => {
    expect(
      sanitizeOverrideModel(
        PROMPT_IDS.trainingAnalysis,
        { model: 'claude-haiku-4-5-20251001' },
        log()
      ).model
    ).toBeUndefined()
    expect(
      sanitizeOverrideModel(PROMPT_IDS.releaseNoteDrafter, { model: 'gpt-4o' }, log()).model
    ).toBeUndefined()
  })

  it('every allow-list is non-empty', () => {
    for (const [id, models] of Object.entries(ALLOWED_MODELS)) {
      expect(models.length, `allow-list for ${id}`).toBeGreaterThan(0)
    }
  })
})
