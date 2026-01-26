/**
 * WorkoutCard Component
 * Reusable workout card with expandable details
 * Extracted from WorkoutHistory.tsx to reduce code duplication
 */

import { Link } from 'react-router-dom'
import {
  Dumbbell,
  Trophy,
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  Zap,
  Trash2,
} from 'lucide-react'
import { getMuscleNameHe } from '@/utils/muscleTranslations'
import type { WorkoutHistorySummary, WorkoutHistoryEntry, WorkoutCompletionStatus } from '@/domains/workouts/types'

export interface StatusConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  bgClass: string
  borderClass: string
  textClass: string
  iconBgClass: string
  iconTextClass: string
}

export interface WorkoutCardProps {
  workout: WorkoutHistorySummary
  isExpanded: boolean
  statusConfig: StatusConfig
  expandedWorkoutDetails: WorkoutHistoryEntry | null
  loadingDetails: boolean
  dynamicMuscleNames: Record<string, string>
  bandNameMap?: Record<string, string>  // Map of bandId -> bandName (Hebrew)
  type: 'planned' | 'regular'
  onToggleExpand: () => void
  onDeleteClick: (e: React.MouseEvent) => void
  onContinueClick: () => void
  getStatusBadge: (status: WorkoutCompletionStatus) => React.ReactNode
  formatDate: (date: Date) => string
  formatDuration: (minutes: number) => string
  estimateCalories: (duration: number, volume: number) => number
}

export function WorkoutCard({
  workout,
  isExpanded,
  statusConfig,
  expandedWorkoutDetails,
  loadingDetails,
  dynamicMuscleNames,
  bandNameMap = {},
  type,
  onToggleExpand,
  onDeleteClick,
  onContinueClick,
  getStatusBadge,
  formatDate,
  formatDuration,
  estimateCalories,
}: WorkoutCardProps) {
  const showDetailedStats = type === 'regular'

  return (
    <div
      className={`rounded-xl transition-colors border-2 ${statusConfig.bgClass} ${statusConfig.borderClass}`}
    >
      {/* Card Header - clickable to expand */}
      <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.iconBgClass}`}>
              <Dumbbell className={`w-6 h-6 ${statusConfig.iconTextClass}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-text-primary">{workout.name}</p>
                {getStatusBadge(workout.status)}
                {showDetailedStats && workout.personalRecords > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/20 rounded-full">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs">{workout.personalRecords} PR</span>
                  </span>
                )}
              </div>
              {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                <p className="text-red-400 text-sm mt-1">
                  {workout.muscleGroups
                    .map((muscle) => getMuscleNameHe(muscle, dynamicMuscleNames))
                    .filter((name, index, self) => self.indexOf(name) === index)
                    .join(' • ')}
                </p>
              )}
              <p className="text-text-muted text-sm mt-1">
                {showDetailedStats
                  ? `${formatDate(workout.date)} • ${workout.duration} דקות • ${workout.completedExercises}/${workout.totalExercises} תרגילים`
                  : `${formatDate(workout.date)} • ${workout.totalExercises} תרגילים`}
              </p>
            </div>
          </div>
          {/* Delete button */}
          <button
            onClick={onDeleteClick}
            className="p-2 text-text-muted hover:text-red-400 transition-colors"
            aria-label="מחק אימון"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-dark-border/50 pt-4 space-y-4">
          {/* Stats: Time and Calories */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-dark-card/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">זמן</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {formatDuration(workout.duration)}
              </p>
            </div>
            <div className="text-center p-3 bg-dark-card/50 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-sm">קלוריות</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {workout.calories ?? estimateCalories(workout.duration, workout.totalVolume)}
              </p>
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={onContinueClick}
            className="w-full py-3 px-4 bg-primary-400 hover:bg-primary-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Play className="w-5 h-5" />
            המשך לאימון
          </button>

          {/* Exercise List */}
          {loadingDetails ? (
            <div className="flex items-center justify-center py-4">
              <div className="spinner"></div>
            </div>
          ) : expandedWorkoutDetails?.exercises && expandedWorkoutDetails.exercises.length > 0 ? (
            <div className="space-y-3">
              {expandedWorkoutDetails.exercises.map((exercise, idx) => (
                <div key={idx} className="bg-dark-card/30 rounded-xl p-3">
                  <p className="font-medium text-text-primary mb-2">
                    {exercise.exerciseNameHe || exercise.exerciseName}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                    <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                      סטים: {exercise.sets?.length || 0}
                    </span>
                    <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                      חזרות: {exercise.sets?.[0]?.targetReps || exercise.sets?.[0]?.actualReps || '--'}
                    </span>
                    {/* Graviton - show assistance weight */}
                    {exercise.sets?.[0]?.assistanceWeight ? (
                      <span className="px-2 py-0.5 bg-teal-500/20 text-teal-400 rounded">
                        עזרה: {exercise.sets[0].assistanceWeight} ק"ג
                      </span>
                    ) : exercise.sets?.[0]?.assistanceBand ? (
                      /* Bands - show band name */
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                        גומייה: {bandNameMap[exercise.sets[0].assistanceBand] || exercise.sets[0].assistanceBand}
                      </span>
                    ) : (
                      /* Regular exercise - show weight */
                      <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                        משקל: {exercise.sets?.[0]?.targetWeight || exercise.sets?.[0]?.actualWeight || '--'} ק"ג
                      </span>
                    )}
                  </div>
                  {exercise.notes && (
                    <p className="text-sm text-text-muted mt-2 italic border-r-2 border-primary-main pr-2">
                      {exercise.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {/* Link to details */}
          <Link
            to={`/workout/history/${workout.id}`}
            className="block text-center text-text-muted hover:text-primary-400 text-sm"
          >
            צפה בפרטים
          </Link>
        </div>
      )}
    </div>
  )
}
