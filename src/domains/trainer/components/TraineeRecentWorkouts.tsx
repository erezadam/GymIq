import type { WorkoutHistorySummary } from '@/domains/workouts/types'

interface TraineeRecentWorkoutsProps {
  workouts: WorkoutHistorySummary[]
  isLoading?: boolean
}

const statusConfig: Record<
  string,
  { icon: string; bgColor: string; label: string; labelBg: string; labelText: string }
> = {
  completed: {
    icon: '✓',
    bgColor: 'bg-status-success/20',
    label: 'הושלם',
    labelBg: 'bg-status-success/20',
    labelText: 'text-status-success',
  },
  in_progress: {
    icon: '⚡',
    bgColor: 'bg-status-warning/20',
    label: 'בתהליך',
    labelBg: 'bg-status-warning/20',
    labelText: 'text-status-warning',
  },
  partial: {
    icon: '⚡',
    bgColor: 'bg-accent-orange/20',
    label: 'חלקי',
    labelBg: 'bg-accent-orange/20',
    labelText: 'text-accent-orange',
  },
  cancelled: {
    icon: '✕',
    bgColor: 'bg-dark-card',
    label: 'בוטל',
    labelBg: 'bg-dark-card',
    labelText: 'text-text-muted',
  },
  planned: {
    icon: '📋',
    bgColor: 'bg-status-info/20',
    label: 'מתוכנן',
    labelBg: 'bg-status-info/20',
    labelText: 'text-status-info',
  },
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  return `${mins} דקות`
}

export function TraineeRecentWorkouts({ workouts, isLoading }: TraineeRecentWorkoutsProps) {
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
        <p className="text-sm text-text-muted">אין אימונים עדיין</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5">
      <div className="space-y-3">
        {workouts.map((workout) => {
          const config = statusConfig[workout.status] || statusConfig.planned

          return (
            <div
              key={workout.id}
              className="flex items-center gap-4 p-4 bg-dark-surface/50 rounded-xl hover:bg-dark-surface transition cursor-pointer"
            >
              {/* Status Icon */}
              <div
                className={`w-12 h-12 ${config.bgColor} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}
              >
                {config.icon}
              </div>

              {/* Workout Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-text-primary truncate">{workout.name}</h4>
                  <span
                    className={`px-2 py-0.5 ${config.labelBg} ${config.labelText} text-xs rounded flex-shrink-0`}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-text-muted text-sm mt-0.5">
                  {formatDate(workout.date)}
                  {workout.duration ? ` • ${formatDuration(workout.duration)}` : ''}
                  {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                    <> • {workout.muscleGroups.slice(0, 2).join(', ')}</>
                  )}
                </p>
              </div>

              {/* Exercise count */}
              <div className="text-left flex-shrink-0 hidden xs:block">
                <div className="text-sm text-text-secondary">
                  {workout.completedExercises}/{workout.totalExercises}
                </div>
                <div className="text-xs text-text-muted">תרגילים</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
