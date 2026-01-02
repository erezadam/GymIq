/**
 * ExerciseCounter
 * Title and counter showing completed/total exercises
 */

import { workoutLabels } from '@/styles/design-tokens'

interface ExerciseCounterProps {
  completed: number
  total: number
}

export function ExerciseCounter({ completed, total }: ExerciseCounterProps) {
  return (
    <div className="workout-title-section" dir="rtl">
      <h1 className="workout-title">{workoutLabels.screenTitle}</h1>
      <p className="workout-counter">
        {completed} / {total} {workoutLabels.counterSuffix}
      </p>
    </div>
  )
}
