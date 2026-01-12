/**
 * ExerciseCard
 * Collapsible card showing exercise details and set reporting
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2, Check, Plus, MessageSquare } from 'lucide-react'
import type { ActiveWorkoutExercise, ReportedSet } from '../../types/active-workout.types'
import { SetReportRow } from './SetReportRow'
import { NotesModal } from './NotesModal'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '@/domains/exercises/utils'
import { workoutLabels } from '@/styles/design-tokens'

interface ExerciseCardProps {
  exercise: ActiveWorkoutExercise
  onToggle: () => void
  onAddSet: () => void
  onUpdateSet: (setId: string, updates: Partial<ReportedSet>) => void
  onDeleteSet: (setId: string) => void
  onFinish: () => void
  onDelete: () => void
  onUpdateNotes: (notes: string) => void
}

export function ExerciseCard({
  exercise,
  onToggle,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onFinish,
  onDelete,
  onUpdateNotes,
}: ExerciseCardProps) {
  const [showNotesModal, setShowNotesModal] = useState(false)

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
        </div>

        {/* Exercise image */}
        <img
          src={getExerciseImageUrl({ imageUrl: exercise.imageUrl, name: exercise.exerciseName })}
          alt={exercise.exerciseNameHe}
          className="exercise-card-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.onerror = null
            target.src = EXERCISE_PLACEHOLDER_IMAGE
          }}
        />
      </div>

      {/* Card Content (expanded only) */}
      {exercise.isExpanded && (
        <div className="exercise-card-content">
          {/* Large Exercise Image */}
          <div className="relative rounded-xl overflow-hidden bg-neon-gray-700 aspect-video mb-2">
            <img
              src={getExerciseImageUrl({ imageUrl: exercise.imageUrl, name: exercise.exerciseName })}
              alt={exercise.exerciseNameHe}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = EXERCISE_PLACEHOLDER_IMAGE
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Last workout data - shown in red below image */}
          {exercise.lastWorkoutData && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <span style={{ color: '#EF4444', fontSize: '14px', fontWeight: 600 }}>
                {workoutLabels.lastWorkout} {exercise.lastWorkoutData.reps} חזרות @ {exercise.lastWorkoutData.weight}kg
              </span>
            </div>
          )}

          {/* Set rows */}
          <div className="exercise-sets-list">
            {exercise.reportedSets.map((set: ReportedSet) => (
              <SetReportRow
                key={set.id}
                set={set}
                reportType={exercise.reportType}
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

          {/* Bottom action buttons row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {/* Notes button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNotesModal(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                minHeight: '44px',
                background: exercise.notes ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
                border: `1px solid ${exercise.notes ? '#2DD4BF' : '#4B5563'}`,
                borderRadius: '8px',
                color: exercise.notes ? '#2DD4BF' : '#9CA3AF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>הערות</span>
            </button>

            {/* Finish exercise button */}
            <button className="finish-exercise-btn" onClick={onFinish} style={{ flex: 1 }}>
              <Check className="w-4 h-4" />
              <span>{workoutLabels.finishExercise}</span>
            </button>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotesModal}
        exerciseName={exercise.exerciseNameHe}
        initialNotes={exercise.notes || ''}
        onClose={() => setShowNotesModal(false)}
        onSave={onUpdateNotes}
      />
    </div>
  )
}
