import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { X, BarChart3, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { getUserWorkoutHistoryByDateRange } from '@/lib/firebase/workoutHistory'
import { getExercises } from '@/lib/firebase/exercises'
import { getMuscleNameHe, getCategoryNameHe } from '@/utils/muscleTranslations'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import type { AIInsight } from '@/domains/trainer/hooks/useTraineeAnalytics'
import type { Exercise } from '@/domains/exercises/types/exercise.types'

const WEEKS_TO_ANALYZE = 4

// Recommended weekly sets per category (evidence-based hypertrophy ranges)
const CATEGORY_WEEKLY_SET_TARGETS: Record<string, number> = {
  chest: 10,
  back: 12,
  legs: 12,
  shoulders: 10,
  arms: 8,
  core: 6,
  cardio: 0,
  functional: 0,
  stretching: 0,
}

// Map primaryMuscle → parent category
const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: 'chest',
  upper_chest: 'chest',
  mid_chest: 'chest',
  lower_chest: 'chest',
  lats: 'back',
  upper_back: 'back',
  lower_back: 'back',
  traps: 'back',
  rhomboids: 'back',
  middle_traps: 'back',
  quadriceps: 'legs',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  front_delt: 'shoulders',
  side_delt: 'shoulders',
  rear_delt: 'shoulders',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  abs: 'core',
  obliques: 'core',
  lower_abs: 'core',
  core: 'core',
}

interface SubMuscleRow {
  primaryMuscle: string
  primaryMuscleHe: string
  totalSets: number
  avgSetsPerWeek: number
  avgReps: number
}

interface CategoryRow {
  category: string
  categoryHe: string
  totalSets: number
  avgSetsPerWeek: number
  targetSetsPerWeek: number
  subMuscles: SubMuscleRow[]
  isOnTarget: boolean
}

function getAnalysisRange(weeks: number) {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(now)
  start.setDate(now.getDate() - weeks * 7)
  start.setHours(0, 0, 0, 0)

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

  return { start, end, startStr: fmt(start), endStr: fmt(end) }
}

function MuscleAnalysisModal({ onClose }: { onClose: () => void }) {
  const { id: traineeId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState({ startStr: '', endStr: '' })
  const [workoutCount, setWorkoutCount] = useState(0)

  useEffect(() => {
    if (!traineeId) return

    const analyze = async () => {
      try {
        const range = getAnalysisRange(WEEKS_TO_ANALYZE)
        setDateRange({ startStr: range.startStr, endStr: range.endStr })

        const [workouts, exercises] = await Promise.all([
          getUserWorkoutHistoryByDateRange(traineeId, range.start, range.end),
          getExercises(),
        ])

        const completedWorkouts = workouts.filter(w => w.status === 'completed')
        setWorkoutCount(completedWorkouts.length)

        // Build exercise lookup
        const exerciseMap = new Map<string, Exercise>()
        for (const ex of exercises) {
          exerciseMap.set(ex.id, ex)
        }

        // Accumulate sets and reps by primaryMuscle
        const muscleData = new Map<string, { sets: number; reps: number; repsCount: number }>()

        for (const workout of completedWorkouts) {
          for (const exercise of workout.exercises) {
            const exDef = exerciseMap.get(exercise.exerciseId)
            const primaryMuscle = exDef?.primaryMuscle || exercise.category || 'other'

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
            }
          }
        }

        // Group by category
        const categoryMap = new Map<string, { totalSets: number; subMuscles: SubMuscleRow[] }>()

        for (const [muscle, data] of muscleData) {
          const category = MUSCLE_TO_CATEGORY[muscle] || muscle
          const avgReps = data.repsCount > 0 ? Math.round((data.reps / data.repsCount) * 10) / 10 : 0
          const avgSetsPerWeek = Math.round((data.sets / WEEKS_TO_ANALYZE) * 10) / 10

          const subRow: SubMuscleRow = {
            primaryMuscle: muscle,
            primaryMuscleHe: getMuscleNameHe(muscle),
            totalSets: data.sets,
            avgSetsPerWeek,
            avgReps,
          }

          const existing = categoryMap.get(category) || { totalSets: 0, subMuscles: [] }
          existing.totalSets += data.sets
          existing.subMuscles.push(subRow)
          categoryMap.set(category, existing)
        }

        // Build category rows
        const result: CategoryRow[] = []
        for (const [cat, data] of categoryMap) {
          const target = CATEGORY_WEEKLY_SET_TARGETS[cat] ?? 8
          const avgSetsPerWeek = Math.round((data.totalSets / WEEKS_TO_ANALYZE) * 10) / 10

          // Sort sub-muscles by sets desc
          data.subMuscles.sort((a, b) => b.totalSets - a.totalSets)

          result.push({
            category: cat,
            categoryHe: getCategoryNameHe(cat),
            totalSets: data.totalSets,
            avgSetsPerWeek,
            targetSetsPerWeek: target,
            subMuscles: data.subMuscles,
            isOnTarget: avgSetsPerWeek >= target,
          })
        }

        // Sort: off-target first, then by avgSetsPerWeek desc
        result.sort((a, b) => {
          if (a.isOnTarget !== b.isOnTarget) return a.isOnTarget ? 1 : -1
          return b.avgSetsPerWeek - a.avgSetsPerWeek
        })

        setCategories(result)
      } catch (err) {
        console.error('Error analyzing muscles:', err)
      } finally {
        setLoading(false)
      }
    }

    analyze()
  }, [traineeId])

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  // Compute summary stats
  const totalSets = categories.reduce((s, c) => s + c.totalSets, 0)
  const onTargetCount = categories.filter(c => c.isOnTarget).length
  const offTargetCount = categories.filter(c => !c.isOnTarget && c.targetSetsPerWeek > 0).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-dark-elevated border border-dark-border"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <div>
            <h2 className="text-base font-bold text-text-primary">ניתוח נפח אימון</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {WEEKS_TO_ANALYZE} שבועות אחרונים ({dateRange.startStr} – {dateRange.endStr})
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
          ) : categories.length === 0 ? (
            <p className="text-center text-text-secondary py-12">
              לא נמצאו אימונים ב-{WEEKS_TO_ANALYZE} שבועות האחרונים
            </p>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between bg-dark-card rounded-xl p-3 mb-4 text-xs">
                <div className="text-text-secondary">
                  <span className="text-text-primary font-semibold">{workoutCount}</span> אימונים
                </div>
                <div className="text-text-secondary">
                  <span className="text-text-primary font-semibold">{totalSets}</span> סטים סה"כ
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-status-success">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {onTargetCount}
                  </span>
                  {offTargetCount > 0 && (
                    <span className="flex items-center gap-1 text-status-error">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {offTargetCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Category cards */}
              <div className="space-y-2">
                {categories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.category)
                  const pct = cat.targetSetsPerWeek > 0
                    ? Math.min(Math.round((cat.avgSetsPerWeek / cat.targetSetsPerWeek) * 100), 150)
                    : 100
                  const barColor = cat.isOnTarget ? 'bg-status-success' : 'bg-status-error'

                  return (
                    <div key={cat.category} className="bg-dark-card rounded-xl overflow-hidden">
                      {/* Category header - clickable */}
                      <button
                        onClick={() => toggleCategory(cat.category)}
                        className="w-full flex items-center gap-3 p-3 text-right hover:bg-dark-border/30 transition"
                      >
                        {/* Status icon */}
                        <div className="flex-shrink-0">
                          {cat.isOnTarget ? (
                            <TrendingUp className="w-5 h-5 text-status-success" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-status-error" />
                          )}
                        </div>

                        {/* Category info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-text-primary">
                              {cat.categoryHe}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {cat.avgSetsPerWeek}/{cat.targetSetsPerWeek} סטים/שבוע
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Expand icon */}
                        {cat.subMuscles.length > 1 && (
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-text-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-text-muted" />
                            )}
                          </div>
                        )}
                      </button>

                      {/* Sub-muscles (expanded) */}
                      {isExpanded && cat.subMuscles.length > 1 && (
                        <div className="border-t border-dark-border/50 px-3 pb-3">
                          {cat.subMuscles.map((sub) => (
                            <div
                              key={sub.primaryMuscle}
                              className="flex items-center justify-between py-2 text-xs border-b border-dark-border/30 last:border-0"
                            >
                              <span className="text-text-secondary">{sub.primaryMuscleHe}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-text-primary">
                                  {sub.avgSetsPerWeek} סטים/שבוע
                                </span>
                                <span className="text-text-muted w-20 text-left">
                                  ממוצע {sub.avgReps} חזרות
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-status-success" />
                  עומד ביעד השבועי
                </span>
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-status-error" />
                  מתחת ליעד
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface AIInsightsProps {
  insights: AIInsight[]
}

export function AIInsights({ insights }: AIInsightsProps) {
  const [showMuscleModal, setShowMuscleModal] = useState(false)

  if (insights.length === 0) return null

  return (
    <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-purple-700 flex items-center justify-center text-base">
            🤖
          </div>
          <span className="text-sm font-semibold text-accent-purple">תובנות AI למאמן</span>
        </div>

        <button
          onClick={() => setShowMuscleModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-neon-blue to-primary-main text-dark-bg text-xs font-semibold shadow-neon hover:shadow-neon-hover active:shadow-neon-active active:scale-95 transition-all"
        >
          <BarChart3 className="w-4 h-4" />
          <span>ניתוח שרירים</span>
        </button>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="bg-dark-card/80 rounded-xl p-3">
            <div className="text-[13px] font-semibold mb-1 flex items-center gap-1.5">
              <span>{insight.icon}</span>
              <span className="text-text-primary">{insight.title}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>

      {showMuscleModal && (
        <MuscleAnalysisModal onClose={() => setShowMuscleModal(false)} />
      )}
    </div>
  )
}
