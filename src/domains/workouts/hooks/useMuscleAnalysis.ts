/**
 * Shared hook for weekly muscle analysis computation.
 * Used by both trainee's TrainingAnalysis and trainer's MuscleAnalysisTab.
 */

import { useState, useEffect, useCallback } from 'react'
import { getUserWorkoutHistoryByDateRange } from '@/lib/firebase/workoutHistory'
import { getExercises, resolveLegacyMuscleCategory } from '@/lib/firebase/exercises'
import { getMuscles } from '@/lib/firebase/muscles'
import type { Exercise } from '@/domains/exercises/types/exercise.types'

export const MIN_SETS = 10
export const MIN_AVG_REPS = 5

export interface ExerciseDetail {
  name: string
  sets: number
  avgReps: number
}

export interface MuscleRow {
  category: string
  categoryHe: string
  primaryMuscle: string
  primaryMuscleHe: string
  totalSets: number
  avgReps: number
  setsGreen: boolean
  repsGreen: boolean
  exercises: ExerciseDetail[]
  isCardio?: boolean
  totalMinutes?: number
  avgZone?: number
}

export interface SummaryRow {
  category: string
  categoryHe: string
  totalSets: number
  avgReps: number
  setsGreen: boolean
  repsGreen: boolean
  isCardio?: boolean
  totalMinutes?: number
  avgZone?: number
}

export type WeekMode = 'last' | 'current' | 'custom'

export const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

export function getLastFullWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const lastSaturday = new Date(now)
  lastSaturday.setDate(now.getDate() - day - 1)
  lastSaturday.setHours(23, 59, 59, 999)

  const lastSunday = new Date(lastSaturday)
  lastSunday.setDate(lastSaturday.getDate() - 6)
  lastSunday.setHours(0, 0, 0, 0)

  return { start: lastSunday, end: lastSaturday, startStr: fmt(lastSunday), endStr: fmt(lastSaturday) }
}

export function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const thisSunday = new Date(now)
  thisSunday.setDate(now.getDate() - day)
  thisSunday.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return { start: thisSunday, end, startStr: fmt(thisSunday), endStr: fmt(end) }
}

export interface UseMuscleAnalysisResult {
  loading: boolean
  rows: MuscleRow[]
  summaryRows: SummaryRow[]
  weekRange: { startStr: string; endStr: string }
}

export function useMuscleAnalysis(
  userId: string | undefined,
  weekMode: WeekMode,
  customStart?: string,
  customEnd?: string,
): UseMuscleAnalysisResult {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MuscleRow[]>([])
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([])
  const [weekRange, setWeekRange] = useState({ startStr: '', endStr: '' })

  const getRangeForMode = useCallback((mode: WeekMode) => {
    if (mode === 'current') return getCurrentWeekRange()
    if (mode === 'custom' && customStart && customEnd) {
      const start = new Date(customStart)
      start.setHours(0, 0, 0, 0)
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
      return { start, end, startStr: fmt(start), endStr: fmt(end) }
    }
    return getLastFullWeekRange()
  }, [customStart, customEnd])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    if (weekMode === 'custom' && (!customStart || !customEnd)) {
      setLoading(false)
      setRows([])
      setSummaryRows([])
      return
    }

    const analyze = async () => {
      try {
        setLoading(true)
        const range = getRangeForMode(weekMode)
        setWeekRange({ startStr: range.startStr, endStr: range.endStr })

        const [workouts, exercises, muscleMapping] = await Promise.all([
          getUserWorkoutHistoryByDateRange(userId, range.start, range.end),
          getExercises(),
          getMuscles(),
        ])

        // Build exercise lookup
        const exerciseMap = new Map<string, Exercise>()
        for (const ex of exercises) {
          exerciseMap.set(ex.id, ex)
        }

        // Build normalization map
        const normalizeId = new Map<string, string>()
        for (const primary of muscleMapping) {
          normalizeId.set(primary.id, primary.id)
          for (const sub of primary.subMuscles) {
            normalizeId.set(sub.id, sub.id)
          }
        }

        const normalizeMuscleId = (id: string): string => normalizeId.get(id) || id

        // Accumulate sets and reps by primaryMuscle
        const muscleData = new Map<string, { sets: number; reps: number; repsCount: number }>()
        const cardioData = new Map<string, { totalMinutes: number; zoneSum: number; zoneCount: number }>()
        const exercisesByMuscle = new Map<string, Map<string, { name: string; sets: number; reps: number; repsCount: number }>>()

        const addExerciseToMuscle = (muscleKey: string, exId: string, exName: string, sets: number, reps: number, repsCount: number) => {
          if (!exercisesByMuscle.has(muscleKey)) exercisesByMuscle.set(muscleKey, new Map())
          const exMap = exercisesByMuscle.get(muscleKey)!
          const prev = exMap.get(exId)
          if (prev) {
            prev.sets += sets
            prev.reps += reps
            prev.repsCount += repsCount
          } else {
            exMap.set(exId, { name: exName, sets, reps, repsCount })
          }
        }

        for (const workout of workouts) {
          if (workout.status !== 'completed') continue

          for (const exercise of workout.exercises) {
            const exDef = exerciseMap.get(exercise.exerciseId)
            const rawCategory = exDef?.primaryMuscle || exercise.category || 'other'
            const primaryMuscle = normalizeMuscleId(resolveLegacyMuscleCategory(rawCategory, exDef?.primaryMuscle))
            const exName = exDef?.nameHe || exDef?.name || exercise.exerciseId

            let exSets = 0
            let exRepsTotal = 0
            let exRepsCount = 0
            const isCardioExercise = (exDef?.category === 'cardio') || (exercise.category === 'cardio') || primaryMuscle === 'cardio' || primaryMuscle === 'warmup'

            for (const set of exercise.sets) {
              if (!set.completed) continue

              const existing = muscleData.get(primaryMuscle) || { sets: 0, reps: 0, repsCount: 0 }
              existing.sets++
              const reps = set.actualReps || set.targetReps || 0
              if (reps > 5) {
                existing.reps += reps
                existing.repsCount++
              }
              muscleData.set(primaryMuscle, existing)

              exSets++
              if (reps > 0) { exRepsTotal += reps; exRepsCount++ }

              // Cardio: accumulate minutes and zone
              if (isCardioExercise) {
                const cardioKey = primaryMuscle
                const cd = cardioData.get(cardioKey) || { totalMinutes: 0, zoneSum: 0, zoneCount: 0 }
                if ((set as any).time) cd.totalMinutes += (set as any).time / 60
                if ((set as any).zone) { cd.zoneSum += (set as any).zone; cd.zoneCount++ }
                cardioData.set(cardioKey, cd)
              }

              // Secondary muscle contribution — only sets at 50%, reps not counted
              // so that secondary credit doesn't distort the average reps
              const credits = exDef?.secondaryMuscleCredits || []
              for (const muscleId of credits) {
                const ex2 = muscleData.get(muscleId) || { sets: 0, reps: 0, repsCount: 0 }
                ex2.sets += 0.5
                muscleData.set(muscleId, ex2)
              }
            }

            if (exSets > 0) {
              addExerciseToMuscle(primaryMuscle, exercise.exerciseId, exName, exSets, exRepsTotal, exRepsCount)

              const exerciseCredits = exDef?.secondaryMuscleCredits || []
              for (const muscleId of exerciseCredits) {
                addExerciseToMuscle(muscleId, exercise.exerciseId, exName, Math.round(exSets * 0.5 * 10) / 10, 0, 0)
              }
            }
          }
        }

        const getExerciseDetails = (muscleId: string): ExerciseDetail[] => {
          const exMap = exercisesByMuscle.get(muscleId)
          if (!exMap) return []
          return Array.from(exMap.values()).map(e => ({
            name: e.name,
            sets: e.sets,
            avgReps: e.repsCount > 0 ? Math.round((e.reps / e.repsCount) * 10) / 10 : 0,
          })).sort((a, b) => b.sets - a.sets)
        }

        const isCardioMuscle = (id: string) => id === 'cardio' || id === 'warmup'

        // Convert to rows
        const result: MuscleRow[] = []
        for (const primary of muscleMapping) {
          if (primary.subMuscles.length === 0) {
            const data = muscleData.get(primary.id)
            const totalSets = data?.sets || 0
            const avgReps = data && data.repsCount > 0
              ? Math.round((data.reps / data.repsCount) * 10) / 10
              : 0
            const cd = cardioData.get(primary.id)
            const isCardio = isCardioMuscle(primary.id)
            result.push({
              category: primary.id,
              categoryHe: primary.nameHe,
              primaryMuscle: primary.id,
              primaryMuscleHe: primary.nameHe,
              totalSets,
              avgReps,
              setsGreen: totalSets >= MIN_SETS,
              repsGreen: avgReps >= MIN_AVG_REPS,
              exercises: getExerciseDetails(primary.id),
              isCardio,
              totalMinutes: cd ? Math.round(cd.totalMinutes) : 0,
              avgZone: cd && cd.zoneCount > 0 ? Math.round((cd.zoneSum / cd.zoneCount) * 10) / 10 : 0,
            })
          } else {
            const parentData = muscleData.get(primary.id)
            const parentCardio = cardioData.get(primary.id)
            const parentExercises = getExerciseDetails(primary.id)
            const hasParentData = (parentData && parentData.sets > 0) || (parentCardio && parentCardio.totalMinutes > 0) || parentExercises.length > 0

            if (hasParentData && primary.subMuscles.length > 0) {
              const firstSubId = primary.subMuscles[0].id
              const subData = muscleData.get(firstSubId) || { sets: 0, reps: 0, repsCount: 0 }
              subData.sets += parentData?.sets || 0
              subData.reps += parentData?.reps || 0
              subData.repsCount += parentData?.repsCount || 0
              muscleData.set(firstSubId, subData)

              if (parentCardio) {
                const subCardio = cardioData.get(firstSubId) || { totalMinutes: 0, zoneSum: 0, zoneCount: 0 }
                subCardio.totalMinutes += parentCardio.totalMinutes
                subCardio.zoneSum += parentCardio.zoneSum
                subCardio.zoneCount += parentCardio.zoneCount
                cardioData.set(firstSubId, subCardio)
              }

              if (parentExercises.length > 0) {
                if (!exercisesByMuscle.has(firstSubId)) exercisesByMuscle.set(firstSubId, new Map())
                const parentExMap = exercisesByMuscle.get(primary.id)
                if (parentExMap) {
                  const subExMap = exercisesByMuscle.get(firstSubId)!
                  for (const [exId, exData] of parentExMap) {
                    const prev = subExMap.get(exId)
                    if (prev) {
                      prev.sets += exData.sets
                      prev.reps += exData.reps
                      prev.repsCount += exData.repsCount
                    } else {
                      subExMap.set(exId, { ...exData })
                    }
                  }
                }
              }
            }

            for (const sub of primary.subMuscles) {
              const data = muscleData.get(sub.id)
              const totalSets = data?.sets || 0
              const avgReps = data && data.repsCount > 0
                ? Math.round((data.reps / data.repsCount) * 10) / 10
                : 0
              const cd = cardioData.get(sub.id)
              const isCardio = isCardioMuscle(primary.id) || isCardioMuscle(sub.id)
              result.push({
                category: primary.id,
                categoryHe: primary.nameHe,
                primaryMuscle: sub.id,
                primaryMuscleHe: sub.nameHe,
                totalSets,
                avgReps,
                setsGreen: totalSets >= MIN_SETS,
                repsGreen: avgReps >= MIN_AVG_REPS,
                exercises: getExerciseDetails(sub.id),
                isCardio,
                totalMinutes: cd ? Math.round(cd.totalMinutes) : 0,
                avgZone: cd && cd.zoneCount > 0 ? Math.round((cd.zoneSum / cd.zoneCount) * 10) / 10 : 0,
              })
            }
          }
        }

        result.sort((a, b) => {
          if (a.category !== b.category) return a.categoryHe.localeCompare(b.categoryHe, 'he')
          return b.totalSets - a.totalSets
        })

        setRows(result)

        // Build summary rows
        const summaryMap = new Map<string, { categoryHe: string; sets: number; reps: number; repsCount: number; isCardio: boolean; totalMinutes: number; zoneSum: number; zoneCount: number }>()
        for (const row of result) {
          const existing = summaryMap.get(row.category) || { categoryHe: row.categoryHe, sets: 0, reps: 0, repsCount: 0, isCardio: false, totalMinutes: 0, zoneSum: 0, zoneCount: 0 }
          existing.sets += row.totalSets
          if (row.isCardio) {
            existing.isCardio = true
            existing.totalMinutes += row.totalMinutes || 0
            if (row.avgZone && row.avgZone > 0) {
              existing.zoneSum += row.avgZone * (row.totalSets || 1)
              existing.zoneCount += row.totalSets || 1
            }
          }
          if (row.avgReps > 0 && row.totalSets > 0) {
            existing.reps += row.avgReps * row.totalSets
            existing.repsCount += row.totalSets
          }
          summaryMap.set(row.category, existing)
        }
        const summary: SummaryRow[] = Array.from(summaryMap.entries()).map(([category, data]) => {
          const totalSets = Math.round(data.sets * 10) / 10
          const avgReps = data.repsCount > 0 ? Math.round((data.reps / data.repsCount) * 10) / 10 : 0
          return {
            category,
            categoryHe: data.categoryHe,
            totalSets,
            avgReps,
            setsGreen: totalSets >= MIN_SETS,
            repsGreen: avgReps >= MIN_AVG_REPS,
            isCardio: data.isCardio,
            totalMinutes: Math.round(data.totalMinutes),
            avgZone: data.zoneCount > 0 ? Math.round((data.zoneSum / data.zoneCount) * 10) / 10 : 0,
          }
        })
        summary.sort((a, b) => b.totalSets - a.totalSets)
        setSummaryRows(summary)
      } catch (err) {
        console.error('Error analyzing weekly muscles:', err)
      } finally {
        setLoading(false)
      }
    }

    analyze()
  }, [userId, weekMode, getRangeForMode])

  return { loading, rows, summaryRows, weekRange }
}
