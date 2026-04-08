import { useState } from 'react'
import { ChevronDown, ChevronLeft, Check, Loader2, Pencil } from 'lucide-react'
import { getWorkoutById, getUserWorkoutHistoryPaginated } from '@/lib/firebase/workoutHistory'
import type { WorkoutHistorySummary, WorkoutHistoryEntry } from '@/domains/workouts/types'

interface TraineeRecentWorkoutsProps {
  workouts: WorkoutHistorySummary[]
  traineeId: string
  isLoading?: boolean
  onEditWorkout?: (workout: WorkoutHistoryEntry) => void
}

const statusConfig: Record<
  string,
  { icon: string; label: string; labelBg: string; labelText: string }
> = {
  completed: {
    icon: '✓',
    label: 'הושלם',
    labelBg: 'bg-status-success/20',
    labelText: 'text-status-success',
  },
  in_progress: {
    icon: '⚡',
    label: 'בתהליך',
    labelBg: 'bg-status-warning/20',
    labelText: 'text-status-warning',
  },
  partial: {
    icon: '⚡',
    label: 'חלקי',
    labelBg: 'bg-accent-orange/20',
    labelText: 'text-accent-orange',
  },
  cancelled: {
    icon: '✕',
    label: 'בוטל',
    labelBg: 'bg-dark-card',
    labelText: 'text-on-surface-variant',
  },
  planned: {
    icon: '📋',
    label: 'מתוכנן',
    labelBg: 'bg-status-info/20',
    labelText: 'text-status-info',
  },
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  return `${mins} דקות`
}

type StatusFilter = 'all' | 'completed' | 'in_progress' | 'cancelled' | 'planned'

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'הכל' },
  { id: 'completed', label: 'הושלם' },
  { id: 'in_progress', label: 'בתהליך' },
  { id: 'cancelled', label: 'בוטל' },
  { id: 'planned', label: 'מתוכנן' },
]

export function TraineeRecentWorkouts({ workouts: initialWorkouts, traineeId, isLoading, onEditWorkout }: TraineeRecentWorkoutsProps) {
  const [allWorkouts, setAllWorkouts] = useState<WorkoutHistorySummary[]>(initialWorkouts)
  const [hasMore, setHasMore] = useState(initialWorkouts.length >= 10)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [expandedWorkoutData, setExpandedWorkoutData] = useState<WorkoutHistoryEntry | null>(null)
  const [loadingExpand, setLoadingExpand] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Sync with parent prop when it changes
  const rawWorkouts = allWorkouts.length > initialWorkouts.length ? allWorkouts : initialWorkouts
  const workouts = statusFilter === 'all'
    ? rawWorkouts
    : rawWorkouts.filter(w => w.status === statusFilter || (statusFilter === 'in_progress' && w.status === 'partial'))

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || rawWorkouts.length === 0) return
    setLoadingMore(true)
    try {
      const lastDate = rawWorkouts[rawWorkouts.length - 1].date
      const result = await getUserWorkoutHistoryPaginated(traineeId, 20, lastDate, true)
      setAllWorkouts([...rawWorkouts, ...result.summaries])
      setHasMore(result.hasMore)
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false)
    }
  }

  const handleToggleExpand = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null)
      setExpandedWorkoutData(null)
      return
    }
    setExpandedWorkoutId(workoutId)
    setExpandedWorkoutData(null)
    setLoadingExpand(true)
    try {
      const data = await getWorkoutById(workoutId)
      setExpandedWorkoutData(data)
    } catch {
      setExpandedWorkoutData(null)
    } finally {
      setLoadingExpand(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-dark-surface rounded-xl" />
        ))}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 text-center py-8">
        <p className="text-sm text-on-surface-variant">אין אימונים עדיין</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5">
      {/* Status Filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {STATUS_FILTERS.map(filter => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              statusFilter === filter.id
                ? 'bg-primary-main/20 text-primary-main border border-primary-main/30'
                : 'bg-dark-surface/50 text-on-surface-variant border border-transparent hover:text-on-surface-variant'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {workouts.length === 0 ? (
          <p className="text-sm text-on-surface-variant text-center py-4">אין אימונים בסטטוס זה</p>
        ) : null}
        {workouts.map((workout, index) => {
          const isDeleted = !!workout.deletedByTrainee
          const config = statusConfig[workout.status] || statusConfig.planned
          const isExpanded = expandedWorkoutId === workout.id
          const isTrainerReported = !!workout.reportedBy
          const serialNumber = index + 1

          // Color scheme: purple for trainer-reported, blue (primary) for self-reported
          const accentColor = isTrainerReported ? 'accent-purple' : 'primary-main'
          const iconBg = isDeleted
            ? 'bg-red-500/20'
            : isTrainerReported
              ? 'bg-accent-purple/20'
              : 'bg-primary-main/20'
          const numberColor = isDeleted
            ? 'text-red-400'
            : isTrainerReported
              ? 'text-accent-purple'
              : 'text-primary-main'

          return (
            <div
              key={workout.id}
              className={`rounded-xl overflow-hidden border ${
                isDeleted
                  ? 'bg-red-500/5 border-red-500/20 opacity-60'
                  : isTrainerReported
                    ? 'bg-accent-purple/5 border-accent-purple/20'
                    : 'bg-dark-surface/50 border-transparent'
              }`}
            >
              {/* Workout header - clickable */}
              <button
                onClick={() => handleToggleExpand(workout.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-dark-surface/50 transition text-right"
              >
                {/* Serial number + status */}
                <div
                  className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <span className={`text-sm font-bold ${numberColor}`}>
                    #{serialNumber}
                  </span>
                </div>

                {/* Workout Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-bold truncate text-sm ${isDeleted ? 'text-on-surface-variant line-through' : 'text-text-primary'}`}>{workout.name}</h4>
                    {isDeleted ? (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded flex-shrink-0">
                        נמחק
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 ${config.labelBg} ${config.labelText} text-xs rounded flex-shrink-0`}
                      >
                        {config.label}
                      </span>
                    )}
                    {isTrainerReported && (
                      <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded flex-shrink-0">
                        מאמן
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    {formatDate(workout.date)}
                    {workout.duration ? ` • ${formatDuration(workout.duration)}` : ''}
                    {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                      <> • {workout.muscleGroups.slice(0, 2).join(', ')}</>
                    )}
                  </p>
                  {isDeleted && (
                    <p className="text-red-400/70 text-xs mt-0.5">
                      נמחק ב-{(() => {
                        const d = workout.deletedByTrainee?.deletedAt instanceof Date
                          ? workout.deletedByTrainee.deletedAt
                          : new Date()
                        return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
                      })()}
                      {workout.deletedByTrainee?.reason && ` • סיבה: ${workout.deletedByTrainee.reason}`}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className={`w-4 h-4 text-${accentColor}`} />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-on-surface-variant" />
                  )}
                </div>
              </button>

              {/* Expanded: exercises + performance */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-dark-border/50">
                  {loadingExpand && (
                    <div className="flex justify-center py-3">
                      <div className="spinner w-4 h-4" />
                    </div>
                  )}

                  {expandedWorkoutData && expandedWorkoutData.exercises && (
                    <div className="space-y-1.5 pt-3">
                      {expandedWorkoutData.exercises.map((ex, exIdx) => {
                        const completedSets = ex.sets?.filter(
                          s => s.completed || (s.actualReps && s.actualReps > 0)
                        )

                        return (
                          <div
                            key={`${ex.exerciseId}-${exIdx}`}
                            className="rounded-lg bg-dark-card/40 overflow-hidden"
                          >
                            <div className="flex items-center gap-3 py-2 px-2">
                              {ex.imageUrl ? (
                                <img
                                  src={ex.imageUrl}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-dark-surface flex items-center justify-center text-sm flex-shrink-0">
                                  🏋️
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text-primary truncate">
                                  {ex.exerciseNameHe || ex.exerciseName}
                                </div>
                              </div>
                              <div className="text-xs text-on-surface-variant flex-shrink-0">
                                {ex.sets?.length || 0} סטים
                              </div>
                            </div>

                            {/* Actual sets */}
                            {completedSets && completedSets.length > 0 && (
                              <div className="px-2 pb-2 pr-14 space-y-0.5">
                                {completedSets.map((set, setIdx) => {
                                  const isLast = setIdx === completedSets.length - 1
                                  const setTime = (set as any).time as number | undefined
                                  const hasTime = setTime !== undefined && setTime > 0
                                  const hasReps = (set.actualReps || 0) > 0
                                  const hasWeight = (set.actualWeight || 0) > 0
                                  return (
                                    <div
                                      key={setIdx}
                                      className="flex items-center gap-1.5 text-xs text-on-surface-variant"
                                    >
                                      <span className="text-status-success/50">
                                        {isLast ? '└─' : '├─'}
                                      </span>
                                      <span>סט {setIdx + 1}:</span>
                                      <span className="text-on-surface-variant">
                                        {hasTime && (
                                          <>{`${Math.floor(setTime! / 60)}:${(setTime! % 60).toString().padStart(2, '0')}`} דק׳{(hasReps || hasWeight) && ' • '}</>
                                        )}
                                        {hasWeight && (
                                          <>{set.actualWeight} ק&quot;ג × </>
                                        )}
                                        {hasReps && <>{set.actualReps} חזרות</>}
                                        {!hasTime && !hasReps && !hasWeight && '—'}
                                      </span>
                                      {set.completed && (
                                        <Check className="w-3 h-3 text-status-success" />
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Summary row */}
                      <div className="flex items-center justify-between pt-2 text-xs text-on-surface-variant border-t border-dark-border/30 mt-2">
                        <div className="flex items-center gap-2">
                          <span>{expandedWorkoutData.completedExercises}/{expandedWorkoutData.totalExercises} תרגילים</span>
                          {expandedWorkoutData.lastEditedByTrainer && (
                            <span className="text-accent-purple text-[10px]">
                              נערך ע״י מאמן
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {expandedWorkoutData.totalVolume > 0 && (
                            <span>{Math.round(expandedWorkoutData.totalVolume)} ק&quot;ג נפח כולל</span>
                          )}
                          {onEditWorkout && workout.status !== 'in_progress' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditWorkout(expandedWorkoutData)
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-accent-purple/10 text-accent-purple rounded-lg hover:bg-accent-purple/20 transition"
                            >
                              <Pencil className="w-3 h-3" />
                              <span className="text-[10px] font-medium">עריכה</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!loadingExpand && !expandedWorkoutData && (
                    <div className="text-center py-3 text-xs text-on-surface-variant">
                      לא נמצאו נתונים
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Load more button */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full mt-3 py-2 text-sm text-primary-main hover:text-primary-main/80 transition flex items-center justify-center gap-2"
        >
          {loadingMore ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>טוען...</span>
            </>
          ) : (
            <span>טען עוד אימונים</span>
          )}
        </button>
      )}
    </div>
  )
}
