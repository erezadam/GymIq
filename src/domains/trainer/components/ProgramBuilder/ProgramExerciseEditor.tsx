import { Trash2 } from 'lucide-react'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'
import type { ProgramExercise } from '../../types'

interface ProgramExerciseEditorProps {
  exercise: ProgramExercise
  onUpdate: (updates: Partial<ProgramExercise>) => void
  onRemove: () => void
  isSuperset?: boolean
}

export function ProgramExerciseEditor({
  exercise,
  onUpdate,
  onRemove,
  isSuperset,
}: ProgramExerciseEditorProps) {
  const formatRestTime = (seconds: number): string => {
    if (seconds >= 60) return `${Math.round(seconds / 60)}ד`
    return `${seconds}ש`
  }

  return (
    <div
      className={`bg-dark-card/80 backdrop-blur-lg border rounded-2xl overflow-hidden hover:border-primary-main/30 transition ${
        isSuperset ? 'border-accent-purple/30' : 'border-white/10'
      }`}
    >
      {/* Main row */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Order number input */}
          <input
            type="number"
            min={1}
            max={99}
            value={exercise.order || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value
              if (val === '') {
                onUpdate({ order: 0 })
              } else {
                const num = parseInt(val)
                if (num >= 1 && num <= 99) {
                  onUpdate({ order: num })
                }
              }
            }}
            className="w-10 h-10 text-center rounded-lg bg-background-elevated border border-border-default text-primary-main font-bold text-sm focus:border-primary-main focus:outline-none flex-shrink-0"
          />

          {/* Exercise image (#14) */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-dark-surface overflow-hidden flex-shrink-0">
            <ExerciseMedia
              imageUrl={exercise.imageUrl}
              videoWebpUrl={exercise.videoWebpUrl}
              alt={exercise.exerciseNameHe}
              className="w-full h-full object-cover"
              variant="thumbnail"
              placeholder={
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🏋️
                </div>
              }
            />
          </div>

          {/* Name & info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base sm:text-lg text-text-primary truncate">
              {exercise.exerciseNameHe}
            </h4>
            <p className="text-on-surface-variant text-sm truncate">
              {exercise.exerciseName} • {exercise.category}
            </p>
          </div>

          {/* Inline inputs - desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-center px-3 py-2 bg-dark-surface rounded-xl">
              <div className="text-xs text-on-surface-variant mb-1">סטים</div>
              <input
                type="number"
                min={1}
                max={10}
                value={exercise.targetSets}
                onChange={(e) => onUpdate({ targetSets: parseInt(e.target.value) || 1 })}
                className="w-12 bg-transparent text-center text-lg sm:text-xl font-bold text-text-primary focus:outline-none"
              />
            </div>
            <div className="text-center px-3 py-2 bg-dark-surface rounded-xl">
              <div className="text-xs text-on-surface-variant mb-1">חזרות</div>
              <input
                type="text"
                value={exercise.targetReps}
                onChange={(e) => onUpdate({ targetReps: e.target.value })}
                className="w-14 bg-transparent text-center text-lg sm:text-xl font-bold text-text-primary focus:outline-none"
                placeholder="8-12"
              />
            </div>
            <div className="text-center px-3 py-2 bg-dark-surface rounded-xl">
              <div className="text-xs text-on-surface-variant mb-1">מנוחה</div>
              <select
                value={exercise.restTime}
                onChange={(e) => onUpdate({ restTime: parseInt(e.target.value) })}
                className="w-14 bg-transparent text-center text-lg sm:text-xl font-bold text-text-primary focus:outline-none appearance-none cursor-pointer"
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

          {/* Delete button */}
          <button
            onClick={onRemove}
            className="p-2 sm:p-3 hover:bg-status-error/20 rounded-xl text-status-error/70 hover:text-status-error transition flex-shrink-0"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Mobile inputs - shown below on small screens */}
      <div className="sm:hidden grid grid-cols-3 gap-3 px-4 pb-4">
        <div className="text-center px-2 py-2 bg-dark-surface rounded-xl">
          <div className="text-xs text-on-surface-variant mb-1">סטים</div>
          <input
            type="number"
            min={1}
            max={10}
            value={exercise.targetSets}
            onChange={(e) => onUpdate({ targetSets: parseInt(e.target.value) || 1 })}
            className="w-full bg-transparent text-center text-lg font-bold text-text-primary focus:outline-none"
          />
        </div>
        <div className="text-center px-2 py-2 bg-dark-surface rounded-xl">
          <div className="text-xs text-on-surface-variant mb-1">חזרות</div>
          <input
            type="text"
            value={exercise.targetReps}
            onChange={(e) => onUpdate({ targetReps: e.target.value })}
            className="w-full bg-transparent text-center text-lg font-bold text-text-primary focus:outline-none"
            placeholder="8-12"
          />
        </div>
        <div className="text-center px-2 py-2 bg-dark-surface rounded-xl">
          <div className="text-xs text-on-surface-variant mb-1">מנוחה</div>
          <select
            value={exercise.restTime}
            onChange={(e) => onUpdate({ restTime: parseInt(e.target.value) })}
            className="w-full bg-transparent text-center text-lg font-bold text-text-primary focus:outline-none appearance-none"
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

      {/* Trainer notes */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
          💬 הערה למתאמן:
        </div>
        <input
          type="text"
          value={exercise.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
          className="w-full bg-dark-surface/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary-main"
          placeholder="הוסף הערה..."
        />
      </div>
    </div>
  )
}
