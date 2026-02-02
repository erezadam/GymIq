import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useTraineeProgram } from '../../hooks/useTraineeProgram'
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore'
import { ProgramDayDetail } from './ProgramDayDetail'
import type { ProgramDay } from '../../types'

export default function TraineeProgramView() {
  const navigate = useNavigate()
  const { program, isLoading, getTodayDay, getTrainingDays } = useTraineeProgram()
  const { loadFromProgram } = useWorkoutBuilderStore()
  const [showAllDays, setShowAllDays] = useState(false)

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-dark-card rounded w-1/3 mb-3" />
        <div className="h-4 bg-dark-card rounded w-2/3 mb-2" />
        <div className="h-4 bg-dark-card rounded w-1/2" />
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

  return (
    <div className="space-y-3">
      {/* Program header */}
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-main/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-primary-main" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text-primary truncate">
              {program.name}
            </h3>
            <p className="text-xs text-text-muted">
              {trainingDays.length} ימי אימון בשבוע
              {program.durationWeeks
                ? ` · ${program.durationWeeks} שבועות`
                : ''}
            </p>
          </div>
        </div>

        {program.description && (
          <p className="text-xs text-text-secondary mb-2">
            {program.description}
          </p>
        )}
      </div>

      {/* Today's workout */}
      {todayDay && !todayDay.restDay && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted mb-2 px-1">
            האימון של היום
          </h4>
          <ProgramDayDetail
            day={todayDay}
            isToday
            onStartWorkout={() => handleStartWorkout(todayDay)}
          />
        </div>
      )}

      {todayDay?.restDay && (
        <div className="card text-center py-4">
          <p className="text-sm text-text-muted">היום יום מנוחה 😴</p>
        </div>
      )}

      {/* Toggle all days */}
      <button
        onClick={() => setShowAllDays(!showAllDays)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <span>{showAllDays ? 'הסתר' : 'הצג'} את כל ימי האימון</span>
        {showAllDays ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* All days */}
      {showAllDays && (
        <div className="space-y-3">
          {program.weeklyStructure.map((day, index) => (
            <ProgramDayDetail
              key={index}
              day={day}
              onStartWorkout={
                !day.restDay ? () => handleStartWorkout(day) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
