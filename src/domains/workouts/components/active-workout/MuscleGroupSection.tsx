/**
 * MuscleGroupSection
 * A section showing exercises for a muscle group
 */

import type { MuscleGroupExercises } from '../../types/active-workout.types'
import { ExerciseCard } from './ExerciseCard'
import type { ReportedSet } from '../../types/active-workout.types'

const WEEKLY_SETS_TARGET = 10

interface MuscleGroupSectionProps {
  group: MuscleGroupExercises
  weeklyMuscleSets?: Map<string, number>
  onToggleExercise: (exerciseId: string) => void
  onAddSet: (exerciseId: string) => void
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<ReportedSet>) => void
  onDeleteSet: (exerciseId: string, setId: string) => void
  onFinishExercise: (exerciseId: string) => void
  onDeleteExercise: (exerciseId: string) => void
  onUpdateNotes: (exerciseId: string, notes: string) => void
  onSetAssistanceType: (exerciseId: string, assistanceType: 'graviton' | 'bands' | undefined) => void
}

export function MuscleGroupSection({
  group,
  weeklyMuscleSets,
  onToggleExercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onFinishExercise,
  onDeleteExercise,
  onUpdateNotes,
  onSetAssistanceType,
}: MuscleGroupSectionProps) {
  const currentSets = weeklyMuscleSets?.get(group.muscleGroup) || 0
  const reachedTarget = currentSets >= WEEKLY_SETS_TARGET

  return (
    <section className="muscle-group-section" dir="rtl">
      {/* Muscle group header with weekly sets progress */}
      <h2 className="muscle-group-header flex items-center justify-between">
        <span>{group.muscleGroupHe}</span>
        {weeklyMuscleSets && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            reachedTarget
              ? 'bg-status-success/20 text-status-success'
              : 'bg-accent-purple/20 text-accent-purple'
          }`}>
            {currentSets}/{WEEKLY_SETS_TARGET} סטים
          </span>
        )}
      </h2>

      {/* Exercise cards */}
      <div className="muscle-group-list">
        {group.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            onToggle={() => onToggleExercise(exercise.id)}
            onAddSet={() => onAddSet(exercise.id)}
            onUpdateSet={(setId, updates) =>
              onUpdateSet(exercise.id, setId, updates)
            }
            onDeleteSet={(setId) => onDeleteSet(exercise.id, setId)}
            onFinish={() => onFinishExercise(exercise.id)}
            onDelete={() => onDeleteExercise(exercise.id)}
            onUpdateNotes={(notes) => onUpdateNotes(exercise.id, notes)}
            onSetAssistanceType={(type) => onSetAssistanceType(exercise.id, type)}
          />
        ))}
      </div>
    </section>
  )
}
