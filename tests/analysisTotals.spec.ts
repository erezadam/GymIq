/**
 * Behavioral tests for the analysis table totals row (feature 09/08/2026):
 * sumAnalysisTotals aggregates sets + reps across strength rows and minutes
 * across cardio rows, matching what each table row displays.
 */
import { describe, it, expect } from 'vitest'
import { sumAnalysisTotals } from '@/domains/workouts/hooks/useMuscleAnalysis'

describe('sumAnalysisTotals', () => {
  it('sums sets and reps across strength rows', () => {
    const totals = sumAnalysisTotals([
      { totalSets: 8, totalReps: 72 },
      { totalSets: 6, totalReps: 60 },
      { totalSets: 3, totalReps: 36 },
    ])
    expect(totals).toEqual({ sets: 17, reps: 168, minutes: 0 })
  })

  it('routes cardio rows to minutes and excludes their sets/reps', () => {
    const totals = sumAnalysisTotals([
      { totalSets: 8, totalReps: 72 },
      { totalSets: 2, totalReps: 0, isCardio: true, totalMinutes: 10 },
      { totalSets: 1, totalReps: 0, isCardio: true, totalMinutes: 15 },
    ])
    expect(totals).toEqual({ sets: 8, reps: 72, minutes: 25 })
  })

  it('keeps fractional sets from secondary-muscle 0.5 credits to one decimal', () => {
    const totals = sumAnalysisTotals([
      { totalSets: 4.5, totalReps: 40 },
      { totalSets: 3.5, totalReps: 30 },
    ])
    expect(totals.sets).toBe(8)
    expect(totals.reps).toBe(70)
  })

  it('returns zeros for an empty period', () => {
    expect(sumAnalysisTotals([])).toEqual({ sets: 0, reps: 0, minutes: 0 })
  })
})
