/**
 * Training Analysis Screen
 * Displays AI-powered training analysis results
 * Loads cached analysis first, calls API only for new analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, BarChart3, TrendingUp, TrendingDown, ArrowRight, Calendar } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { getUserWorkoutHistoryByDateRange } from '@/lib/firebase/workoutHistory'
import { getExercises } from '@/lib/firebase/exercises'
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

// exerciseId → { triceps?: number, glutes?: number }
// ערך 0.5 = חצי סט נספר על השריר המשני לכל סט completed
const SECONDARY_MUSCLE_MULTIPLIERS: Record<string, { triceps?: number; glutes?: number }> = {
  "rCKv4MPkwWRgDpvQXV5X": { triceps: 0.5 },
  "QxbXQO77g3ewGnY7PISJ": { glutes: 0.5 },
  "CGPoXMft40TvBJl63j3P": { triceps: 0.5 },
  "eQBfnsTE7HUUZedRZZeq": { glutes: 0.5 },
  "M3Wl6PplSjEyPFAqTQhr": { glutes: 0.5 },
  "C3pf1VvSCuGxIA4oWzXI": { triceps: 0.5 },
  "eY2MblJj94vJtV6A0Zlz": { triceps: 0.5 },
  "dkiOoNRC6InMJx6HvNCs": { glutes: 0.5 },
  "zrnZmmlaOswF17Vi6ED2": { triceps: 0.5 },
  "n9quUbtf4CsIsnuP6ypJ": { triceps: 0.5 },
  "iN6CNbUITqLbPXYrVcA5": { triceps: 0.5 },
  "S2LAJAVDoYDpSP2J5LvJ": { triceps: 0.5 },
  "mKdO3inl3UVXkCfxyjSy": { triceps: 0.5 },
  "Fbw48H0eQfwvkmuye8o8": { triceps: 0.5 },
  "vTnBmyUqMoN5ikXdKONL": { triceps: 0.5 },
  "mcoW0pzyAWBcd5C1dXad": { triceps: 0.5 },
  "y9KWVXtSxcED7JQMpSRP": { triceps: 0.5 },
  "lx6Uiw2h4wm1DqvBLR0Z": { glutes: 0.5 },
  "fdOOiWXvidgtp4JJ89uM": { triceps: 0.5 },
  "mgcEsYQyu7WTyeajQEkp": { triceps: 0.5 },
  "Pq8DXb7jtiDUoavcK7fO": { triceps: 0.5 },
  "f8yIQDvYF2M4LrPldgg8": { triceps: 0.5 },
  "4o86htIR7D1BC41ilIn9": { triceps: 0.5 },
  "uEttMMdBAEBLszuPTXCJ": { triceps: 0.5 },
  "1ISbykeW2hJz7l6Ag1eh": { glutes: 0.5 },
  "RLkPUj6WGQhlyHcr023o": { triceps: 0.5 },
  "cAWWTBOa7vMM5XBTRstp": { triceps: 0.5 },
  "15EoZ3DZm4pMas9pEb8c": { triceps: 0.5 },
  "otCaAzOw0KvT8ONW1v1D": { triceps: 0.5 },
  "6EUI93YQAeP9AwNzz8BL": { glutes: 0.5 },
  "Xpd2fI0MmOw8mHTYQjEx": { triceps: 0.5, glutes: 0.5 },
  "2UGewyMR1snvp8qMRUz9": { triceps: 0.5 },
  "ZCwrx8BbUvf3mpJ2Jd3E": { triceps: 0.5 },
  "ABOinRwCsKTqDRk52HYM": { triceps: 0.5 },
  "nJtiUP2tORtm7uKqmKOu": { triceps: 0.5 },
  "Zby1v7HRYivnkPkXVq0f": { glutes: 0.5 },
  "ldyvkdv5EtQBg6nqMzDp": { glutes: 0.5 },
  "BOwkhUUPpfWUPug9BsOf": { triceps: 0.5 },
  "6zA32kE09TDiaH4LJJv6": { glutes: 0.5 },
  "4mAbkf0hesykvFmFSD8k": { triceps: 0.5 },
  "Xoh0Dwe168xMDsDpkNgb": { triceps: 0.5 },
  "Vk3sCZwlvdFOJC5tT3cd": { triceps: 0.5 },
  "llmh4oU99aNtS1vKynO9": { triceps: 0.5 },
  "qjZ1cDTKn4WnRrORZCvR": { triceps: 0.5 },
  "UlFsp2JWjSaJXqxH50Np": { glutes: 0.5 },
  "LUAX1e9H0zoUFEP7l3A6": { glutes: 0.5 },
  "JKREPoXVz7Aja4QwoyQq": { glutes: 0.5 },
  "KItcETHzIHJXCGt4duOM": { triceps: 0.5 },
  "jEUEyDG9ATkKIBN60k5j": { triceps: 0.5 },
  "TaVCi6SMnlGPU44STvqB": { triceps: 0.5 },
  "dclvw5ufIebkrbA9du5B": { triceps: 0.5 },
  "4gl74RJQfLbj7VfeivTQ": { triceps: 0.5 },
  "AKur5L4ib30oZSHgC9Px": { triceps: 0.5 },
  "uZCw91GV42PurHafWFe7": { triceps: 0.5 },
  "1ZwvAMeZeqXyx3oIJvPO": { glutes: 0.5 },
  "FN6bKdNWcEgHjqrTPvbu": { glutes: 0.5 },
  "ZnmjmlIkyyIAskc1Qczo": { glutes: 0.5 },
  "ha6rSmUuqmK6v2rjiTB1": { triceps: 0.5, glutes: 0.5 },
  "XraAam8yYCZWGI1ZF7oA": { glutes: 0.5 },
  "oAoj1ai8K9dc6B9EaFED": { triceps: 0.5 },
  "R968BsNAAeIweal039f2": { glutes: 0.5 },
  "HKltSTpqJQlY9UXrSUCh": { triceps: 0.5 },
  "9lqCm9PgTffJfwAcSVCe": { glutes: 0.5 },
  "TvxDt0y03gmzOZzspHyU": { glutes: 0.5 },
  "U9liue4N8IB3vetWz2wI": { triceps: 0.5 },
  "S0Buy3UoyXWS7OIwDjQ8": { glutes: 0.5 },
  "JClCPcKWAxKiuy7KIgRB": { glutes: 0.5 },
  "eqLYs7TORwMcF6DmezaU": { glutes: 0.5 },
  "R29ea1XKRxWmlqaryCAM": { glutes: 0.5 },
  "Pxffw0KFPTW4a2xyK7fo": { triceps: 0.5, glutes: 0.5 },
  "eC3bgOTVRk6G3NL6Jc54": { triceps: 0.5 },
  "ixeY4g8dtzz8RpoCJtSS": { triceps: 0.5 },
  "eRubABEIIHyzJ7YCzhSe": { glutes: 0.5 },
  "b1EqSp0s3yqv8bpI2Pnn": { glutes: 0.5 },
  "5HdRQfPVfu7Ee1FUHndI": { glutes: 0.5 },
  "e8gWq4e1zsqZ3kiKepWk": { triceps: 0.5 },
  "ls2RllIGdrXboD5nrmf2": { triceps: 0.5 },
  "D2KUzrI3guPkMr356uGH": { triceps: 0.5 },
  "BwVQyCeg3DqNPFqdJser": { triceps: 0.5 },
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
  const [weekRange, setWeekRange] = useState({ startStr: '', endStr: '' })
  const [weekMode, setWeekMode] = useState<WeekMode>('last')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

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

        // Accumulate sets and reps by primaryMuscle
        const muscleData = new Map<string, { sets: number; reps: number; repsCount: number }>()

        // Debug: collect per-exercise detail
        const debugByMuscle: Record<string, { exercises: { name: string; sets: number; reps: number[] }[] }> = {}

        for (const workout of workouts) {
          if (workout.status !== 'completed') continue

          for (const exercise of workout.exercises) {
            const exDef = exerciseMap.get(exercise.exerciseId)
            const primaryMuscle = exDef?.primaryMuscle || exercise.category || 'other'
            const exName = exDef?.name || exercise.exerciseId

            let exSets = 0
            const exReps: number[] = []

            for (const set of exercise.sets) {
              if (!set.completed) continue

              const existing = muscleData.get(primaryMuscle) || { sets: 0, reps: 0, repsCount: 0 }
              existing.sets++
              const reps = set.actualReps || set.targetReps || 0
              if (reps > 0) {
                existing.reps += reps
                existing.repsCount++
              }
              muscleData.set(primaryMuscle, existing)

              exSets++
              exReps.push(reps)

              // Secondary muscle contribution
              const secondary = SECONDARY_MUSCLE_MULTIPLIERS[exercise.exerciseId]
              if (secondary) {
                if (secondary.triceps) {
                  const key = 'triceps'
                  const ex2 = muscleData.get(key) || { sets: 0, reps: 0, repsCount: 0 }
                  ex2.sets += secondary.triceps
                  if (reps > 0) {
                    ex2.reps += reps
                    ex2.repsCount++
                  }
                  muscleData.set(key, ex2)
                }
                if (secondary.glutes) {
                  const key = 'longissimus'
                  const ex2 = muscleData.get(key) || { sets: 0, reps: 0, repsCount: 0 }
                  ex2.sets += secondary.glutes
                  if (reps > 0) {
                    ex2.reps += reps
                    ex2.repsCount++
                  }
                  muscleData.set(key, ex2)
                }
              }
            }

            if (exSets > 0) {
              if (!debugByMuscle[primaryMuscle]) debugByMuscle[primaryMuscle] = { exercises: [] }
              debugByMuscle[primaryMuscle].exercises.push({ name: exName, sets: exSets, reps: exReps })
            }
          }
        }

        // Debug log
        console.log('=== ניתוח שרירים שבועי - דוח מלא ===')
        console.log('טווח תאריכים:', range.start.toLocaleDateString('he-IL'), '—', range.end.toLocaleDateString('he-IL'))
        console.log('מספר אימונים שנמצאו:', workouts.filter(w => w.status === 'completed').length)
        console.log('פירוט לפי תת-שריר:', JSON.stringify(debugByMuscle, null, 2))
        console.log('=== סוף דוח ===')

        // Convert to rows — include ALL sub-muscles from Firebase muscle mapping
        // Track which muscleData keys have been matched to a sub-muscle
        const matchedKeys = new Set<string>()
        const result: MuscleRow[] = []
        for (const primary of muscleMapping) {
          // Check if data was accumulated under the primary muscle ID itself
          // (happens when exercise.primaryMuscle = category name like "arms")
          const primaryData = muscleData.get(primary.id)
          if (primaryData) matchedKeys.add(primary.id)

          for (const sub of primary.subMuscles) {
            // Merge: sub-muscle data + any data under primary ID (distributed evenly)
            const subData = muscleData.get(sub.id)
            if (subData) matchedKeys.add(sub.id)

            const totalSets = (subData?.sets || 0)
            const totalReps = (subData?.reps || 0)
            const repsCount = (subData?.repsCount || 0)
            const avgReps = repsCount > 0
              ? Math.round((totalReps / repsCount) * 10) / 10
              : 0

            result.push({
              category: primary.id,
              categoryHe: primary.nameHe,
              primaryMuscle: sub.id,
              primaryMuscleHe: sub.nameHe,
              totalSets,
              avgReps,
              setsGreen: totalSets >= MIN_SETS,
              repsGreen: avgReps >= MIN_AVG_REPS,
            })
          }

          // If data was accumulated under the primary ID and no sub-muscles consumed it,
          // show it as a row under the primary muscle name
          if (primaryData && primary.subMuscles.length === 0) {
            const avgReps = primaryData.repsCount > 0
              ? Math.round((primaryData.reps / primaryData.repsCount) * 10) / 10
              : 0
            result.push({
              category: primary.id,
              categoryHe: primary.nameHe,
              primaryMuscle: primary.id,
              primaryMuscleHe: primary.nameHe,
              totalSets: primaryData.sets,
              avgReps,
              setsGreen: primaryData.sets >= MIN_SETS,
              repsGreen: avgReps >= MIN_AVG_REPS,
            })
          }
        }

        // Catch any unmatched muscle IDs (data from exercises not mapped to any Firebase muscle)
        for (const [muscleId, data] of muscleData.entries()) {
          if (matchedKeys.has(muscleId)) continue
          // Try to find which primary group this belongs to
          const parent = muscleMapping.find(p => p.subMuscles.some(s => s.id === muscleId))
          const avgReps = data.repsCount > 0
            ? Math.round((data.reps / data.repsCount) * 10) / 10
            : 0
          result.push({
            category: parent?.id || muscleId,
            categoryHe: parent?.nameHe || muscleId,
            primaryMuscle: muscleId,
            primaryMuscleHe: parent?.subMuscles.find(s => s.id === muscleId)?.nameHe || muscleId,
            totalSets: data.sets,
            avgReps,
            setsGreen: data.sets >= MIN_SETS,
            repsGreen: avgReps >= MIN_AVG_REPS,
          })
        }

        // Sort by category, then totalSets desc
        result.sort((a, b) => {
          if (a.category !== b.category) return a.categoryHe.localeCompare(b.categoryHe, 'he')
          return b.totalSets - a.totalSets
        })

        setRows(result)
      } catch (err) {
        console.error('Error analyzing weekly muscles:', err)
      } finally {
        setLoading(false)
      }
    }

    analyze()
  }, [userId, weekMode, getRangeForMode])

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
          <div>
            <h2 className="text-base font-bold text-text-primary">ניתוח ביצוע שבועי</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {weekRange.startStr} – {weekRange.endStr}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
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
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="text-text-secondary text-xs border-b border-dark-border">
                    <th className="text-right py-2 pr-2 font-medium">שריר</th>
                    <th className="text-right py-2 font-medium">תת-שריר</th>
                    <th className="text-right py-2 font-medium">סטים / ממוצע</th>
                    <th className="text-center py-2 pl-2 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.primaryMuscle} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                      <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                      <td className="py-2.5 text-text-secondary">{row.primaryMuscleHe}</td>
                      <td className="py-2.5">
                        {row.totalSets > 0 ? (
                          <>
                            <div className="text-text-primary">{Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)} סטים</div>
                            <div className="text-xs text-text-muted">ממוצע {row.avgReps} חזרות</div>
                          </>
                        ) : (
                          <div className="text-text-muted">—</div>
                        )}
                      </td>
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center justify-center gap-1">
                          {row.setsGreen ? (
                            <TrendingUp className="w-4 h-4 text-status-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-status-error" />
                          )}
                          {row.repsGreen ? (
                            <TrendingUp className="w-4 h-4 text-status-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-status-error" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Legend */}
              <div className="mt-4 flex flex-col gap-1 text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-status-success" />
                    עומד ביעד
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-status-error" />
                    מתחת ליעד
                  </span>
                </div>
                <div>יעד: ≥{MIN_SETS} סטים, ≥{MIN_AVG_REPS} חזרות ממוצע (חץ שמאל=סטים, ימין=חזרות)</div>
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
