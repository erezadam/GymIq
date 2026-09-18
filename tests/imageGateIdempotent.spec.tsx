/**
 * PR-H client guards: in-flight lock in useExerciseDraft.generateImage,
 * ImageGate lock/preview/regenerate behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const generateImageMock = vi.fn()
vi.mock('@/domains/admin/services/exerciseDraftService', () => ({
  generateExerciseDraft: vi.fn(async () => ({ draftId: 'd1' })),
  generateExerciseImage: (...args: any[]) => generateImageMock(...args),
  markDraftSaved: vi.fn(async () => ({ ok: true })),
  subscribeToDraft: vi.fn(() => () => {}),
}))

import { useExerciseDraft } from '@/domains/admin/components/ExerciseForm/useExerciseDraft'
import { ImageGate } from '@/domains/admin/components/ExerciseForm/ImageGate'

function HookHarness() {
  const d = useExerciseDraft()
  return (
    <div>
      <button onClick={() => void d.generateDraft({ name: 'x' })}>mk</button>
      <button onClick={() => void d.generateImage()}>gen</button>
      <button onClick={() => void d.generateImage(true)}>regen</button>
    </div>
  )
}

beforeEach(() => {
  sessionStorage.clear()
  generateImageMock.mockReset()
})

describe('useExerciseDraft.generateImage — in-flight guard', () => {
  it('double click fires the callable exactly once', async () => {
    let release!: () => void
    generateImageMock.mockImplementation(
      () => new Promise((r) => { release = () => r({ ok: true }) })
    )
    render(<HookHarness />)
    await act(async () => { fireEvent.click(screen.getByText('mk')) })
    fireEvent.click(screen.getByText('gen'))
    fireEvent.click(screen.getByText('gen'))
    expect(generateImageMock).toHaveBeenCalledTimes(1)
    await act(async () => { release() })
  })

  it('regenerate sends {regenerate:true}', async () => {
    generateImageMock.mockResolvedValue({ ok: true })
    render(<HookHarness />)
    await act(async () => { fireEvent.click(screen.getByText('mk')) })
    await act(async () => { fireEvent.click(screen.getByText('regen')) })
    expect(generateImageMock).toHaveBeenCalledWith({ draftId: 'd1', regenerate: true })
  })
})

describe('ImageGate', () => {
  const image = { url: 'https://x/img.webp', bytes: 5, costUsd: 0.1 } as any

  it('locks with a spinner while imageGenerating, even before the doc flips to pending', () => {
    render(
      <ImageGate status={'draft_ready' as any} image={null} imageGenerating approved={false}
        onGenerate={vi.fn()} onApprove={vi.fn()} />
    )
    expect(screen.getByText('יוצר… עד 2 דקות')).toBeTruthy()
    expect(screen.queryByText('צור תמונה (התחלה/סיום)')).toBeNull()
  })

  it('image_ready shows the img with the url and approve fills it', () => {
    const onApprove = vi.fn()
    render(
      <ImageGate status={'image_ready' as any} image={image} imageGenerating={false} approved={false}
        onGenerate={vi.fn()} onApprove={onApprove} />
    )
    expect(document.querySelector('img')?.getAttribute('src')).toBe('https://x/img.webp')
    fireEvent.click(screen.getByText('אשר'))
    expect(onApprove).toHaveBeenCalledWith('https://x/img.webp')
  })

  it('approved shows "מולא" instead of the approve button; regenerate passes true', () => {
    const onGenerate = vi.fn()
    render(
      <ImageGate status={'image_ready' as any} image={image} imageGenerating={false} approved
        onGenerate={onGenerate} onApprove={vi.fn()} />
    )
    expect(screen.getByText('מולא')).toBeTruthy()
    expect(screen.queryByText('אשר')).toBeNull()
    fireEvent.click(screen.getByText('ייצר מחדש'))
    expect(onGenerate).toHaveBeenCalledWith(true)
  })
})
