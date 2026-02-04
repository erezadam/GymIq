import { Moon, Dumbbell, Clock, Play } from 'lucide-react'
import type { ProgramDay } from '../../types'
import { ProgramExerciseCard } from './ProgramExerciseCard'

interface ProgramDayDetailProps {
  day: ProgramDay
  isToday?: boolean
  onStartWorkout?: () => void
}

export function ProgramDayDetail({
  day,
  isToday = false,
  onStartWorkout,
}: ProgramDayDetailProps) {
  const totalSets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0)

  if (day.restDay) {
    return (
      <div className="card text-center py-6">
        <Moon className="w-10 h-10 mx-auto mb-2 text-status-info opacity-60" />
        <p className="text-sm text-text-muted">יום מנוחה</p>
        {day.notes && (
          <p className="text-xs text-text-muted mt-2">{day.notes}</p>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary-main" />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {day.dayLabel}
              {day.name && ` - ${day.name}`}
            </p>
            <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
              <span>{day.exercises.length} תרגילים</span>
              <span>{totalSets} סטים</span>
              {day.estimatedDuration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {day.estimatedDuration} דק
                </span>
              )}
            </div>
          </div>
        </div>

        {isToday && onStartWorkout && (
          <button
            onClick={onStartWorkout}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <Play className="w-4 h-4" />
            <span>התחל</span>
          </button>
        )}
      </div>

      {/* Exercises */}
      <div>
        {day.exercises.map((exercise, index) => (
          <ProgramExerciseCard
            key={`${exercise.exerciseId}-${index}`}
            exercise={exercise}
            index={index}
          />
        ))}
      </div>

      {/* Notes */}
      {day.notes && (
        <p className="text-xs text-text-muted mt-3 pt-2 border-t border-dark-border/50">
          {day.notes}
        </p>
      )}
    </div>
  )
}
