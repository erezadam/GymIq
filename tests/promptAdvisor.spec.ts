/**
 * promptAdvisor.spec.ts — behavior tests for the AI prompt advisor pure
 * helpers (functions/src/ai-prompt-advisor/promptAdvisor.ts).
 *
 * The Cloud Function itself is a thin onCall wrapper (auth check + OpenAI
 * call); the parse/validate/placeholder logic that can silently corrupt a
 * prompt lives here and is tested directly.
 */

import { describe, it, expect } from 'vitest'
import {
  buildAdvisorUserPrompt,
  parseAdvisorResponse,
  findMissingPlaceholders,
} from '../functions/src/ai-prompt-advisor/promptAdvisor'

describe('parseAdvisorResponse', () => {
  const valid = {
    analysis: 'הפרומפט טוב אבל חסרה הגבלה.',
    recommendations: ['הוסף כלל 1', 'חדד את סעיף המשקל'],
    revisedPrompt: 'פרומפט מתוקן מלא',
  }

  it('parses a valid JSON payload', () => {
    expect(parseAdvisorResponse(JSON.stringify(valid))).toEqual(valid)
  })

  it('strips accidental markdown fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(valid) + '\n```'
    expect(parseAdvisorResponse(fenced)).toEqual(valid)
  })

  it('throws on missing/empty revisedPrompt instead of returning a broken suggestion', () => {
    expect(() => parseAdvisorResponse(JSON.stringify({ ...valid, revisedPrompt: '' }))).toThrow()
    expect(() => parseAdvisorResponse(JSON.stringify({ analysis: 'x', recommendations: ['y'] }))).toThrow()
  })

  it('throws when recommendations contain non-strings', () => {
    expect(() =>
      parseAdvisorResponse(JSON.stringify({ ...valid, recommendations: ['ok', 42] }))
    ).toThrow()
  })
})

describe('findMissingPlaceholders', () => {
  it('flags placeholders the revision dropped', () => {
    expect(
      findMissingPlaceholders('בנה {{daysPerWeek}} ימים', 'פרומפט חדש בלי המשתנה')
    ).toEqual(['{{daysPerWeek}}'])
  })

  it('returns empty when all placeholders survive (or none exist)', () => {
    expect(
      findMissingPlaceholders('בנה {{daysPerWeek}} ימים', 'עדיין {{daysPerWeek}} כאן')
    ).toEqual([])
    expect(findMissingPlaceholders('בלי משתנים', 'עדיין בלי')).toEqual([])
  })
})

describe('buildAdvisorUserPrompt', () => {
  it('embeds the feature title, the admin request and the current prompt', () => {
    const prompt = buildAdvisorUserPrompt('מאמן AI', 'הפרומפט הנוכחי כאן', 'תעשה אותו שמרני יותר')
    expect(prompt).toContain('מאמן AI')
    expect(prompt).toContain('הפרומפט הנוכחי כאן')
    expect(prompt).toContain('תעשה אותו שמרני יותר')
  })
})
