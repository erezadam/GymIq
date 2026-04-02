import { Minus, Plus, X } from 'lucide-react'
import type { SelectedExercise } from '@/domains/workouts/store/workoutBuilderStore'

interface QuickPlanExerciseListProps {
  exercises: SelectedExercise[]
  onSetCountChange: (exerciseId: string, count: number) => void
  onEmomToggle: (exerciseId: string, isEmom: boolean) => void
  onRemove: (exerciseId: string) => void
}

export default function QuickPlanExerciseList({
  exercises,
  onSetCountChange,
  onEmomToggle,
  onRemove,
}: QuickPlanExerciseListProps) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-on-surface-variant">
        בחר תרגילים מהרשימה למטה
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {exercises.map((exercise) => {
        const setCount = exercise.customSetCount ?? 3

        return (
          <div
            key={exercise.exerciseId}
            className="flex items-center gap-2 rounded-xl bg-surface-container px-3 py-2.5"
          >
            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(exercise.exerciseId)}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-status-error hover:bg-status-error/10 transition-colors"
              aria-label={`הסר ${exercise.exerciseNameHe}`}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Exercise name */}
            <span className="flex-1 text-sm font-medium text-on-surface truncate">
              {exercise.exerciseNameHe || exercise.exerciseName}
            </span>

            {/* EMOM toggle */}
            <button
              type="button"
              onClick={() => onEmomToggle(exercise.exerciseId, !exercise.isEmom)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                exercise.isEmom
                  ? 'bg-accent-purple/20 text-accent-purple'
                  : 'bg-surface-elevated text-on-surface-variant'
              }`}
            >
              EMOM
            </button>

            {/* Set count stepper */}
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSetCountChange(exercise.exerciseId, setCount - 1)}
                disabled={setCount <= 1}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-elevated text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                aria-label="הפחת סט"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center text-sm font-semibold text-on-surface tabular-nums">
                {setCount}
              </span>
              <button
                type="button"
                onClick={() => onSetCountChange(exercise.exerciseId, setCount + 1)}
                disabled={setCount >= 20}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-elevated text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                aria-label="הוסף סט"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}

      <div className="text-xs text-on-surface-variant text-center mt-1">
        {exercises.length} תרגילים · {exercises.reduce((sum, e) => sum + (e.customSetCount ?? 3), 0)} סטים
      </div>
    </div>
  )
}
