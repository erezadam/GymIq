import { Trash2, GripVertical } from 'lucide-react'
import type { ProgramExercise } from '../../types'

interface ProgramExerciseEditorProps {
  exercise: ProgramExercise
  onUpdate: (updates: Partial<ProgramExercise>) => void
  onRemove: () => void
}

export function ProgramExerciseEditor({
  exercise,
  onUpdate,
  onRemove,
}: ProgramExerciseEditorProps) {
  return (
    <div className="card bg-dark-bg border-dark-border">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0" />
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.exerciseNameHe}
            className="w-10 h-10 rounded-lg object-cover bg-dark-card"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-dark-card flex items-center justify-center text-text-muted text-lg">
            🏋️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {exercise.exerciseNameHe}
          </p>
          <p className="text-xs text-text-muted truncate">
            {exercise.category} · {exercise.equipment}
          </p>
        </div>
        <button onClick={onRemove} className="btn-icon text-text-muted hover:text-status-error">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Config fields */}
      <div className="grid grid-cols-4 gap-3">
        {/* Sets */}
        <div>
          <label className="block text-xs text-text-muted mb-1">סטים</label>
          <input
            type="number"
            min={1}
            max={10}
            value={exercise.targetSets}
            onChange={(e) => onUpdate({ targetSets: parseInt(e.target.value) || 1 })}
            className="input-primary text-center text-sm py-1.5"
          />
        </div>

        {/* Reps */}
        <div>
          <label className="block text-xs text-text-muted mb-1">חזרות</label>
          <input
            type="text"
            value={exercise.targetReps}
            onChange={(e) => onUpdate({ targetReps: e.target.value })}
            className="input-primary text-center text-sm py-1.5"
            placeholder="8-12"
          />
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs text-text-muted mb-1">משקל</label>
          <input
            type="number"
            min={0}
            step={2.5}
            value={exercise.targetWeight || ''}
            onChange={(e) =>
              onUpdate({ targetWeight: e.target.value ? parseFloat(e.target.value) : undefined })
            }
            className="input-primary text-center text-sm py-1.5"
            placeholder="ק&quot;ג"
          />
        </div>

        {/* Rest */}
        <div>
          <label className="block text-xs text-text-muted mb-1">מנוחה</label>
          <select
            value={exercise.restTime}
            onChange={(e) => onUpdate({ restTime: parseInt(e.target.value) })}
            className="input-primary text-center text-sm py-1.5"
          >
            <option value={30}>30ש</option>
            <option value={45}>45ש</option>
            <option value={60}>60ש</option>
            <option value={90}>90ש</option>
            <option value={120}>2ד</option>
            <option value={180}>3ד</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          value={exercise.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
          className="input-primary text-sm py-1.5"
          placeholder="הערות למתאמן..."
        />
      </div>
    </div>
  )
}
