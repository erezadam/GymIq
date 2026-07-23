/**
 * promptLibraryScreen.spec.tsx — component tests for /admin/prompts.
 *
 * The screen now renders compact cards; clicking a card opens the full
 * editor modal (PromptEditorModal — covered in depth by its own spec).
 * Here we assert the list rendering, the card→modal flow, the placeholder
 * validation gate, and the end-to-end save through the warning modal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { getConfigMock, saveConfigMock, resetConfigMock, versionsMock, consultMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  saveConfigMock: vi.fn(async () => undefined),
  resetConfigMock: vi.fn(async () => undefined),
  versionsMock: vi.fn(async () => []),
  consultMock: vi.fn(),
}))

vi.mock('@/lib/firebase/aiPrompts', () => ({
  AI_PROMPTS_COLLECTION: 'aiPrompts',
  getAIPromptConfig: getConfigMock,
  saveAIPromptConfig: saveConfigMock,
  resetAIPromptConfig: resetConfigMock,
  getAIPromptVersions: versionsMock,
}))

vi.mock('@/domains/admin/services/promptAdvisorService', () => ({
  consultAIPrompt: consultMock,
}))

vi.mock('@/domains/authentication/store', () => ({
  useAuthStore: () => ({ user: { email: 'admin@gymiq.app' } }),
}))

import PromptLibrary from '@/domains/admin/components/PromptLibrary'

beforeEach(() => {
  vi.clearAllMocks()
  getConfigMock.mockResolvedValue(null) // no overrides — defaults everywhere
  versionsMock.mockResolvedValue([])
})

describe('PromptLibrary screen', () => {
  it('renders all 4 prompts with their default models', async () => {
    render(<PromptLibrary />)

    await screen.findByText('מאמן AI — יצירת אימונים')
    expect(screen.getByText('ניתוח אימונים שבועי')).toBeTruthy()
    expect(screen.getByText('בונה תוכניות AI (מאמן)')).toBeTruthy()
    expect(screen.getByText('מנסח "מה חדש" (עדכוני גרסה)')).toBeTruthy()

    // Default status badges (no overrides saved).
    expect(screen.getAllByText('ברירת מחדל')).toHaveLength(4)
    expect(screen.getByText(/gpt-4o-mini/)).toBeTruthy()
    expect(screen.getByText(/claude-haiku-4-5-20251001/)).toBeTruthy()
  })

  it('clicking a card opens the full-prompt editor popup; saving goes through the warning modal', async () => {
    render(<PromptLibrary />)
    fireEvent.click(await screen.findByText('מאמן AI — יצירת אימונים'))

    const textarea = await screen.findByLabelText('פרומפט מערכת — מאמן AI — יצירת אימונים')
    expect((textarea as HTMLTextAreaElement).value.length).toBeGreaterThan(100) // full prompt shown

    fireEvent.change(textarea, { target: { value: 'פרומפט ערוך לחלוטין' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))

    // Warning gate before anything is written.
    await screen.findByText('עדכון מערכת')
    expect(saveConfigMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /שמור ועדכן מערכת/ }))
    await waitFor(() => expect(saveConfigMock).toHaveBeenCalledTimes(1))

    const [id, payload, email] = saveConfigMock.mock.calls[0] as unknown as [
      string,
      { systemPrompt: string; model: string; maxTokens: number },
      string,
    ]
    expect(id).toBe('workout_generation')
    expect(payload.systemPrompt).toBe('פרומפט ערוך לחלוטין')
    expect(payload.model).toBe('gpt-4o-mini')
    expect(payload.maxTokens).toBe(8192)
    expect(email).toBe('admin@gymiq.app')
  })

  it('blocks saving program_builder when {{daysPerWeek}} was removed', async () => {
    render(<PromptLibrary />)
    fireEvent.click(await screen.findByText('בונה תוכניות AI (מאמן)'))

    const textarea = await screen.findByLabelText('פרומפט מערכת — בונה תוכניות AI (מאמן)')
    fireEvent.change(textarea, { target: { value: 'פרומפט בלי המשתנה הנדרש' } })

    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))

    await screen.findByText(/חייב לכלול את המשתנה/)
    expect(screen.queryByText('עדכון מערכת')).toBeNull() // warning never opened
    expect(saveConfigMock).not.toHaveBeenCalled()
  })

  it('shows a stored override as "מותאם אישית" with its values', async () => {
    getConfigMock.mockImplementation(async (id: string) =>
      id === 'training_analysis'
        ? { systemPrompt: 'פרומפט מותאם', model: 'gpt-4.1', maxTokens: 2048 }
        : null
    )

    render(<PromptLibrary />)

    await screen.findByText('מותאם אישית')
    expect(screen.getByText(/gpt-4\.1/)).toBeTruthy()
    expect(screen.getAllByText('ברירת מחדל')).toHaveLength(3)
  })
})
