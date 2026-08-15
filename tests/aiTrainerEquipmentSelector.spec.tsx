/**
 * aiTrainerEquipmentSelector.spec.tsx — the equipment multi-select UI + its logic.
 *
 * Pure logic (equipmentSelection): the "all vs single item" toggle rule, what is
 * sent to the server, availability counts, and the strength count behind the
 * scarcity alert. Component: default → no equipment field sent; partial → sent as
 * marked; empty option disabled; scarcity alert appears when too few strength
 * exercises, and cancelling it preserves the selection (doesn't generate).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// ---------------- Pure logic ----------------
import {
  equipmentSelectableIds,
  equipmentAvailabilityCounts,
  isAllSelected,
  toggleEquipment,
  equipmentFilterForRequest,
  availableStrengthCount,
} from '@/domains/workouts/utils/equipmentSelection'
import type { EquipmentOption } from '@/domains/exercises/utils'

const OPTIONS: EquipmentOption[] = [
  { id: 'all', label: 'הכל' },
  { id: 'dumbbell', label: 'משקולת יד' },
  { id: 'machine', label: 'מכשירים' },
  { id: 'graviton', label: 'גרביטון' },
]
const SELECTABLE = equipmentSelectableIds(OPTIONS) // ['dumbbell','machine','graviton']

describe('equipmentSelection — pure logic', () => {
  it('selectable ids exclude "all"', () => {
    expect(SELECTABLE).toEqual(['dumbbell', 'machine', 'graviton'])
  })

  it('clicking "all" selects everything; a single item toggles; manual-all === all', () => {
    let sel = new Set(SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
    // remove one → no longer "all"
    sel = toggleEquipment(sel, 'machine', SELECTABLE)
    expect(sel.has('machine')).toBe(false)
    expect(isAllSelected(sel, SELECTABLE)).toBe(false)
    // re-add it manually → equivalent to "all" again
    sel = toggleEquipment(sel, 'machine', SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
    // clicking "all" from a partial state selects everything
    sel = toggleEquipment(new Set(['dumbbell']), 'all', SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
  })

  it('request field: undefined when all selected (or none loaded); actual selection when partial', () => {
    expect(equipmentFilterForRequest(new Set(SELECTABLE), SELECTABLE)).toBeUndefined()
    expect(equipmentFilterForRequest(new Set(), [])).toBeUndefined()
    expect(equipmentFilterForRequest(new Set(['dumbbell', 'graviton']), SELECTABLE)).toEqual(['dumbbell', 'graviton'])
  })

  it('availability counts: by equipment, and graviton by assistance type', () => {
    const pool = [
      { equipment: 'dumbbell' },
      { equipment: 'dumbbell' },
      { equipment: 'machine' },
      { equipment: 'cable_machine', assistanceTypes: ['graviton'] },
    ]
    const counts = equipmentAvailabilityCounts(pool, OPTIONS)
    expect(counts.get('dumbbell')).toBe(2)
    expect(counts.get('machine')).toBe(1)
    expect(counts.get('graviton')).toBe(1) // by assistance type, not equipment
  })

  it('availableStrengthCount excludes cardio and respects the selection', () => {
    const pool = [
      { equipment: 'dumbbell', primaryMuscle: 'chest' },
      { equipment: 'dumbbell', category: 'cardio', primaryMuscle: 'cardio' }, // cardio → not counted
      { equipment: 'machine', primaryMuscle: 'back' },
    ]
    // dumbbell only → 1 strength (the cardio dumbbell is excluded).
    expect(availableStrengthCount(pool, new Set(['dumbbell']), SELECTABLE)).toBe(1)
    // all selected → both strength exercises.
    expect(availableStrengthCount(pool, new Set(SELECTABLE), SELECTABLE)).toBe(2)
  })
})

// ---------------- Component ----------------
const { navigateMock, generateMock, distinctMock, getExercisesMock, getEquipmentMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  generateMock: vi.fn(),
  distinctMock: vi.fn(),
  getExercisesMock: vi.fn(),
  getEquipmentMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))
vi.mock('@/domains/authentication/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => ({ uid: 'user-1', email: 't@e.com', displayName: 'T' }),
}))
vi.mock('@/domains/workouts/services/aiTrainerService', () => ({ generateAIWorkouts: generateMock }))
vi.mock('@/lib/firebase/workoutHistory', () => ({ getDistinctPerformedExerciseIds: distinctMock }))
vi.mock('@/lib/firebase/exercises', () => ({ getExercises: getExercisesMock }))
vi.mock('@/lib/firebase/equipment', () => ({ getEquipment: getEquipmentMock }))

import AITrainerModal from '@/domains/workouts/components/ai-trainer/AITrainerModal'

const EQUIPMENT = [
  { id: 'dumbbell', nameHe: 'משקולת יד', nameEn: 'Dumbbell', order: 2, isActive: true },
  { id: 'machine', nameHe: 'מכשירים', nameEn: 'Machine', order: 7, isActive: true },
  { id: 'empty_eq', nameHe: 'ריק', nameEn: 'Empty', order: 8, isActive: true },
]
function strengthExercises(equipment: string, muscle: string, n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${i}`, name: `${prefix}-${i}`, nameHe: `${prefix}-${i}`,
    category: muscle, primaryMuscle: muscle, imageUrl: '', equipment,
  }))
}
const LIBRARY = [
  ...strengthExercises('dumbbell', 'chest', 12, 'db'),
  ...strengthExercises('machine', 'back', 12, 'mc'),
  { id: 'grav-0', name: 'grav', nameHe: 'grav', category: 'back', primaryMuscle: 'lats', imageUrl: '', equipment: 'dumbbell', assistanceTypes: ['graviton'] },
  // note: no exercise uses 'empty_eq' → that option is empty/disabled.
]

async function openModal() {
  render(<AITrainerModal isOpen onClose={() => {}} />)
  // Equipment section renders once options load.
  await screen.findByRole('button', { name: 'משקולת יד' })
}
const generateBtn = () => screen.getByRole('button', { name: /צור \d|צור אימון/ })

beforeEach(() => {
  vi.clearAllMocks()
  navigateMock.mockReset()
  distinctMock.mockResolvedValue(new Set(['x1', 'x2', 'x3'])) // < 10 → source defaults to 'all'
  getExercisesMock.mockResolvedValue(LIBRARY)
  getEquipmentMock.mockResolvedValue(EQUIPMENT)
  generateMock.mockResolvedValue({
    success: true, usedFallback: false,
    workouts: [{ name: 'מאמן #1', exercises: [], estimatedDuration: 60, muscleGroups: [], source: 'ai_trainer', aiWorkoutNumber: 1, aiExplanation: 'ok' }],
  })
})

describe('AITrainerModal — equipment selector', () => {
  it('default (all selected) → no equipmentFilter sent', async () => {
    await openModal()
    fireEvent.click(generateBtn())
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    expect(generateMock.mock.calls[0][0]).not.toHaveProperty('equipmentFilter')
  })

  it('partial selection → equipmentFilter sent as marked', async () => {
    await openModal()
    fireEvent.click(screen.getByRole('button', { name: 'מכשירים' })) // deselect machine
    fireEvent.click(generateBtn())
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    const req = generateMock.mock.calls[0][0]
    expect(req.equipmentFilter).toBeDefined()
    // machine was deselected; the empty (disabled) option stays selected by
    // default and is harmless (no exercise matches it).
    expect([...req.equipmentFilter].sort()).toEqual(['dumbbell', 'empty_eq', 'graviton'])
    expect(req.equipmentFilter).not.toContain('machine')
  })

  it('an option with zero available exercises is disabled', async () => {
    await openModal()
    expect(screen.getByRole('button', { name: 'ריק' })).toBeDisabled()
  })

  it('scarcity alert appears only when too few strength exercises, and cancel preserves the selection', async () => {
    await openModal()
    // Keep only graviton (1 strength exercise) → below the 9 required for 60 min.
    fireEvent.click(screen.getByRole('button', { name: 'משקולת יד' }))
    fireEvent.click(screen.getByRole('button', { name: 'מכשירים' }))
    fireEvent.click(generateBtn())
    // Alert shown, generation NOT started.
    await screen.findByText(/מעט תרגילים לציוד שנבחר/)
    expect(generateMock).not.toHaveBeenCalled()
    // Cancel → back to the selector, nothing generated, selection preserved.
    fireEvent.click(screen.getByRole('button', { name: 'חזרה לבחירת ציוד' }))
    await waitFor(() => expect(screen.queryByText(/מעט תרגילים לציוד שנבחר/)).toBeNull())
    expect(generateMock).not.toHaveBeenCalled()
    // The equipment buttons are still there (modal stayed open) and re-selecting
    // machine restores a valid selection.
    fireEvent.click(screen.getByRole('button', { name: 'מכשירים' }))
    fireEvent.click(generateBtn())
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
  })
})
