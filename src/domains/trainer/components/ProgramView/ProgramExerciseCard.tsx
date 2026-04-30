import { Dumbbell } from 'lucide-react'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'
import type { ProgramExercise } from '../../types'

interface ProgramExerciseCardProps {
  exercise: ProgramExercise
  index: number
}

export function ProgramExerciseCard({ exercise, index }: ProgramExerciseCardProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-dark-border/50 last:border-0">
      {/* Index number */}
      <div className="w-6 h-6 rounded-full bg-dark-card flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-medium text-on-surface-variant">{exercise.order || index + 1}</span>
      </div>

      {/* Exercise image (#13) */}
      <ExerciseMedia
        imageUrl={exercise.imageUrl}
        videoWebpUrl={exercise.videoWebpUrl}
        alt={exercise.exerciseNameHe}
        className="w-10 h-10 rounded-lg object-cover bg-dark-card flex-shrink-0"
        variant="thumbnail"
        placeholder={
          <div className="w-10 h-10 rounded-lg bg-dark-card flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-on-surface-variant" />
          </div>
        }
      />

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {exercise.exerciseNameHe}
        </p>
        <p className="text-xs text-on-surface-variant">
          {exercise.targetSets} סטים × {exercise.targetReps} חזרות
          {exercise.targetWeight ? ` · ${exercise.targetWeight} ק"ג` : ''}
        </p>
      </div>

      {/* Rest time */}
      <div className="text-xs text-on-surface-variant flex-shrink-0">
        {exercise.restTime}s
      </div>
    </div>
  )
}
