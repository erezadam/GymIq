/**
 * promptLibraryScreen.spec.tsx — component tests for /admin/prompts.
 *
 * Renders the screen with a mocked aiPrompts lib and asserts behavior:
 * all 4 prompts render, editing + saving passes the edited values to
 * saveAIPromptConfig, and removing a required {{placeholder}} blocks the save.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { getConfigMock, saveConfigMock, resetConfigMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  saveConfigMock: vi.fn(async () => undefined),
  resetConfigMock: vi.fn(async () => undefined),
}))

vi.mock('@/lib/firebase/aiPrompts', () => ({
  AI_PROMPTS_COLLECTION: 'aiPrompts',
  getAIPromptConfig: getConfigMock,
  saveAIPromptConfig: saveConfigMock,
  resetAIPromptConfig: resetConfigMock,
}))

vi.mock('@/domains/authentication/store', () => ({
  useAuthStore: () => ({ user: { email: 'admin@gymiq.app' } }),
}))

import PromptLibrary from '@/domains/admin/components/PromptLibrary'

beforeEach(() => {
  vi.clearAllMocks()
  getConfigMock.mockResolvedValue(null) // no overrides — defaults everywhere
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

  it('editing the prompt and saving sends the edited values to Firestore', async () => {
    render(<PromptLibrary />)
    fireEvent.click(await screen.findByText('מאמן AI — יצירת אימונים'))

    const textarea = await screen.findByLabelText('פרומפט מערכת — מאמן AI — יצירת אימונים')
    fireEvent.change(textarea, { target: { value: 'פרומפט ערוך לחלוטין' } })

    fireEvent.click(screen.getByRole('button', { name: /שמור פרומפט/ }))

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

    await screen.findByText('נשמר בהצלחה ✓')
  })

  it('blocks saving program_builder when {{daysPerWeek}} was removed', async () => {
    render(<PromptLibrary />)
    fireEvent.click(await screen.findByText('בונה תוכניות AI (מאמן)'))

    const textarea = await screen.findByLabelText('פרומפט מערכת — בונה תוכניות AI (מאמן)')
    fireEvent.change(textarea, { target: { value: 'פרומפט בלי המשתנה הנדרש' } })

    fireEvent.click(screen.getByRole('button', { name: /שמור פרומפט/ }))

    await screen.findByText(/חייב לכלול את המשתנה/)
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
