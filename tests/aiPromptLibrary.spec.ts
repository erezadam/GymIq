/**
 * aiPromptLibrary.spec.ts — behavior tests for the admin AI prompt library.
 *
 * Covers:
 *  - client Firestore access (src/lib/firebase/aiPrompts.ts): payload
 *    sanitation per the no-undefined iron rule, merge semantics, read/reset.
 *  - server-side pure helpers (functions/src/shared/promptOverrides.ts):
 *    override parsing (a half-filled admin doc must never break generation)
 *    and {{placeholder}} templating used by program_builder.
 *  - registry integrity: the program_builder default must carry the
 *    {{daysPerWeek}} placeholder the server resolves at runtime.
 *
 * All assertions are mock + call-args (behavioral), not source-grep.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDocMock = vi.fn()
const setDocMock = vi.fn(async () => undefined)
const deleteDocMock = vi.fn(async () => undefined)
const addDocMock = vi.fn(async () => ({ id: 'version-1' }))
const getDocsMock = vi.fn(async () => ({ docs: [] }))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  getDoc: getDocMock,
  getDocs: getDocsMock,
  setDoc: setDocMock,
  addDoc: addDocMock,
  deleteDoc: deleteDocMock,
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

beforeEach(() => {
  getDocMock.mockReset()
  setDocMock.mockClear()
  deleteDocMock.mockClear()
  addDocMock.mockClear()
  getDocsMock.mockClear()
})

describe('saveAIPromptConfig', () => {
  it('writes systemPrompt/model/maxTokens with merge:true and an updatedAt stamp', async () => {
    const { saveAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    await saveAIPromptConfig(
      'workout_generation',
      { systemPrompt: 'פרומפט חדש', model: 'gpt-4o', maxTokens: 4096 },
      'admin@gymiq.app'
    )

    expect(setDocMock).toHaveBeenCalledTimes(1)
    const [, payload, options] = setDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>, Record<string, unknown>]
    expect(payload.systemPrompt).toBe('פרומפט חדש')
    expect(payload.model).toBe('gpt-4o')
    expect(payload.maxTokens).toBe(4096)
    expect(payload.updatedByEmail).toBe('admin@gymiq.app')
    expect(payload.updatedAt).toBeInstanceOf(Date)
    expect(options).toEqual({ merge: true })
  })

  it('never sends undefined fields to Firestore (iron rule)', async () => {
    const { saveAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    await saveAIPromptConfig(
      'training_analysis',
      { systemPrompt: 'פרומפט', model: 'gpt-4o', maxTokens: undefined },
      undefined
    )

    const [, payload] = setDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>]
    expect('maxTokens' in payload).toBe(false)
    expect('updatedByEmail' in payload).toBe(false)
    expect(Object.values(payload)).not.toContain(undefined)
  })
})

describe('getAIPromptConfig', () => {
  it('returns null when no override doc exists', async () => {
    getDocMock.mockResolvedValue({ exists: () => false })
    const { getAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    expect(await getAIPromptConfig('program_builder')).toBeNull()
  })

  it('returns the stored override when the doc exists', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ systemPrompt: 'ערוך', model: 'gpt-4.1', maxTokens: 2048 }),
    })
    const { getAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    const config = await getAIPromptConfig('release_note_drafter')
    expect(config).toEqual({ systemPrompt: 'ערוך', model: 'gpt-4.1', maxTokens: 2048 })
  })
})

describe('resetAIPromptConfig', () => {
  it('deletes the override doc and records the reset in the version history', async () => {
    const { resetAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    await resetAIPromptConfig('workout_generation', 'admin@gymiq.app')
    expect(deleteDocMock).toHaveBeenCalledTimes(1)

    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, versionPayload] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>]
    expect(versionPayload.action).toBe('reset')
    expect(versionPayload.savedByEmail).toBe('admin@gymiq.app')
    expect(versionPayload.savedAt).toBeInstanceOf(Date)
  })
})

describe('version history', () => {
  it('every save appends a version doc with the saved state (audit + restore)', async () => {
    const { saveAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    await saveAIPromptConfig(
      'program_builder',
      { systemPrompt: 'גרסה 2', model: 'gpt-4o', maxTokens: 8192 },
      'admin@gymiq.app'
    )

    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, versionPayload] = addDocMock.mock.calls[0] as unknown as [unknown, Record<string, unknown>]
    expect(versionPayload.action).toBe('save')
    expect(versionPayload.systemPrompt).toBe('גרסה 2')
    expect(versionPayload.model).toBe('gpt-4o')
    expect(versionPayload.maxTokens).toBe(8192)
    expect(versionPayload.savedByEmail).toBe('admin@gymiq.app')
    expect(versionPayload.savedAt).toBeInstanceOf(Date)
    expect(Object.values(versionPayload)).not.toContain(undefined)
  })

  it('a history write failure does not fail the save itself (override already live)', async () => {
    addDocMock.mockRejectedValueOnce(new Error('permission-denied'))
    const { saveAIPromptConfig } = await import('../src/lib/firebase/aiPrompts')
    await expect(
      saveAIPromptConfig('workout_generation', { systemPrompt: 'פ', model: 'm', maxTokens: 1 })
    ).resolves.toBeUndefined()
    expect(setDocMock).toHaveBeenCalledTimes(1)
  })

  it('getAIPromptVersions maps docs (newest-first query) including Timestamp savedAt', async () => {
    const toDate = () => new Date('2026-07-23T10:00:00Z')
    getDocsMock.mockResolvedValueOnce({
      docs: [
        {
          id: 'v2',
          data: () => ({ action: 'save', systemPrompt: 'ב', model: 'gpt-4o', maxTokens: 100, savedAt: { toDate }, savedByEmail: 'a@b.c' }),
        },
        { id: 'v1', data: () => ({ action: 'reset', savedAt: { toDate } }) },
      ],
    } as never)

    const { getAIPromptVersions } = await import('../src/lib/firebase/aiPrompts')
    const versions = await getAIPromptVersions('workout_generation')

    expect(versions).toHaveLength(2)
    expect(versions[0]).toMatchObject({ id: 'v2', action: 'save', systemPrompt: 'ב', model: 'gpt-4o' })
    expect(versions[0].savedAt).toBeInstanceOf(Date)
    expect(versions[1].action).toBe('reset')
  })
})

describe('parsePromptOverride (server-side, pure)', () => {
  it('accepts a full valid doc', async () => {
    const { parsePromptOverride } = await import('../functions/src/shared/promptOverrides')
    expect(
      parsePromptOverride({ systemPrompt: 'פרומפט', model: ' gpt-4o ', maxTokens: 1000.7 })
    ).toEqual({ systemPrompt: 'פרומפט', model: 'gpt-4o', maxTokens: 1000 })
  })

  it('drops empty/invalid fields and returns null when nothing usable remains', async () => {
    const { parsePromptOverride } = await import('../functions/src/shared/promptOverrides')
    expect(parsePromptOverride({ systemPrompt: '   ', model: '', maxTokens: -5 })).toBeNull()
    expect(parsePromptOverride(null)).toBeNull()
    expect(parsePromptOverride('not-an-object')).toBeNull()
    expect(parsePromptOverride({ maxTokens: Infinity })).toBeNull()
  })

  it('keeps partial docs partial — model-only override leaves prompt to the built-in default', async () => {
    const { parsePromptOverride } = await import('../functions/src/shared/promptOverrides')
    const override = parsePromptOverride({ model: 'gpt-4o-mini' })
    expect(override).toEqual({ model: 'gpt-4o-mini' })
    expect(override?.systemPrompt).toBeUndefined()
  })
})

describe('applyPromptTemplate (server-side, pure)', () => {
  it('substitutes {{daysPerWeek}} with the runtime value', async () => {
    const { applyPromptTemplate } = await import('../functions/src/shared/promptOverrides')
    expect(applyPromptTemplate('בנה בדיוק {{daysPerWeek}} ימי אימון.', { daysPerWeek: 4 })).toBe(
      'בנה בדיוק 4 ימי אימון.'
    )
  })

  it('leaves unknown placeholders visible instead of silently blanking them', async () => {
    const { applyPromptTemplate } = await import('../functions/src/shared/promptOverrides')
    expect(applyPromptTemplate('ערך: {{typoVar}}', { daysPerWeek: 3 })).toBe('ערך: {{typoVar}}')
  })
})

describe('AI prompt registry integrity', () => {
  it('has 4 unique prompt definitions with non-empty defaults', async () => {
    const { AI_PROMPT_REGISTRY } = await import('../src/domains/admin/data/aiPromptRegistry')
    expect(AI_PROMPT_REGISTRY).toHaveLength(4)
    expect(new Set(AI_PROMPT_REGISTRY.map((d) => d.id)).size).toBe(4)
    for (const def of AI_PROMPT_REGISTRY) {
      expect(def.defaultSystemPrompt.trim().length).toBeGreaterThan(0)
      expect(def.defaultModel.trim().length).toBeGreaterThan(0)
      expect(def.defaultMaxTokens).toBeGreaterThan(0)
    }
  })

  it('program_builder default carries the {{daysPerWeek}} placeholder and the server resolves it', async () => {
    const { AI_PROMPT_REGISTRY } = await import('../src/domains/admin/data/aiPromptRegistry')
    const { applyPromptTemplate } = await import('../functions/src/shared/promptOverrides')
    const programBuilder = AI_PROMPT_REGISTRY.find((d) => d.id === 'program_builder')!
    expect(programBuilder.defaultSystemPrompt).toContain('{{daysPerWeek}}')

    const resolved = applyPromptTemplate(programBuilder.defaultSystemPrompt, { daysPerWeek: 5 })
    expect(resolved).toContain('בנה בדיוק 5 ימי אימון')
    expect(resolved).not.toContain('{{daysPerWeek}}')
  })
})
