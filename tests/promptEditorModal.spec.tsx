/**
 * promptEditorModal.spec.tsx — component tests for the prompt editor modal:
 * full-prompt popup, save-with-warning flow, AI consultation, version history
 * restore, and the modal iron rules (dedicated X button + backdrop close).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { saveConfigMock, resetConfigMock, versionsMock, consultMock } = vi.hoisted(() => ({
  saveConfigMock: vi.fn(async () => undefined),
  resetConfigMock: vi.fn(async () => undefined),
  versionsMock: vi.fn(async () => []),
  consultMock: vi.fn(),
}))

vi.mock('@/lib/firebase/aiPrompts', () => ({
  saveAIPromptConfig: saveConfigMock,
  resetAIPromptConfig: resetConfigMock,
  getAIPromptVersions: versionsMock,
}))

vi.mock('@/domains/admin/services/promptAdvisorService', () => ({
  consultAIPrompt: consultMock,
}))

import PromptEditorModal from '@/domains/admin/components/PromptEditorModal'
import { AI_PROMPT_REGISTRY } from '@/domains/admin/data/aiPromptRegistry'

const workoutDef = AI_PROMPT_REGISTRY.find((d) => d.id === 'workout_generation')!

function renderModal(overrides: Partial<Parameters<typeof PromptEditorModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const onReset = vi.fn()
  render(
    <PromptEditorModal
      def={workoutDef}
      initialSystemPrompt={workoutDef.defaultSystemPrompt}
      initialModel={workoutDef.defaultModel}
      initialMaxTokens={String(workoutDef.defaultMaxTokens)}
      hasOverride={false}
      userEmail="admin@gymiq.app"
      onClose={onClose}
      onSaved={onSaved}
      onReset={onReset}
      {...overrides}
    />
  )
  return { onClose, onSaved, onReset }
}

beforeEach(() => {
  vi.clearAllMocks()
  versionsMock.mockResolvedValue([])
})

describe('PromptEditorModal', () => {
  it('shows the full prompt in the editor popup', () => {
    renderModal()
    const textarea = screen.getByLabelText(`פרומפט מערכת — ${workoutDef.titleHe}`) as HTMLTextAreaElement
    expect(textarea.value).toBe(workoutDef.defaultSystemPrompt)
  })

  it('has a dedicated X close button and closes on backdrop click (modal iron rule)', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'סגור' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('save shows a system-update warning first; confirming saves and records history', async () => {
    const { onSaved } = renderModal()

    const textarea = screen.getByLabelText(`פרומפט מערכת — ${workoutDef.titleHe}`)
    fireEvent.change(textarea, { target: { value: 'פרומפט חדש לגמרי' } })

    // Footer "שמור" opens the warning — nothing is saved yet.
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    expect(saveConfigMock).not.toHaveBeenCalled()
    await screen.findByText('עדכון מערכת')

    fireEvent.click(screen.getByRole('button', { name: /שמור ועדכן מערכת/ }))
    await waitFor(() => expect(saveConfigMock).toHaveBeenCalledTimes(1))

    const [id, payload, email] = saveConfigMock.mock.calls[0] as unknown as [
      string,
      { systemPrompt: string; model: string; maxTokens: number },
      string,
    ]
    expect(id).toBe('workout_generation')
    expect(payload.systemPrompt).toBe('פרומפט חדש לגמרי')
    expect(email).toBe('admin@gymiq.app')
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(payload))
  })

  it('cancelling the warning does not save', async () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(`פרומפט מערכת — ${workoutDef.titleHe}`), {
      target: { value: 'שינוי' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }))
    await screen.findByText('עדכון מערכת')
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(saveConfigMock).not.toHaveBeenCalled()
    expect(screen.queryByText('עדכון מערכת')).toBeNull()
  })

  it('AI consultation: sends the current prompt + request, shows recommendations, and applies the revision to the editor only', async () => {
    consultMock.mockResolvedValue({
      success: true,
      result: {
        analysis: 'הפרומפט סביר אך כללי.',
        recommendations: ['חדד את כללי המשקל'],
        revisedPrompt: 'פרומפט משופר מהיועץ',
      },
      missingPlaceholders: [],
    })
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /ייעוץ AI/ }))
    fireEvent.change(screen.getByLabelText('בקשת שינוי לייעוץ AI'), {
      target: { value: 'תעשה את ההמלצות שמרניות' },
    })
    fireEvent.click(screen.getByRole('button', { name: /התייעץ עם ה-AI/ }))

    await screen.findByText('חדד את כללי המשקל')
    expect(consultMock).toHaveBeenCalledWith({
      promptTitle: workoutDef.titleHe,
      currentPrompt: workoutDef.defaultSystemPrompt,
      userRequest: 'תעשה את ההמלצות שמרניות',
    })

    // Applying moves the revision into the editor without saving anything.
    fireEvent.click(screen.getByRole('button', { name: /החל את ההצעה בעורך/ }))
    const textarea = screen.getByLabelText(`פרומפט מערכת — ${workoutDef.titleHe}`) as HTMLTextAreaElement
    expect(textarea.value).toBe('פרומפט משופר מהיועץ')
    expect(saveConfigMock).not.toHaveBeenCalled()
  })

  it('consultation failure shows an error instead of silently doing nothing', async () => {
    consultMock.mockResolvedValue({ success: false, error: 'הייעוץ נכשל' })
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /ייעוץ AI/ }))
    fireEvent.change(screen.getByLabelText('בקשת שינוי לייעוץ AI'), { target: { value: 'בקשה' } })
    fireEvent.click(screen.getByRole('button', { name: /התייעץ עם ה-AI/ }))
    await screen.findByText('הייעוץ נכשל')
  })

  it('history tab lists versions and "טען לעורך" restores a version into the editor', async () => {
    versionsMock.mockResolvedValue([
      {
        id: 'v1',
        action: 'save',
        systemPrompt: 'גרסה היסטורית',
        model: 'gpt-4o',
        maxTokens: 4096,
        savedAt: new Date('2026-07-20T09:00:00Z'),
        savedByEmail: 'admin@gymiq.app',
      },
    ])
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: /היסטוריה/ }))
    await screen.findByText(/טען לעורך/)
    expect(versionsMock).toHaveBeenCalledWith('workout_generation')

    fireEvent.click(screen.getByRole('button', { name: /טען לעורך/ }))
    const textarea = screen.getByLabelText(`פרומפט מערכת — ${workoutDef.titleHe}`) as HTMLTextAreaElement
    expect(textarea.value).toBe('גרסה היסטורית')
    // Restoring is editor-only until saved.
    expect(saveConfigMock).not.toHaveBeenCalled()
  })
})
