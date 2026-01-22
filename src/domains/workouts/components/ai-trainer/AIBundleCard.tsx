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
} from 'lucide-react'
import { getMuscleNameHe } from '@/utils/muscleTranslations'
import type { WorkoutHistorySummary, WorkoutCompletionStatus } from '@/domains/workouts/types'

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
              className="bg-dark-card/50 rounded-xl p-3 border border-purple-500/20 hover:border-purple-500/50 transition-colors"
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
                    </p>
                  </div>
                </div>
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
          ))}
        </div>
      )}
    </div>
  )
}

export default AIBundleCard
