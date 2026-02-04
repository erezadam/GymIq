import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Dumbbell, Moon, Clock, Play } from 'lucide-react'
import { useTraineeProgram } from '../../hooks/useTraineeProgram'
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore'
import { ProgramExerciseCard } from './ProgramExerciseCard'
import type { ProgramDay } from '../../types'

export default function TraineeProgramView() {
  const navigate = useNavigate()
  const { program, isLoading, getTodayDay, getTrainingDays } = useTraineeProgram()
  const { loadFromProgram } = useWorkoutBuilderStore()
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  if (isLoading) {
    return (
      <div className="rounded-2xl border-2 border-accent-orange/30 bg-dark-card/80 animate-pulse p-4">
        <div className="h-5 bg-dark-surface rounded w-1/3 mb-3" />
        <div className="h-4 bg-dark-surface rounded w-2/3 mb-2" />
        <div className="h-4 bg-dark-surface rounded w-1/2" />
      </div>
    )
  }

  if (!program) return null

  const todayDay = getTodayDay()
  const trainingDays = getTrainingDays()

  const handleStartWorkout = (day: ProgramDay) => {
    loadFromProgram(day, program.id, program.name)
    navigate('/workout/builder')
  }

  const toggleDay = (index: number) => {
    setExpandedDay(prev => (prev === index ? null : index))
  }

  return (
    <div className="rounded-2xl border-2 border-accent-orange/30 bg-dark-card/80 overflow-hidden">
      {/* Program header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-orange/20 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-accent-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold text-text-primary truncate">
                {program.name}
              </h3>
              <span className="px-2 py-0.5 bg-accent-orange/20 text-accent-orange text-[10px] font-bold rounded-full flex-shrink-0">
                מאמן
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {trainingDays.length} ימי אימון בשבוע
              {program.durationWeeks
                ? ` · ${program.durationWeeks} שבועות`
                : ''}
            </p>
          </div>
        </div>

        {program.description && (
          <p className="text-xs text-text-secondary mt-2">
            {program.description}
          </p>
        )}
      </div>

      {/* Today's workout highlight */}
      {todayDay && !todayDay.restDay && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Play className="w-4 h-4 text-accent-orange flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-accent-orange">האימון של היום</p>
                <p className="text-xs text-text-secondary truncate">
                  {todayDay.dayLabel}
                  {todayDay.name && ` - ${todayDay.name}`}
                  {' · '}
                  {todayDay.exercises.length} תרגילים
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStartWorkout(todayDay)}
              className="px-3 py-1.5 bg-accent-orange text-white text-xs font-bold rounded-lg flex-shrink-0"
            >
              התחל
            </button>
          </div>
        </div>
      )}

      {todayDay?.restDay && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-status-info/10 text-center">
          <p className="text-xs text-text-muted">היום יום מנוחה</p>
        </div>
      )}

      {/* Days list */}
      <div className="border-t border-white/5">
        {program.weeklyStructure.map((day, index) => {
          const isExpanded = expandedDay === index
          const totalSets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0)

          return (
            <div key={index} className="border-b border-white/5 last:border-0">
              {/* Day row - clickable */}
              <button
                onClick={() => !day.restDay && day.exercises.length > 0 && toggleDay(index)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                  !day.restDay && day.exercises.length > 0
                    ? 'hover:bg-white/5 cursor-pointer'
                    : ''
                }`}
              >
                {day.restDay ? (
                  <Moon className="w-4 h-4 text-status-info flex-shrink-0" />
                ) : (
                  <Dumbbell className="w-4 h-4 text-accent-orange flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {day.dayLabel}
                    {day.name && ` - ${day.name}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {day.restDay
                      ? 'יום מנוחה'
                      : `${day.exercises.length} תרגילים · ${totalSets} סטים`}
                  </p>
                </div>
                {!day.restDay && day.exercises.length > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartWorkout(day)
                        }}
                        className="px-2 py-1 bg-accent-orange/20 text-accent-orange text-xs font-bold rounded-lg"
                      >
                        התחל
                      </button>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                )}
              </button>

              {/* Expanded exercise list */}
              {isExpanded && !day.restDay && (
                <div className="px-4 pb-3">
                  <div className="rounded-xl bg-dark-surface/50 overflow-hidden">
                    {day.exercises.map((exercise, i) => (
                      <ProgramExerciseCard
                        key={`${exercise.exerciseId}-${i}`}
                        exercise={exercise}
                        index={i}
                      />
                    ))}
                  </div>
                  {day.notes && (
                    <p className="text-xs text-text-muted mt-2 px-1">
                      {day.notes}
                    </p>
                  )}
                  {day.estimatedDuration && (
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-2 px-1">
                      <Clock className="w-3 h-3" />
                      ~{day.estimatedDuration} דקות
                    </div>
                  )}
                  <button
                    onClick={() => handleStartWorkout(day)}
                    className="w-full mt-3 py-2.5 bg-accent-orange text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    התחל אימון
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
