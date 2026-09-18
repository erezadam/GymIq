/**
 * adminDraftFlow.spec.tsx — behavioral tests for the admin AI draft flow
 * (DraftPanel + form fill + SimilarExercisesCard + ImageGate + photo path).
 *
 * Services are mocked (mock + assert, not source-grep) following the
 * aiTrainerModalSelector.spec.tsx pattern.
 *
 * Covers:
 * (a) draft_ready fills the form (name/category/equipment)
 * (b) similar exercises are rendered
 * (c) image_ready + "אשר" → imageUrl in the form
 * (d) failed shows an error
 * (e) photo path with score>=6 shows "already exists" and does not fill the
 *     name until "צור בכל זאת"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const {
  generateDraftMock,
  generateImageMock,
  markSavedMock,
  subscribeMock,
  identifyMachineMock,
  compressImageMock,
  uploadBytesMock,
} = vi.hoisted(() => ({
  generateDraftMock: vi.fn(),
  generateImageMock: vi.fn(),
  markSavedMock: vi.fn(),
  subscribeMock: vi.fn(),
  identifyMachineMock: vi.fn(),
  compressImageMock: vi.fn(),
  uploadBytesMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}))

vi.mock('@/domains/admin/services/exerciseDraftService', () => ({
  generateExerciseDraft: generateDraftMock,
  generateExerciseImage: generateImageMock,
  markDraftSaved: markSavedMock,
  subscribeToDraft: subscribeMock,
}))

vi.mock('@/domains/exercises/services/machineLensService', () => ({
  identifyMachine: identifyMachineMock,
}))

vi.mock('@/lib/firebase/traineePhotoStorage', () => ({
  compressImage: compressImageMock,
}))

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: uploadBytesMock,
}))

vi.mock('@/lib/firebase/config', () => ({
  app: {},
  db: {},
  auth: {},
  storage: {},
}))

vi.mock('@/domains/exercises/services', () => ({
  exerciseService: {
    getExerciseById: vi.fn(),
    createExercise: vi.fn(),
    updateExercise: vi.fn(),
  },
}))

vi.mock('@/lib/firebase/equipment', () => ({
  getEquipment: vi.fn().mockResolvedValue([
    { id: 'machine', name: 'Machine', nameHe: 'מכונה' },
  ]),
}))

vi.mock('@/lib/firebase/muscles', () => ({
  getMuscles: vi.fn().mockResolvedValue([
    {
      id: 'chest',
      nameHe: 'חזה',
      subMuscles: [{ id: 'mid_chest', nameHe: 'חזה אמצעי' }],
    },
  ]),
}))

vi.mock('@/lib/firebase/reportTypes', () => ({
  getActiveReportTypes: vi.fn().mockResolvedValue([
    { id: 'weight_reps', nameHe: 'משקל וחזרות' },
  ]),
}))

vi.mock('@/lib/firebase/bandTypes', () => ({
  getActiveBandTypes: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/firebase/exercises', () => ({
  SUB_MUSCLE_TO_CATEGORY: {},
}))

vi.mock('@/shared/components/ExerciseMedia', () => ({
  ExerciseMedia: () => <div data-testid="exercise-media" />,
}))

import ExerciseForm from '@/domains/admin/components/ExerciseForm'

type DraftDoc = Record<string, unknown>
let snapshotCb: ((doc: DraftDoc | null) => void) | null = null

const sampleDraft = {
  name: 'Machine Chest Press',
  nameHe: 'לחיצת חזה במכונה',
  category: 'chest',
  primaryMuscle: 'mid_chest',
  secondaryMuscles: [],
  secondaryMuscleCredits: [],
  equipment: 'machine',
  difficulty: 'beginner',
  complexity: 'compound',
  reportType: 'weight_reps',
  assistanceTypes: [],
  availableBands: [],
  instructions: ['Press the handles forward'],
  instructionsHe: ['דחוף את הידיות קדימה'],
  tips: [],
  tipsHe: [],
  targetMuscles: [],
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ExerciseForm />
    </QueryClientProvider>
  )
}

async function startDraft() {
  renderForm()
  const nameInput = await screen.findByPlaceholderText(/לחיצת חזה במכונה \/ Chest Press/)
  fireEvent.change(nameInput, { target: { value: 'Chest Press' } })
  fireEvent.click(screen.getByRole('button', { name: /צור טיוטה ב-AI/ }))
  await waitFor(() => expect(generateDraftMock).toHaveBeenCalled())
  await waitFor(() => expect(subscribeMock).toHaveBeenCalledWith(
    'draft-1',
    expect.any(Function),
    expect.any(Function)
  ))
}

beforeEach(() => {
  vi.clearAllMocks()
  snapshotCb = null
  generateDraftMock.mockResolvedValue({ draftId: 'draft-1' })
  generateImageMock.mockResolvedValue({ ok: true })
  markSavedMock.mockResolvedValue({ ok: true })
  subscribeMock.mockImplementation((_id: string, cb: (d: DraftDoc | null) => void) => {
    snapshotCb = cb
    return () => {}
  })
})

describe('admin AI draft flow', () => {
  it('(a) draft_ready fills the form: name, category, equipment', async () => {
    await startDraft()

    act(() => snapshotCb!({ status: 'draft_ready', draft: sampleDraft }))

    await waitFor(() => {
      const formName = screen.getByPlaceholderText('Bench Press') as HTMLInputElement
      expect(formName.value).toBe('Machine Chest Press')
    })
    const nameHe = screen.getByPlaceholderText('לחיצת חזה') as HTMLInputElement
    expect(nameHe.value).toBe('לחיצת חזה במכונה')

    // Category select holds 'chest', equipment select holds 'machine'
    const selects = document.querySelectorAll('select')
    const values = Array.from(selects).map((s) => (s as HTMLSelectElement).value)
    expect(values).toContain('chest')
    expect(values).toContain('machine')
  })

  it('(b) similar exercises are rendered with links', async () => {
    await startDraft()

    act(() =>
      snapshotCb!({
        status: 'draft_ready',
        draft: sampleDraft,
        similar: [
          { id: 'ex-9', name: 'Bench Press', nameHe: 'לחיצת חזה במוט', score: 5, reasons: ['אותו דפוס תנועה'] },
        ],
      })
    )

    await screen.findByText(/לחיצת חזה במוט/)
    const link = screen.getByText(/לחיצת חזה במוט/).closest('a')
    expect(link?.getAttribute('href')).toBe('/admin/exercises/ex-9/edit')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(screen.getByText(/אותו דפוס תנועה/)).toBeTruthy()
  })

  it('(c) image_ready + approve puts image.url into the form imageUrl', async () => {
    await startDraft()
    act(() => snapshotCb!({ status: 'draft_ready', draft: sampleDraft }))

    // Generate image
    const genBtn = await screen.findByRole('button', { name: /צור תמונה/ })
    fireEvent.click(genBtn)
    await waitFor(() =>
      expect(generateImageMock).toHaveBeenCalledWith({ draftId: 'draft-1' })
    )

    act(() => snapshotCb!({ status: 'image_pending', draft: sampleDraft }))
    expect(screen.getByText(/עד 2 דקות/)).toBeTruthy()

    act(() =>
      snapshotCb!({
        status: 'image_ready',
        draft: sampleDraft,
        image: {
          url: 'https://example.com/final.webp',
          endUrl: 'https://example.com/end.png',
          startUrl: 'https://example.com/start.png',
          bytes: 1000,
          costUsd: 0.02,
        },
      })
    )

    fireEvent.click(await screen.findByRole('button', { name: /^אשר$/ }))
    const imageUrlInput = screen.getByPlaceholderText('https://example.com/image.jpg') as HTMLInputElement
    expect(imageUrlInput.value).toBe('https://example.com/final.webp')
  })

  it('(d) failed shows the error message', async () => {
    await startDraft()
    act(() => snapshotCb!({ status: 'failed', error: 'יצירת הטיוטה נכשלה' }))
    await screen.findByText('יצירת הטיוטה נכשלה')
  })

  it('(e) photo with score>=6 shows "already exists" and does not fill the name until override', async () => {
    compressImageMock.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
    uploadBytesMock.mockResolvedValue({})
    identifyMachineMock.mockResolvedValue({
      labelText: 'Chest Press',
      machineType: 'מכונת לחיצת חזה',
      equipmentId: 'machine',
      confidence: 0.9,
      matches: [
        {
          id: 'ex-1',
          name: 'Machine Chest Press',
          nameHe: 'לחיצת חזה במכונה',
          imageUrl: '',
          score: 8,
          reasons: ['התאמה גבוהה'],
        },
      ],
    })

    renderForm()
    await screen.findByRole('button', { name: /העלה צילום מכשיר/ })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'machine.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await screen.findByText(/נראה שהתרגיל כבר קיים/)
    expect(identifyMachineMock).toHaveBeenCalled()
    expect(uploadBytesMock).toHaveBeenCalled()

    // Name field NOT filled from labelText while blocked
    const draftName = screen.getByPlaceholderText(/Chest Press$/) as HTMLInputElement
    expect(draftName.value).toBe('')

    // Existing-exercise edit link
    const editLink = screen.getByText(/לעריכת התרגיל הקיים/).closest('a')
    expect(editLink?.getAttribute('href')).toBe('/admin/exercises/ex-1/edit')

    // Override → name fills from labelText
    fireEvent.click(screen.getByRole('button', { name: /צור בכל זאת/ }))
    await waitFor(() => expect(draftName.value).toBe('Chest Press'))
  })
})
