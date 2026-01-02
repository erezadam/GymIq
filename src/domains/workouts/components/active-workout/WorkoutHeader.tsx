/**
 * WorkoutHeader
 * Header with timer and exit button
 */

import { Clock, ArrowRight } from 'lucide-react'
import { workoutLabels } from '@/styles/design-tokens'

interface WorkoutHeaderProps {
  formattedTime: string
  onExit: () => void
}

export function WorkoutHeader({ formattedTime, onExit }: WorkoutHeaderProps) {
  return (
    <header className="workout-header" dir="rtl">
      {/* Exit button (right side in RTL) */}
      <button className="workout-header-exit" onClick={onExit}>
        <span>{workoutLabels.exit}</span>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Timer (left side in RTL) */}
      <div className="workout-header-timer">
        <Clock className="w-5 h-5" />
        <span>{formattedTime}</span>
      </div>
    </header>
  )
}
