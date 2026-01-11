/**
 * MuscleGroupSection
 * A section showing exercises for a muscle group
 */

import type { MuscleGroupExercises } from '../../types/active-workout.types'
import { ExerciseCard } from './ExerciseCard'
import type { ReportedSet } from '../../types/active-workout.types'

interface MuscleGroupSectionProps {
  group: MuscleGroupExercises
  onToggleExercise: (exerciseId: string) => void
  onAddSet: (exerciseId: string) => void
  onUpdateSet: (exerciseId: string, setId: string, updates: Partial<ReportedSet>) => void
  onDeleteSet: (exerciseId: string, setId: string) => void
  onFinishExercise: (exerciseId: string) => void
  onDeleteExercise: (exerciseId: string) => void
  onUpdateNotes: (exerciseId: string, notes: string) => void
}

export function MuscleGroupSection({
  group,
  onToggleExercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onFinishExercise,
  onDeleteExercise,
  onUpdateNotes,
}: MuscleGroupSectionProps) {
  return (
    <section className="muscle-group-section" dir="rtl">
      {/* Muscle group header */}
      <h2 className="muscle-group-header">{group.muscleGroupHe}</h2>

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
          />
        ))}
      </div>
    </section>
  )
}
