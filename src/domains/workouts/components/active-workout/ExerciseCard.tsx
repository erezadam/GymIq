/**
 * ExerciseCard
 * Collapsible card showing exercise details and set reporting
 */

import { ChevronDown, ChevronUp, Trash2, Check, Plus } from 'lucide-react'
import type { ActiveWorkoutExercise, ReportedSet } from '../../types/active-workout.types'
import { SetReportRow } from './SetReportRow'
import { workoutLabels } from '@/styles/design-tokens'

interface ExerciseCardProps {
  exercise: ActiveWorkoutExercise
  onToggle: () => void
  onAddSet: () => void
  onUpdateSet: (setId: string, updates: Partial<ReportedSet>) => void
  onDeleteSet: (setId: string) => void
  onFinish: () => void
  onDelete: () => void
}

export function ExerciseCard({
  exercise,
  onToggle,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onFinish,
  onDelete,
}: ExerciseCardProps) {
  const cardClassName = `exercise-card ${
    exercise.isCompleted ? 'exercise-card--completed' : ''
  } ${exercise.isExpanded ? 'exercise-card--expanded' : ''}`

  return (
    <div className={cardClassName} dir="rtl">
      {/* Card Header (always visible) */}
      <div className="exercise-card-header" onClick={onToggle}>
        {/* Expand/Collapse button */}
        <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {exercise.isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {/* Delete button */}
        <button
          className="delete-exercise-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Exercise info */}
        <div className="exercise-card-info">
          <h3 className="exercise-card-name">{exercise.exerciseNameHe}</h3>
          {exercise.lastWorkoutData && (
            <p className="exercise-card-last-workout">
              {workoutLabels.lastWorkout} {exercise.lastWorkoutData.reps} -{' '}
              {exercise.lastWorkoutData.weight}kg
            </p>
          )}
        </div>

        {/* Exercise image */}
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.exerciseNameHe}
            className="exercise-card-image"
          />
        ) : (
          <div className="exercise-card-image exercise-card-image--placeholder">
            <span>💪</span>
          </div>
        )}

        {/* Completion indicator */}
        <div
          className={`exercise-completion-indicator ${
            exercise.isCompleted ? 'exercise-completion-indicator--done' : ''
          }`}
        >
          {exercise.isCompleted && <Check className="w-4 h-4" />}
        </div>
      </div>

      {/* Card Content (expanded only) */}
      {exercise.isExpanded && (
        <div className="exercise-card-content">
          {/* Set rows */}
          <div className="exercise-sets-list">
            {exercise.reportedSets.map((set: ReportedSet) => (
              <SetReportRow
                key={set.id}
                set={set}
                onUpdate={(updates) => onUpdateSet(set.id, updates)}
                onDelete={() => onDeleteSet(set.id)}
                canDelete={exercise.reportedSets.length > 1}
              />
            ))}
          </div>

          {/* Add set button */}
          <button className="add-set-btn" onClick={onAddSet}>
            <Plus className="w-4 h-4" />
            <span>{workoutLabels.addSet}</span>
          </button>

          {/* Finish exercise button */}
          <button className="finish-exercise-btn" onClick={onFinish}>
            <Check className="w-4 h-4" />
            <span>{workoutLabels.finishExercise}</span>
          </button>
        </div>
      )}
    </div>
  )
}
