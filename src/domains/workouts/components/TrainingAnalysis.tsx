/**
 * Training Analysis Screen
 * Displays AI-powered training analysis results
 * Loads cached analysis first, calls API only for new analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, BarChart3, ArrowRight, Calendar, Download, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { getUserWorkoutHistoryByDateRange } from '@/lib/firebase/workoutHistory'
import { getExercises, resolveLegacyMuscleCategory } from '@/lib/firebase/exercises'
import { getMuscles } from '@/lib/firebase/muscles'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import {
  getTrainingAnalysis,
  getCachedAnalysis,
  type TrainingAnalysisResult,
  type AnalysisError,
} from '../services/analysisService'
import type { Exercise } from '@/domains/exercises/types/exercise.types'

const MIN_SETS = 10
const MIN_AVG_REPS = 5

// exerciseId → { triceps?: number, biceps_brachii?: number, gluteus_maximus?: number }
// ערך 0.5 = חצי סט נספר על השריר המשני לכל סט completed
const SECONDARY_MUSCLE_MULTIPLIERS: Record<string, { triceps?: number; biceps_brachii?: number; gluteus_maximus?: number }> = {
  // triceps (יד אחורית) — 46 תרגילים
  "C3pf1VvSCuGxIA4oWzXI": { triceps: 0.5 },
  "eY2MblJj94vJtV6A0Zlz": { triceps: 0.5 },
  "dvZ4iMKZYKUDaheoJVCh": { triceps: 0.5 },
  "AspsDoRT9GPQOw0fYANa": { triceps: 0.5 },
  "hdJjAx3KMp5XbuQ7UNfW": { triceps: 0.5 },
  "Q8mHNGehBzxjDpc1dW8B": { triceps: 0.5 },
  "Xriss1E6kkY8nSnmyWKi": { triceps: 0.5 },
  "JnGWwa2vNbmaVxSr3li1": { triceps: 0.5 },
  "79pWk66pXALdv4ku2pTI": { triceps: 0.5 },
  "HL6Eq8eEfk1f6sl5R6Wq": { triceps: 0.5 },
  "aNKatCW6yKjWCLsWgoXp": { triceps: 0.5 },
  "0dqf0j0YQJAGf6NEMTv4": { triceps: 0.5 },
  "oE3M2FaQeaMU5hTeOkOj": { triceps: 0.5 },
  "zrnZmmlaOswF17Vi6ED2": { triceps: 0.5 },
  "n9quUbtf4CsIsnuP6ypJ": { triceps: 0.5 },
  "p4B9Utw3H50XD1khsVHP": { triceps: 0.5 },
  "TxiHxnar1u50kdNpJIPq": { triceps: 0.5 },
  "S2LAJAVDoYDpSP2J5LvJ": { triceps: 0.5 },
  "mKdO3inl3UVXkCfxyjSy": { triceps: 0.5 },
  "Fbw48H0eQfwvkmuye8o8": { triceps: 0.5 },
  "vTnBmyUqMoN5ikXdKONL": { triceps: 0.5 },
  "y9KWVXtSxcED7JQMpSRP": { triceps: 0.5 },
  "fdOOiWXvidgtp4JJ89uM": { triceps: 0.5 },
  "mgcEsYQyu7WTyeajQEkp": { triceps: 0.5 },
  "Pq8DXb7jtiDUoavcK7fO": { triceps: 0.5 },
  "f8yIQDvYF2M4LrPldgg8": { triceps: 0.5 },
  "4o86htIR7D1BC41ilIn9": { triceps: 0.5 },
  "uEttMMdBAEBLszuPTXCJ": { triceps: 0.5 },
  "Xpd2fI0MmOw8mHTYQjEx": { triceps: 0.5 },
  "2UGewyMR1snvp8qMRUz9": { triceps: 0.5 },
  "ZCwrx8BbUvf3mpJ2Jd3E": { triceps: 0.5 },
  "ABOinRwCsKTqDRk52HYM": { triceps: 0.5 },
  "nJtiUP2tORtm7uKqmKOu": { triceps: 0.5 },
  "BOwkhUUPpfWUPug9BsOf": { triceps: 0.5 },
  "Vk3sCZwlvdFOJC5tT3cd": { triceps: 0.5 },
  "llmh4oU99aNtS1vKynO9": { triceps: 0.5 },
  "jEUEyDG9ATkKIBN60k5j": { triceps: 0.5 },
  "TaVCi6SMnlGPU44STvqB": { triceps: 0.5 },
  "4gl74RJQfLbj7VfeivTQ": { triceps: 0.5 },
  "AKur5L4ib30oZSHgC9Px": { triceps: 0.5 },
  "oAoj1ai8K9dc6B9EaFED": { triceps: 0.5 },
  "HKltSTpqJQlY9UXrSUCh": { triceps: 0.5 },
  "Pxffw0KFPTW4a2xyK7fo": { triceps: 0.5 },
  "eC3bgOTVRk6G3NL6Jc54": { triceps: 0.5 },
  "ixeY4g8dtzz8RpoCJtSS": { triceps: 0.5 },
  "ls2RllIGdrXboD5nrmf2": { triceps: 0.5 },
  // biceps_brachii (יד קדמית) — 19 תרגילים
  "rCKv4MPkwWRgDpvQXV5X": { biceps_brachii: 0.5 },
  "CGPoXMft40TvBJl63j3P": { biceps_brachii: 0.5 },
  "iN6CNbUITqLbPXYrVcA5": { biceps_brachii: 0.5 },
  "mcoW0pzyAWBcd5C1dXad": { biceps_brachii: 0.5 },
  "RLkPUj6WGQhlyHcr023o": { biceps_brachii: 0.5 },
  "cAWWTBOa7vMM5XBTRstp": { biceps_brachii: 0.5 },
  "15EoZ3DZm4pMas9pEb8c": { biceps_brachii: 0.5 },
  "otCaAzOw0KvT8ONW1v1D": { biceps_brachii: 0.5 },
  "4mAbkf0hesykvFmFSD8k": { biceps_brachii: 0.5 },
  "Xoh0Dwe168xMDsDpkNgb": { biceps_brachii: 0.5 },
  "qjZ1cDTKn4WnRrORZCvR": { biceps_brachii: 0.5 },
  "KItcETHzIHJXCGt4duOM": { biceps_brachii: 0.5 },
  "dclvw5ufIebkrbA9du5B": { biceps_brachii: 0.5 },
  "uZCw91GV42PurHafWFe7": { biceps_brachii: 0.5 },
  "ha6rSmUuqmK6v2rjiTB1": { biceps_brachii: 0.5 },
  "U9liue4N8IB3vetWz2wI": { biceps_brachii: 0.5 },
  "e8gWq4e1zsqZ3kiKepWk": { biceps_brachii: 0.5 },
  "D2KUzrI3guPkMr356uGH": { biceps_brachii: 0.5 },
  "BwVQyCeg3DqNPFqdJser": { biceps_brachii: 0.5 },
  // gluteus_maximus (ישבן) — 17 תרגילים
  "QxbXQO77g3ewGnY7PISJ": { gluteus_maximus: 0.5 },
  "M3Wl6PplSjEyPFAqTQhr": { gluteus_maximus: 0.5 },
  "dkiOoNRC6InMJx6HvNCs": { gluteus_maximus: 0.5 },
  "1ISbykeW2hJz7l6Ag1eh": { gluteus_maximus: 0.5 },
  "ldyvkdv5EtQBg6nqMzDp": { gluteus_maximus: 0.5 },
  "6zA32kE09TDiaH4LJJv6": { gluteus_maximus: 0.5 },
  "UlFsp2JWjSaJXqxH50Np": { gluteus_maximus: 0.5 },
  "LUAX1e9H0zoUFEP7l3A6": { gluteus_maximus: 0.5 },
  "1ZwvAMeZeqXyx3oIJvPO": { gluteus_maximus: 0.5 },
  "FN6bKdNWcEgHjqrTPvbu": { gluteus_maximus: 0.5 },
  "R968BsNAAeIweal039f2": { gluteus_maximus: 0.5 },
  "9lqCm9PgTffJfwAcSVCe": { gluteus_maximus: 0.5 },
  "TvxDt0y03gmzOZzspHyU": { gluteus_maximus: 0.5 },
  "JClCPcKWAxKiuy7KIgRB": { gluteus_maximus: 0.5 },
  "eqLYs7TORwMcF6DmezaU": { gluteus_maximus: 0.5 },
  "R29ea1XKRxWmlqaryCAM": { gluteus_maximus: 0.5 },
  "eRubABEIIHyzJ7YCzhSe": { gluteus_maximus: 0.5 },
}

interface ExerciseDetail {
  name: string
  sets: number
  avgReps: number
}

interface MuscleRow {
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

interface SummaryRow {
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

const fmt = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

function getLastFullWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  // Go to last Saturday (end of previous full week)
  const lastSaturday = new Date(now)
  lastSaturday.setDate(now.getDate() - day - 1)
  lastSaturday.setHours(23, 59, 59, 999)

  // Sunday of that week
  const lastSunday = new Date(lastSaturday)
  lastSunday.setDate(lastSaturday.getDate() - 6)
  lastSunday.setHours(0, 0, 0, 0)

  return { start: lastSunday, end: lastSaturday, startStr: fmt(lastSunday), endStr: fmt(lastSaturday) }
}

function getCurrentWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  // Go to this Sunday (start of current week)
  const thisSunday = new Date(now)
  thisSunday.setDate(now.getDate() - day)
  thisSunday.setHours(0, 0, 0, 0)

  // End is now
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return { start: thisSunday, end, startStr: fmt(thisSunday), endStr: fmt(end) }
}

type WeekMode = 'last' | 'current' | 'custom'

function WeeklyMuscleModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MuscleRow[]>([])
  const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([])
  const [weekRange, setWeekRange] = useState({ startStr: '', endStr: '' })
  const [weekMode, setWeekMode] = useState<WeekMode>('last')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleRow | null>(null)

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
    if (weekMode === 'custom' && (!customStart || !customEnd)) {
      setLoading(false)
      setRows([])
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

        // Build normalization map: any known muscle ID → canonical Firebase muscle ID
        // e.g. "triceps_brachii" → "triceps", "biceps" → "biceps_brachii"
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
        // Cardio-specific: minutes and zones
        const cardioData = new Map<string, { totalMinutes: number; zoneSum: number; zoneCount: number }>()

        // Collect per-exercise detail per muscle
        const exercisesByMuscle = new Map<string, Map<string, { name: string; sets: number; reps: number; repsCount: number }>>()

        // Helper to add exercise to exercisesByMuscle
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

              // Secondary muscle contribution
              const secondary = SECONDARY_MUSCLE_MULTIPLIERS[exercise.exerciseId]
              if (secondary) {
                if (secondary.triceps) {
                  const key = 'triceps'
                  const ex2 = muscleData.get(key) || { sets: 0, reps: 0, repsCount: 0 }
                  ex2.sets += secondary.triceps
                  if (reps > 5) { ex2.reps += reps; ex2.repsCount++ }
                  muscleData.set(key, ex2)
                }
                if (secondary.biceps_brachii) {
                  const key = 'biceps_brachii'
                  const ex2 = muscleData.get(key) || { sets: 0, reps: 0, repsCount: 0 }
                  ex2.sets += secondary.biceps_brachii
                  if (reps > 5) { ex2.reps += reps; ex2.repsCount++ }
                  muscleData.set(key, ex2)
                }
                if (secondary.gluteus_maximus) {
                  const key = 'gluteus_maximus'
                  const ex2 = muscleData.get(key) || { sets: 0, reps: 0, repsCount: 0 }
                  ex2.sets += secondary.gluteus_maximus
                  if (reps > 5) { ex2.reps += reps; ex2.repsCount++ }
                  muscleData.set(key, ex2)
                }
              }
            }

            if (exSets > 0) {
              // Track exercise under its primary muscle
              addExerciseToMuscle(primaryMuscle, exercise.exerciseId, exName, exSets, exRepsTotal, exRepsCount)

              // Also track under secondary muscles
              const secondary = SECONDARY_MUSCLE_MULTIPLIERS[exercise.exerciseId]
              if (secondary) {
                if (secondary.triceps) {
                  addExerciseToMuscle('triceps', exercise.exerciseId, exName, Math.round(exSets * secondary.triceps * 10) / 10, exRepsTotal, exRepsCount)
                }
                if (secondary.biceps_brachii) {
                  addExerciseToMuscle('biceps_brachii', exercise.exerciseId, exName, Math.round(exSets * secondary.biceps_brachii * 10) / 10, exRepsTotal, exRepsCount)
                }
                if (secondary.gluteus_maximus) {
                  addExerciseToMuscle('gluteus_maximus', exercise.exerciseId, exName, Math.round(exSets * secondary.gluteus_maximus * 10) / 10, exRepsTotal, exRepsCount)
                }
              }
            }
          }
        }

        // Helper to get exercise details for a muscle
        const getExerciseDetails = (muscleId: string): ExerciseDetail[] => {
          const exMap = exercisesByMuscle.get(muscleId)
          if (!exMap) return []
          return Array.from(exMap.values()).map(e => ({
            name: e.name,
            sets: e.sets,
            avgReps: e.repsCount > 0 ? Math.round((e.reps / e.repsCount) * 10) / 10 : 0,
          })).sort((a, b) => b.sets - a.sets)
        }

        // Helper: check if a muscle ID belongs to cardio
        const isCardioMuscle = (id: string) => id === 'cardio' || id === 'warmup'

        // Convert to rows — show ALL muscles from Firebase mapping (top-down)
        // Each sub-muscle gets a row. Primary muscles with no sub-muscles also get a row.
        const result: MuscleRow[] = []
        for (const primary of muscleMapping) {
          if (primary.subMuscles.length === 0) {
            // Primary muscle with no sub-muscles — show as its own row
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

        // Sort by category, then totalSets desc
        result.sort((a, b) => {
          if (a.category !== b.category) return a.categoryHe.localeCompare(b.categoryHe, 'he')
          return b.totalSets - a.totalSets
        })

        setRows(result)

        // Build summary rows — aggregate by category (primary muscle group)
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
          if (row.avgReps > 0) {
            for (const ex of row.exercises) {
              if (ex.avgReps > 0) {
                existing.reps += ex.avgReps * ex.sets
                existing.repsCount += ex.sets
              }
            }
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

  const handleDownloadReport = () => {
    const lines: string[] = []
    lines.push(`ניתוח ביצוע שבועי — ${weekRange.startStr} – ${weekRange.endStr}`)
    lines.push('')

    let currentCategory = ''
    for (const row of rows) {
      if (row.categoryHe !== currentCategory) {
        currentCategory = row.categoryHe
        lines.push(`\n--- ${currentCategory} ---`)
      }
      lines.push(`  ${row.primaryMuscleHe}: ${row.totalSets} סטים, ממוצע ${row.avgReps} חזרות`)
      for (const ex of row.exercises) {
        lines.push(`    • ${ex.name} — ${ex.sets} סטים, ממוצע ${ex.avgReps} חזרות`)
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${weekRange.startStr.replace(/\//g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Exercise detail popup
  if (selectedMuscle) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setSelectedMuscle(null)}
      >
        <div
          className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-dark-card border border-dark-border"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMuscle(null)}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-text-primary">{selectedMuscle.primaryMuscleHe}</h2>
                <p className="text-xs text-text-secondary">{selectedMuscle.totalSets} סטים · ממוצע {selectedMuscle.avgReps} חזרות</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMuscle(null)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
            {selectedMuscle.exercises.length === 0 ? (
              <p className="text-text-muted text-center py-8">אין תרגילים בתקופה זו</p>
            ) : (
              <div className="space-y-3">
                {selectedMuscle.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-dark-card/60 border border-dark-border">
                    <span className="text-sm text-text-primary font-medium">{ex.name}</span>
                    <div className="text-left">
                      <div className="text-sm text-text-primary">{ex.sets} סטים</div>
                      <div className="text-xs text-text-muted">ממוצע {ex.avgReps} חזרות</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-dark-card border border-dark-border"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-text-primary">ניתוח ביצוע שבועי</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {weekRange.startStr} – {weekRange.endStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button
                onClick={handleDownloadReport}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
                title="הורד דוח"
              >
                <Download className="w-5 h-5 text-text-secondary" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Week Selector */}
        <div className="px-4 pt-3 pb-2 border-b border-dark-border">
          <div className="flex gap-2">
            <button
              onClick={() => setWeekMode('last')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                weekMode === 'last'
                  ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                  : 'bg-dark-card text-text-secondary border border-dark-border'
              }`}
            >
              שבוע אחרון
            </button>
            <button
              onClick={() => setWeekMode('current')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
                weekMode === 'current'
                  ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                  : 'bg-dark-card text-text-secondary border border-dark-border'
              }`}
            >
              שבוע נוכחי
            </button>
            <button
              onClick={() => setWeekMode('custom')}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                weekMode === 'custom'
                  ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                  : 'bg-dark-card text-text-secondary border border-dark-border'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              בין תאריכים
            </button>
          </div>

          {/* Custom Date Range Inputs */}
          {weekMode === 'custom' && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted block mb-1">מתאריך</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted block mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-160px)] p-4">
          {weekMode === 'custom' && (!customStart || !customEnd) ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted text-sm">
              <Calendar className="w-8 h-8 mb-3 opacity-40" />
              <p>בחר תאריך התחלה וסיום</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              {/* Summary Table — aggregated by muscle group */}
              <h3 className="text-sm font-bold text-text-primary mb-2">סיכום לפי קבוצת שרירים</h3>
              <table className="w-full text-sm min-w-[360px] mb-6">
                <thead>
                  <tr className="text-text-secondary text-xs border-b border-dark-border">
                    <th className="text-right py-2 pr-2 font-medium">קבוצת שרירים</th>
                    <th className="text-right py-2 font-medium">סטים / דקות</th>
                    <th className="text-center py-2 pl-2 font-medium">חזרות / zone</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row, i) => (
                    <tr key={row.category} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                      <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                      <td className="py-2.5">
                        {row.isCardio ? (
                          row.totalMinutes && row.totalMinutes > 0 ? (
                            <div className="font-medium text-text-primary">{row.totalMinutes} דק׳</div>
                          ) : (
                            <div className="text-text-muted">—</div>
                          )
                        ) : row.totalSets > 0 ? (
                          <div className={`font-medium ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                            {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                          </div>
                        ) : (
                          <div className="text-text-muted">—</div>
                        )}
                      </td>
                      <td className="py-2.5 pl-2 text-center">
                        {row.isCardio ? (
                          row.avgZone && row.avgZone > 0 ? (
                            <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )
                        ) : row.avgReps > 0 ? (
                          <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                            {row.avgReps}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Detailed Table — per sub-muscle */}
              <h3 className="text-sm font-bold text-text-primary mb-2">פירוט לפי תת-שריר</h3>
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-text-secondary text-xs border-b border-dark-border">
                    <th className="text-right py-2 pr-2 font-medium">שריר</th>
                    <th className="text-right py-2 font-medium">תת-שריר</th>
                    <th className="text-right py-2 font-medium">סטים / דקות</th>
                    <th className="text-center py-2 pl-2 font-medium">חזרות / zone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.primaryMuscle} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                      <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                      <td className="py-2.5 text-text-secondary">{row.primaryMuscleHe}</td>
                      <td
                        className={`py-2.5 ${row.totalSets > 0 ? 'cursor-pointer hover:bg-primary/5 rounded-lg transition-colors' : ''}`}
                        onClick={() => row.totalSets > 0 && setSelectedMuscle(row)}
                      >
                        {row.isCardio ? (
                          row.totalMinutes && row.totalMinutes > 0 ? (
                            <div className="font-medium text-text-primary underline decoration-current/30">{row.totalMinutes} דק׳</div>
                          ) : (
                            <div className="text-text-muted">—</div>
                          )
                        ) : row.totalSets > 0 ? (
                          <div className={`font-medium underline decoration-current/30 ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                            {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                          </div>
                        ) : (
                          <div className="text-text-muted">—</div>
                        )}
                      </td>
                      <td className="py-2.5 pl-2 text-center">
                        {row.isCardio ? (
                          row.avgZone && row.avgZone > 0 ? (
                            <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )
                        ) : row.avgReps > 0 ? (
                          <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                            {row.avgReps}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="mt-4 flex flex-col gap-1 text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
                    עומד ביעד
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-error" />
                    מתחת ליעד
                  </span>
                </div>
                <div>יעד: ≥{MIN_SETS} סטים, ≥{MIN_AVG_REPS} חזרות ממוצע</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type ScreenState = 'loading' | 'error' | 'results'

export default function TrainingAnalysis() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [state, setState] = useState<ScreenState>('loading')
  const [analysis, setAnalysis] = useState<TrainingAnalysisResult | null>(null)
  const [error, setError] = useState<AnalysisError | null>(null)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [weeksAnalyzed, setWeeksAnalyzed] = useState(0)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showMuscleModal, setShowMuscleModal] = useState(false)

  const fetchNewAnalysis = useCallback(async () => {
    if (!user?.uid) return
    try {
      setRefreshing(true)
      setState('loading')
      const response = await getTrainingAnalysis(user.uid)
      setAnalysis(response.result)
      setWorkoutCount(response.workoutCount)
      setWeeksAnalyzed(response.weeksAnalyzed)
      setGeneratedAt(new Date())
      setIsCached(false)
      setState('results')
    } catch (err: any) {
      setError(err as AnalysisError)
      setState('error')
    } finally {
      setRefreshing(false)
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    const loadAnalysis = async () => {
      // Try to load cached analysis first
      const cached = await getCachedAnalysis(user.uid)

      if (cached) {
        setAnalysis(cached.result)
        setWorkoutCount(cached.workoutCount)
        setWeeksAnalyzed(cached.weeksAnalyzed)
        setGeneratedAt(cached.generatedAt)
        setIsCached(true)
        setState('results')
        return
      }

      // No cache — fetch new
      await fetchNewAnalysis()
    }

    loadAnalysis()
  }, [user?.uid, fetchNewAnalysis])

  // Loading State
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 rtl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 animate-pulse">
          <span className="text-[32px]">🧠</span>
        </div>
        <div className="text-lg font-semibold text-text-primary mb-2">
          {refreshing ? 'יוצר ניתוח חדש...' : 'מנתח את האימונים שלך...'}
        </div>
        <div className="text-sm text-text-secondary text-center">
          הניתוח יכול לקחת עד 30 שניות
        </div>
      </div>
    )
  }

  // Error State
  if (state === 'error' && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 rtl">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
          error.type === 'rate_limit' ? 'bg-status-warning/10' : 'bg-status-error/10'
        }`}>
          <span className="text-[32px]">
            {error.type === 'rate_limit' ? '⏰' : error.type === 'not_enough_data' ? '📊' : '⚠️'}
          </span>
        </div>
        <div className="text-lg font-semibold text-text-primary mb-2 text-center">
          {error.type === 'rate_limit' && 'הגעת למגבלה היומית'}
          {error.type === 'not_enough_data' && 'אין מספיק נתונים'}
          {error.type === 'network' && 'בעיית תקשורת'}
          {error.type === 'general' && 'אירעה שגיאה'}
        </div>
        <div className="text-base text-text-secondary text-center mb-8 max-w-[300px] leading-relaxed">
          {error.message}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
        >
          חזרה לדף הבית
        </button>
      </div>
    )
  }

  // Results State
  if (!analysis) return null

  return (
    <div className="p-4 pb-10 rtl max-w-[600px] mx-auto">
      {/* Back Arrow */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="חזרה לדשבורד"
        >
          <ArrowRight size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">תובנות AI</h1>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-primary mb-1 text-center">
        {analysis.title}
      </h1>

      {/* Meta info + date */}
      <div className="text-xs text-text-muted text-center mb-5">
        {workoutCount} אימונים · {weeksAnalyzed} שבועות
        {generatedAt && (
          <span className="block mt-1">
            נכון ל-{generatedAt.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Weekly Muscle Analysis Button */}
      <button
        onClick={() => setShowMuscleModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-xl bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-sm font-semibold"
      >
        <BarChart3 className="w-4 h-4" />
        ניתוח שרירים שבועי
      </button>

      {/* Overview */}
      <div className="text-base text-text-secondary leading-relaxed mb-6">
        {analysis.overview}
      </div>

      {/* Strengths */}
      <SectionCard
        icon="✅"
        iconBgClass="bg-status-success/15"
        title="נקודות חוזק"
        titleColorClass="text-status-success"
        items={analysis.strengths}
        itemIcon="✓"
        itemIconColorClass="text-status-success"
      />

      {/* Weaknesses */}
      <SectionCard
        icon="⚠️"
        iconBgClass="bg-status-warning/15"
        title="נקודות לשיפור"
        titleColorClass="text-status-warning"
        items={analysis.weaknesses}
        itemIcon="!"
        itemIconColorClass="text-status-warning"
      />

      {/* Recommendations */}
      <SectionCard
        icon="💡"
        iconBgClass="bg-status-info/15"
        title="המלצות"
        titleColorClass="text-status-info"
        items={analysis.recommendations}
        itemIcon="→"
        itemIconColorClass="text-status-info"
      />

      {/* Summary */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
        <div className="text-base font-semibold text-primary leading-relaxed text-center">
          {analysis.summary}
        </div>
      </div>

      {/* Request New Analysis (only shown when viewing cached) */}
      {isCached && (
        <button
          onClick={fetchNewAnalysis}
          className="w-full py-3 mb-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-base font-semibold cursor-pointer"
        >
          בקש ניתוח חדש
        </button>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-full py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
      >
        חזרה לדף הבית
      </button>

      {/* Weekly Muscle Modal */}
      {showMuscleModal && user?.uid && (
        <WeeklyMuscleModal userId={user.uid} onClose={() => setShowMuscleModal(false)} />
      )}
    </div>
  )
}

// Section card component for strengths/weaknesses/recommendations
function SectionCard({
  icon,
  iconBgClass,
  title,
  titleColorClass,
  items,
  itemIcon,
  itemIconColorClass,
}: {
  icon: string
  iconBgClass: string
  title: string
  titleColorClass: string
  items: string[]
  itemIcon: string
  itemIconColorClass: string
}) {
  return (
    <div className="bg-background-card rounded-lg p-4 mb-4 border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-sm ${iconBgClass} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <div className={`text-lg font-bold ${titleColorClass}`}>
          {title}
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className={`${itemIconColorClass} font-bold text-sm min-w-[16px] text-center mt-0.5`}>
              {itemIcon}
            </span>
            <span className="text-sm text-text-primary leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
