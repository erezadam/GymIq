import { Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'

interface TraineeRecentWorkoutsProps {
  workouts: WorkoutHistorySummary[]
  isLoading?: boolean
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-status-success', label: 'הושלם' },
  in_progress: { icon: Clock, color: 'text-status-warning', label: 'בתהליך' },
  partial: { icon: AlertCircle, color: 'text-accent-orange', label: 'חלקי' },
  cancelled: { icon: XCircle, color: 'text-text-muted', label: 'בוטל' },
  planned: { icon: Clock, color: 'text-status-info', label: 'מתוכנן' },
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  const mins = Math.round(seconds / 60)
  return `${mins} דק`
}

export function TraineeRecentWorkouts({ workouts, isLoading }: TraineeRecentWorkoutsProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-dark-card rounded-lg" />
        ))}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm text-text-muted">אין אימונים עדיין</p>
      </div>
    )
  }

  return (
    <div className="card divide-y divide-dark-border/50">
      {workouts.map((workout) => {
        const status = statusConfig[workout.status] || statusConfig.planned
        const StatusIcon = status.icon

        return (
          <div key={workout.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {/* Status icon */}
            <StatusIcon className={`w-5 h-5 ${status.color} flex-shrink-0`} />

            {/* Workout info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {workout.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>{formatDate(workout.date)}</span>
                <span>·</span>
                <span>{formatDuration(workout.duration)}</span>
                {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{workout.muscleGroups.slice(0, 2).join(', ')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="text-left flex-shrink-0">
              <p className="text-sm font-medium text-text-primary">
                {workout.completedExercises}/{workout.totalExercises}
              </p>
              <p className="text-xs text-text-muted">תרגילים</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
