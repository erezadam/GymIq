/**
 * workoutPinRename.spec.ts — Behavior tests for the rename + pin feature
 * (trainee workouts screen).
 *
 * Covers:
 *   1. updateWorkoutHistory writes name / pinned correctly (mock updateDoc) —
 *      including pinned:false (unpin must not be dropped by a falsy check).
 *   2. getUserWorkoutHistory merges the always-fetch pinned query with the main
 *      50-doc window (old pinned workouts survive the limit), dedupes by id,
 *      and degrades gracefully when the pinned query fails.
 *   3. partitionWorkouts section logic: planned first, pinned below (most
 *      recently performed first, bypassing the 14-day window), rest unchanged,
 *      no duplication between sections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDocsMock = vi.fn()
const updateDocMock = vi.fn(async () => undefined)

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  getDocs: getDocsMock,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  updateDoc: updateDocMock,
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'serverTimestamp'),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date(0) }),
  },
  startAfter: vi.fn(() => ({})),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
  arrayUnion: vi.fn((v: unknown) => v),
  arrayRemove: vi.fn((v: unknown) => v),
  deleteField: vi.fn(() => '__deleted__'),
}))

vi.mock('../src/lib/firebase/config', () => ({ db: {} }))
vi.mock('../src/lib/firebase/diagnosticLogs', () => ({ logDiagnostic: vi.fn() }))

beforeEach(() => {
  getDocsMock.mockReset()
  updateDocMock.mockClear()
})

describe('updateWorkoutHistory — name and pinned', () => {
  it('writes name only when renaming', async () => {
    const { updateWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    await updateWorkoutHistory('w1', { name: 'אימון רגליים שלי' })
    expect(updateDocMock).toHaveBeenCalledTimes(1)
    expect(updateDocMock.mock.calls[0][1]).toEqual({ name: 'אימון רגליים שלי' })
  })

  it('writes pinned:true when pinning', async () => {
    const { updateWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    await updateWorkoutHistory('w1', { pinned: true })
    expect(updateDocMock.mock.calls[0][1]).toEqual({ pinned: true })
  })

  it('writes pinned:false when unpinning (falsy value must not be dropped)', async () => {
    const { updateWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    await updateWorkoutHistory('w1', { pinned: false })
    expect(updateDocMock.mock.calls[0][1]).toEqual({ pinned: false })
  })
})

describe('getUserWorkoutHistory — pinned merge', () => {
  const ts = (iso: string) => ({ toDate: () => new Date(iso) })
  const docOf = (id: string, data: Record<string, unknown>) => ({ id, data: () => data })
  const baseDoc = (over: Record<string, unknown> = {}) => ({
    userId: 'u1',
    name: 'אימון',
    status: 'completed',
    exercises: [],
    date: ts('2026-08-01T10:00:00'),
    startTime: ts('2026-08-01T10:00:00'),
    endTime: ts('2026-08-01T11:00:00'),
    duration: 60,
    ...over,
  })

  it('merges old pinned docs missing from the recent window, deduped by id', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [docOf('recent', baseDoc()), docOf('both', baseDoc({ pinned: true }))] })
      .mockResolvedValueOnce({ docs: [docOf('both', baseDoc({ pinned: true })), docOf('old-pinned', baseDoc({ pinned: true, date: ts('2026-01-01T10:00:00') }))] })
    const { getUserWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    const result = await getUserWorkoutHistory('u1')
    const ids = result.map(w => w.id)
    expect(ids).toContain('old-pinned')
    expect(ids.filter(id => id === 'both')).toHaveLength(1)
    expect(result.find(w => w.id === 'old-pinned')?.pinned).toBe(true)
  })

  it('degrades gracefully when the pinned query fails — main list still loads', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [docOf('recent', baseDoc())] })
      .mockRejectedValueOnce(new Error('index missing'))
    const { getUserWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    const result = await getUserWorkoutHistory('u1')
    expect(result.map(w => w.id)).toEqual(['recent'])
  })

  it('excludes soft-deleted pinned docs', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({
        docs: [docOf('deleted-pinned', baseDoc({ pinned: true, deletedByTrainee: { deletedAt: ts('2026-07-01T00:00:00') } }))],
      })
    const { getUserWorkoutHistory } = await import('../src/lib/firebase/workoutHistory')
    const result = await getUserWorkoutHistory('u1')
    expect(result).toHaveLength(0)
  })
})

describe('partitionWorkouts — section order and pinned rules', () => {
  const NOW = new Date('2026-08-03T12:00:00')
  const summary = (over: Record<string, unknown>) => ({
    id: 'x',
    name: 'אימון',
    date: new Date('2026-08-01T10:00:00'),
    duration: 60,
    status: 'completed',
    completedExercises: 3,
    totalExercises: 3,
    totalVolume: 1000,
    personalRecords: 0,
    ...over,
  }) as any

  it('planned stay in their own section; pinned appear separately, newest-performed first; no duplication', async () => {
    const { partitionWorkouts } = await import('../src/domains/workouts/utils/partitionWorkouts')
    const workouts = [
      summary({ id: 'planned1', status: 'planned', date: new Date('2026-08-03') }),
      summary({ id: 'pin-old', pinned: true, date: new Date('2026-03-01') }), // older than 14 days
      summary({ id: 'pin-new', pinned: true, date: new Date('2026-08-02') }),
      summary({ id: 'regular', date: new Date('2026-07-30') }),
    ]
    const r = partitionWorkouts(workouts, NOW)
    expect(r.plannedWorkouts.map(w => w.id)).toEqual(['planned1'])
    // most recently performed first; old pinned bypasses the 14-day window
    expect(r.pinnedWorkouts.map(w => w.id)).toEqual(['pin-new', 'pin-old'])
    expect(r.otherWorkouts.map(w => w.id)).toEqual(['regular'])
  })

  it('unpinned old workouts still fall out of the 14-day window (existing behavior preserved)', async () => {
    const { partitionWorkouts } = await import('../src/domains/workouts/utils/partitionWorkouts')
    const r = partitionWorkouts([summary({ id: 'old', date: new Date('2026-03-01') })], NOW)
    expect(r.otherWorkouts).toHaveLength(0)
    expect(r.pinnedWorkouts).toHaveLength(0)
  })

  it('a pinned planned workout stays in the planned section (not duplicated into pinned)', async () => {
    const { partitionWorkouts } = await import('../src/domains/workouts/utils/partitionWorkouts')
    const r = partitionWorkouts([summary({ id: 'p', status: 'planned', pinned: true })], NOW)
    expect(r.plannedWorkouts.map(w => w.id)).toEqual(['p'])
    expect(r.pinnedWorkouts).toHaveLength(0)
  })

  it('completed AI workouts can be pinned (they behave like regular workouts)', async () => {
    const { partitionWorkouts } = await import('../src/domains/workouts/utils/partitionWorkouts')
    const r = partitionWorkouts(
      [summary({ id: 'ai-done', source: 'ai_trainer', status: 'completed', pinned: true, date: new Date('2026-04-01') })],
      NOW
    )
    expect(r.pinnedWorkouts.map(w => w.id)).toEqual(['ai-done'])
  })

  it('non-completed AI bundle workouts are not affected by pinning (stay in bundles)', async () => {
    const { partitionWorkouts } = await import('../src/domains/workouts/utils/partitionWorkouts')
    const r = partitionWorkouts(
      [summary({ id: 'ai-planned', source: 'ai_trainer', status: 'planned', bundleId: 'b1', pinned: true })],
      NOW
    )
    expect(r.aiBundles).toHaveLength(1)
    expect(r.pinnedWorkouts).toHaveLength(0)
  })
})
