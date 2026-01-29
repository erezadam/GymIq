/**
 * AIBundleCard Component
 * Displays a group of AI-generated workouts as a single expandable card
 * Purple styling as defined in style_and_ui.md
 */

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Play,
  Trash2,
  Dumbbell,
} from 'lucide-react'
import { getMuscleNameHe } from '@/utils/muscleTranslations'
import { getWorkoutById } from '@/lib/firebase/workoutHistory'
import type { WorkoutHistorySummary, WorkoutHistoryEntry, WorkoutCompletionStatus } from '@/domains/workouts/types'

export interface AIBundleCardProps {
  bundleId: string
  workouts: WorkoutHistorySummary[]
  dynamicMuscleNames: Record<string, string>
  onWorkoutClick: (workout: WorkoutHistorySummary) => void
  onDeleteBundle: (bundleId: string, workoutIds: string[]) => void
  formatDate: (date: Date) => string
  getStatusBadge: (status: WorkoutCompletionStatus) => React.ReactNode
}

export function AIBundleCard({
  bundleId,
  workouts,
  dynamicMuscleNames,
  onWorkoutClick,
  onDeleteBundle,
  // formatDate - available for future use
  getStatusBadge,
}: AIBundleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [expandedWorkoutDetails, setExpandedWorkoutDetails] = useState<WorkoutHistoryEntry | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Toggle workout expansion and load details
  const toggleWorkoutExpanded = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      // Closing the expanded workout
      setExpandedWorkoutId(null)
      setExpandedWorkoutDetails(null)
      return
    }

    // Opening a new workout - load full details
    setExpandedWorkoutId(workoutId)
    setLoadingDetails(true)
    setExpandedWorkoutDetails(null)

    try {
      const details = await getWorkoutById(workoutId)
      setExpandedWorkoutDetails(details)
    } catch (error) {
      console.error('Failed to load workout details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Filter out completed workouts from bundle display
  const pendingWorkouts = workouts.filter(w => w.status !== 'completed')
  const completedCount = workouts.length - pendingWorkouts.length

  // Get all unique muscle groups across all workouts
  const allMuscleGroups = [...new Set(
    workouts.flatMap(w => w.muscleGroups || [])
  )]

  // Total estimated duration
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0)

  // Don't render if all workouts are completed
  if (pendingWorkouts.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl transition-colors border-2 border-purple-500 bg-gradient-to-r from-purple-500/20 to-purple-600/10">
      {/* Card Header - clickable to expand */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-purple-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-400" />
              )}
            </button>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/20">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-purple-400">
                  מקבץ אימוני AI
                </p>
                <span className="text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full text-xs">
                  {pendingWorkouts.length} אימונים
                </span>
                {completedCount > 0 && (
                  <span className="text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full text-xs">
                    {completedCount} הושלמו
                  </span>
                )}
              </div>
              {allMuscleGroups.length > 0 && (
                <p className="text-purple-300/70 text-sm mt-1">
                  {allMuscleGroups
                    .map(muscle => getMuscleNameHe(muscle, dynamicMuscleNames))
                    .filter((name, index, self) => self.indexOf(name) === index)
                    .slice(0, 4)
                    .join(' • ')}
                  {allMuscleGroups.length > 4 && ' ...'}
                </p>
              )}
              <p className="text-text-muted text-sm mt-1">
                סה"כ ~{totalDuration} דקות
              </p>
            </div>
          </div>
          {/* Delete bundle button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteBundle(bundleId, workouts.map(w => w.id))
            }}
            className="p-2 text-text-muted hover:text-red-400 transition-colors"
            aria-label="מחק מקבץ"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Content - List of workouts */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-purple-500/30 pt-4 space-y-3">
          {pendingWorkouts.map((workout, index) => (
            <div
              key={workout.id}
              className="bg-dark-card/50 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-colors overflow-hidden"
            >
              {/* Workout Header - clickable to expand */}
              <div
                className="p-3 cursor-pointer"
                onClick={() => toggleWorkoutExpanded(workout.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400 font-bold text-sm">
                      {workout.aiWorkoutNumber || index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary text-sm">
                          {workout.name}
                        </p>
                        {getStatusBadge(workout.status)}
                      </div>
                      {workout.muscleGroups && workout.muscleGroups.length > 0 && (
                        <p className="text-purple-300/60 text-xs mt-0.5">
                          {workout.muscleGroups
                            .map(muscle => getMuscleNameHe(muscle, dynamicMuscleNames))
                            .join(' • ')}
                        </p>
                      )}
                      <p className="text-text-muted text-xs mt-0.5">
                        {workout.totalExercises} תרגילים • {workout.duration} דקות
                        {expandedWorkoutId !== workout.id && (
                          <span className="text-purple-400/70 mr-2">• לחץ לפרטים</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedWorkoutId === workout.id ? (
                      <ChevronUp className="w-4 h-4 text-purple-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-purple-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onWorkoutClick(workout)
                      }}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                      aria-label="התחל אימון"
                    >
                      <Play className="w-5 h-5 text-purple-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded workout exercises */}
              {expandedWorkoutId === workout.id && (
                <div className="border-t border-purple-500/20 bg-dark-surface/30">
                  {loadingDetails ? (
                    <div className="p-4 text-center">
                      <div className="inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-text-muted text-sm mt-2">טוען תרגילים...</p>
                    </div>
                  ) : expandedWorkoutDetails?.exercises ? (
                    <div className="p-3 space-y-2">
                      {expandedWorkoutDetails.exercises.map((exercise, exIndex) => (
                        <div
                          key={exercise.exerciseId || exIndex}
                          className="flex items-center gap-3 p-2 rounded-lg bg-dark-card/50"
                        >
                          {/* Exercise image or icon */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-purple-500/10">
                            {exercise.imageUrl ? (
                              <img
                                src={exercise.imageUrl}
                                alt={exercise.exerciseNameHe || exercise.exerciseName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Dumbbell className="w-5 h-5 text-purple-400" />
                              </div>
                            )}
                          </div>
                          {/* Exercise info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-sm font-medium truncate">
                              {exercise.exerciseNameHe || exercise.exerciseName}
                            </p>
                            {/* AI Recommendation line */}
                            {expandedWorkoutDetails.aiRecommendations?.[exercise.exerciseId] ? (
                              <p className="text-xs mt-0.5" style={{ color: '#A855F7' }}>
                                {'\u{1F4A1}'} המלצה: {expandedWorkoutDetails.aiRecommendations[exercise.exerciseId].weight > 0
                                  ? `${expandedWorkoutDetails.aiRecommendations[exercise.exerciseId].weight}kg \u00D7 `
                                  : ''}{expandedWorkoutDetails.aiRecommendations[exercise.exerciseId].repRange} ({expandedWorkoutDetails.aiRecommendations[exercise.exerciseId].sets} סטים)
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-text-muted text-sm">
                      לא נמצאו תרגילים
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AIBundleCard
