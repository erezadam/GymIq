/**
 * machineLens.spec.tsx — behavioral tests for the Machine Lens client feature.
 *
 * Covers:
 * (a) sheet with 2 matches renders Hebrew names; clicking a card calls the
 *     select callback with the exercise id
 * (b) "no match" state shows the labelText + copy button
 * (c) error state shows the Hebrew error message
 * (d) hook-level: the service is mocked; resource-exhausted maps to the
 *     quota message (mock + assert, not source-grep)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'

const { identifyMachineMock, compressImageMock } = vi.hoisted(() => ({
  identifyMachineMock: vi.fn(),
  compressImageMock: vi.fn(),
}))

vi.mock('@/domains/exercises/services/machineLensService', () => ({
  identifyMachine: identifyMachineMock,
}))

vi.mock('@/lib/firebase/traineePhotoStorage', () => ({
  compressImage: compressImageMock,
}))

import { MachineLensSheet } from '@/domains/exercises/components/MachineLens/MachineLensSheet'
import { useMachineLens } from '@/domains/exercises/components/MachineLens/useMachineLens'
import type { MachineLensResponse } from '@/domains/exercises/services/machineLensService'

const baseResult: MachineLensResponse = {
  labelText: 'Lat Pulldown',
  machineType: 'מכונת פולי עליון',
  equipmentId: 'cable',
  confidence: 0.92,
  matches: [
    {
      id: 'ex-1',
      name: 'Lat Pulldown',
      nameHe: 'פולי עליון',
      imageUrl: 'https://example.com/1.jpg',
      score: 0.9,
      reasons: ['אחיזה רחבה'],
    },
    {
      id: 'ex-2',
      name: 'Close Grip Pulldown',
      nameHe: 'פולי עליון אחיזה צרה',
      imageUrl: 'https://example.com/2.jpg',
      score: 0.7,
      reasons: ['אחיזה צרה'],
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MachineLensSheet', () => {
  it('renders 2 matches with Hebrew names; clicking a card calls onSelectExercise with the id', () => {
    const onSelect = vi.fn()
    render(
      <MachineLensSheet
        isOpen
        loading={false}
        error={null}
        result={baseResult}
        onClose={() => {}}
        onSelectExercise={onSelect}
      />
    )

    expect(screen.getByText('פולי עליון')).toBeTruthy()
    expect(screen.getByText('פולי עליון אחיזה צרה')).toBeTruthy()
    expect(screen.getByText(/זיהינו: Lat Pulldown/)).toBeTruthy()

    fireEvent.click(screen.getByText('פולי עליון אחיזה צרה'))
    expect(onSelect).toHaveBeenCalledWith('ex-2')
  })

  it('no-match state shows labelText and a copy button', () => {
    render(
      <MachineLensSheet
        isOpen
        loading={false}
        error={null}
        result={{ ...baseResult, matches: [] }}
        onClose={() => {}}
        onSelectExercise={() => {}}
      />
    )

    expect(screen.getByText('לא נמצא תרגיל מתאים')).toBeTruthy()
    // labelText shown both in headline and in the no-match block
    expect(screen.getAllByText(/Lat Pulldown/).length).toBeGreaterThan(0)
    expect(screen.getByText('העתק שם')).toBeTruthy()
  })

  it('error state shows the Hebrew error message', () => {
    render(
      <MachineLensSheet
        isOpen
        loading={false}
        error="הזיהוי נכשל — נסה שוב"
        result={null}
        onClose={() => {}}
        onSelectExercise={() => {}}
      />
    )

    expect(screen.getByText('הזיהוי נכשל — נסה שוב')).toBeTruthy()
  })

  it('closes via the dedicated X button and via backdrop click', () => {
    const onClose = vi.fn()
    render(
      <MachineLensSheet
        isOpen
        loading={false}
        error={null}
        result={baseResult}
        onClose={onClose}
        onSelectExercise={() => {}}
      />
    )

    fireEvent.click(screen.getByLabelText('סגור'))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('machine-lens-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('useMachineLens', () => {
  function fakeFile() {
    return new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
  }

  function stubCompression() {
    // Blob whose FileReader.readAsDataURL yields a data: URL with a prefix
    compressImageMock.mockResolvedValue(new Blob(['abc'], { type: 'image/jpeg' }))
  }

  it('calls the service with base64 (no data: prefix) and stores the result', async () => {
    stubCompression()
    identifyMachineMock.mockResolvedValue(baseResult)

    const { result } = renderHook(() => useMachineLens())
    await act(async () => {
      await result.current.identify(fakeFile())
    })

    await waitFor(() => expect(result.current.result).toEqual(baseResult))
    expect(identifyMachineMock).toHaveBeenCalledTimes(1)
    const arg = identifyMachineMock.mock.calls[0][0]
    expect(arg.mimeType).toBe('image/jpeg')
    expect(arg.imageBase64).not.toContain('data:')
    expect(arg.imageBase64.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('maps resource-exhausted to the daily-quota Hebrew message', async () => {
    stubCompression()
    identifyMachineMock.mockRejectedValue(
      Object.assign(new Error('quota'), { code: 'functions/resource-exhausted' })
    )

    const { result } = renderHook(() => useMachineLens())
    await act(async () => {
      await result.current.identify(fakeFile())
    })

    await waitFor(() =>
      expect(result.current.error).toBe('הגעת למכסת הזיהויים היומית (20)')
    )
    expect(result.current.result).toBeNull()
  })

  it('maps any other failure to the generic Hebrew message', async () => {
    stubCompression()
    identifyMachineMock.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useMachineLens())
    await act(async () => {
      await result.current.identify(fakeFile())
    })

    await waitFor(() =>
      expect(result.current.error).toBe('הזיהוי נכשל — נסה שוב')
    )
  })
})
