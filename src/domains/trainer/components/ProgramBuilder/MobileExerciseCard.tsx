import type { ProgramExercise } from '../../types'

interface MobileExerciseCardProps {
  exercise: ProgramExercise
  onUpdate: (updates: Partial<ProgramExercise>) => void
  onRemove: () => void
}

export function MobileExerciseCard({
  exercise,
  onUpdate,
  onRemove,
}: MobileExerciseCardProps) {
  const formatRestTime = (seconds: number): string => {
    if (seconds >= 60) return `${Math.round(seconds / 60)}ד`
    return `${seconds}ש`
  }

  return (
    <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-xl p-3">
      {/* Top row: image + name + menu */}
      <div className="flex items-center gap-3">
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt=""
            className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-dark-surface flex items-center justify-center text-lg flex-shrink-0">
            🏋️
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-text-primary truncate">
            {exercise.exerciseNameHe}
          </h4>
          <p className="text-xs text-text-muted truncate">
            {exercise.category} • {exercise.equipment || ''}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-2 text-text-muted hover:text-status-error transition flex-shrink-0"
        >
          ⋮
        </button>
      </div>

      {/* Sets/Reps/Rest row */}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 bg-dark-surface rounded-lg py-2 text-center">
          <div className="text-xs text-text-muted">סטים</div>
          <input
            type="number"
            min={1}
            max={10}
            value={exercise.targetSets}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              if (isNaN(val)) return
              onUpdate({ targetSets: Math.max(1, Math.min(10, val)) })
            }}
            className="w-full bg-transparent text-center font-bold text-text-primary focus:outline-none"
          />
        </div>
        <div className="flex-1 bg-dark-surface rounded-lg py-2 text-center">
          <div className="text-xs text-text-muted">חזרות</div>
          <input
            type="text"
            value={exercise.targetReps}
            onChange={(e) => onUpdate({ targetReps: e.target.value })}
            className="w-full bg-transparent text-center font-bold text-text-primary focus:outline-none"
            placeholder="8-12"
          />
        </div>
        <div className="flex-1 bg-dark-surface rounded-lg py-2 text-center">
          <div className="text-xs text-text-muted">מנוחה</div>
          <select
            value={exercise.restTime}
            onChange={(e) => onUpdate({ restTime: parseInt(e.target.value) })}
            className="w-full bg-transparent text-center font-bold text-text-primary focus:outline-none appearance-none"
          >
            <option value={0}>0ש</option>
            <option value={30}>30ש</option>
            <option value={45}>45ש</option>
            <option value={60}>{formatRestTime(60)}</option>
            <option value={90}>{formatRestTime(90)}</option>
            <option value={120}>{formatRestTime(120)}</option>
            <option value={180}>{formatRestTime(180)}</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <input
        type="text"
        value={exercise.notes || ''}
        onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
        className="w-full mt-2 bg-dark-surface/50 rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-main"
        placeholder="+ הערה למתאמן"
      />
    </div>
  )
}
