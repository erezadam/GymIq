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

  // NOTE: an earlier version of this test locked in a BUG — it asserted that
  // clicking one item from "all" narrows to only that item, and that "all" only
  // ever selects everything. That documented what the code did, not what the
  // product needs. Per the convention "tests document product intent, not code
  // behavior", these expectations are inverted to the fixed contract.
  it('item click from "all" removes just that item; "all" is a real clear/select toggle', () => {
    let sel = new Set(SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
    // From "all", clicking one item REMOVES only it (not narrow-to-single).
    sel = toggleEquipment(sel, 'machine', SELECTABLE)
    expect([...sel].sort()).toEqual(['dumbbell', 'graviton'])
    // Clicking it again adds it back → all selected.
    sel = toggleEquipment(sel, 'machine', SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
    // "all" while everything is selected → CLEAR all.
    sel = toggleEquipment(sel, 'all', SELECTABLE)
    expect([...sel]).toEqual([])
    // "all" while nothing/partial selected → select everything.
    sel = toggleEquipment(sel, 'all', SELECTABLE)
    expect(isAllSelected(sel, SELECTABLE)).toBe(true)
    // Individual toggle still adds/removes a single item.
    sel = toggleEquipment(new Set(['dumbbell']), 'graviton', SELECTABLE)
    expect([...sel].sort()).toEqual(['dumbbell', 'graviton'])
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

  it('removing one item from "all" sends everything except that item', async () => {
    await openModal()
    // From the default "all", clicking machine REMOVES machine (it does not
    // narrow the selection down to only machine).
    fireEvent.click(screen.getByRole('button', { name: 'מכשירים' }))
    fireEvent.click(generateBtn())
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    const req = generateMock.mock.calls[0][0]
    expect(req.equipmentFilter).not.toContain('machine')
    expect(req.equipmentFilter).toContain('dumbbell')
  })

  it('an option with zero available exercises is disabled', async () => {
    await openModal()
    expect(screen.getByRole('button', { name: 'ריק' })).toBeDisabled()
  })

  it('scarcity alert appears only when too few strength exercises, and cancel preserves the selection', async () => {
    await openModal()
    // Clear all ("הכל" toggle), then select only graviton (1 strength) → below the 9 required.
    fireEvent.click(screen.getByRole('button', { name: 'הכל' }))
    fireEvent.click(screen.getByRole('button', { name: 'גרביטון' }))
    fireEvent.click(generateBtn())
    // Alert shown, generation NOT started.
    await screen.findByText(/מעט תרגילים לציוד שנבחר/)
    expect(generateMock).not.toHaveBeenCalled()
    // Cancel → back to the selector, nothing generated, selection preserved.
    fireEvent.click(screen.getByRole('button', { name: 'חזרה לבחירת ציוד' }))
    await waitFor(() => expect(screen.queryByText(/מעט תרגילים לציוד שנבחר/)).toBeNull())
    expect(generateMock).not.toHaveBeenCalled()
    // Modal stayed open; adding machine (12 strength) makes it valid → generates.
    fireEvent.click(screen.getByRole('button', { name: 'מכשירים' }))
    fireEvent.click(generateBtn())
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
  })
})
