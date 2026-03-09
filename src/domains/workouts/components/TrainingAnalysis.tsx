/**
 * Training Analysis Screen
 * Displays AI-powered training analysis results
 * Loads cached analysis first, calls API only for new analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { getUserWorkoutHistoryByDateRange } from '@/lib/firebase/workoutHistory'
import { getExercises } from '@/lib/firebase/exercises'
import { defaultMuscleMapping } from '@/domains/exercises/types/muscles'
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

// Build sub-muscle → category mapping from defaultMuscleMapping (single source of truth)
const SUB_TO_CATEGORY: Record<string, { categoryId: string; categoryHe: string }> = {}
const SUB_MUSCLE_HE: Record<string, string> = {}

for (const primary of defaultMuscleMapping) {
  // Map category itself
  SUB_TO_CATEGORY[primary.id] = { categoryId: primary.id, categoryHe: primary.nameHe }
  SUB_MUSCLE_HE[primary.id] = primary.nameHe
  // Map each sub-muscle
  for (const sub of primary.subMuscles) {
    SUB_TO_CATEGORY[sub.id] = { categoryId: primary.id, categoryHe: primary.nameHe }
    SUB_MUSCLE_HE[sub.id] = sub.nameHe
  }
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

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

  return { start: lastSunday, end: lastSaturday, startStr: fmt(lastSunday), endStr: fmt(lastSaturday) }
}

function WeeklyMuscleModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MuscleRow[]>([])
  const [weekRange, setWeekRange] = useState({ startStr: '', endStr: '' })

  useEffect(() => {
    const analyze = async () => {
      try {
        const range = getLastFullWeekRange()
        setWeekRange({ startStr: range.startStr, endStr: range.endStr })

        const [workouts, exercises] = await Promise.all([
          getUserWorkoutHistoryByDateRange(userId, range.start, range.end),
          getExercises(),
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

        // Convert to rows — include ALL sub-muscles from defaultMuscleMapping
        const result: MuscleRow[] = []
        for (const primary of defaultMuscleMapping) {
          for (const sub of primary.subMuscles) {
            const data = muscleData.get(sub.id)
            const totalSets = data?.sets || 0
            const avgReps = data && data.repsCount > 0
              ? Math.round((data.reps / data.repsCount) * 10) / 10
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
  }, [userId])

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

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
          {loading ? (
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
                            <div className="text-text-primary">{row.totalSets} סטים</div>
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
