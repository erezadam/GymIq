/**
 * TrainerProgramCard Component
 * Displays a trainer-created program in the workout history page.
 * Orange styling to distinguish from AI (purple) programs.
 * Expandable: program → days → exercises → "התחל אימון"
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Moon,
  Clock,
  Play,
} from 'lucide-react'
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore'
import { ProgramExerciseCard } from './ProgramExerciseCard'
import type { TrainingProgram, ProgramDay } from '../../types'

interface TrainerProgramCardProps {
  program: TrainingProgram
}

export function TrainerProgramCard({ program }: TrainerProgramCardProps) {
  const navigate = useNavigate()
  const { loadFromProgram } = useWorkoutBuilderStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)

  const trainingDays = program.weeklyStructure.filter(d => !d.restDay)
  const totalExercises = trainingDays.reduce(
    (sum, d) => sum + d.exercises.length,
    0
  )

  const handleStartWorkout = (day: ProgramDay) => {
    loadFromProgram(day, program.id, program.name)
    navigate('/workout/builder')
  }

  const toggleDay = (index: number) => {
    setExpandedDayIndex(prev => (prev === index ? null : index))
  }

  return (
    <div className="rounded-xl transition-colors border-2 border-accent-orange bg-gradient-to-r from-accent-orange/20 to-accent-orange/10">
      {/* Card Header - clickable to expand */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-accent-orange" />
              ) : (
                <ChevronDown className="w-5 h-5 text-accent-orange" />
              )}
            </button>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-orange/20">
              <Dumbbell className="w-6 h-6 text-accent-orange" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-accent-orange">
                  {program.name}
                </p>
                <span className="text-accent-orange bg-accent-orange/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  מאמן
                </span>
              </div>
              <p className="text-accent-orange/70 text-sm mt-1">
                {trainingDays.length} ימי אימון · {totalExercises} תרגילים
                {program.durationWeeks
                  ? ` · ${program.durationWeeks} שבועות`
                  : ''}
              </p>
              {program.description && (
                <p className="text-text-muted text-sm mt-0.5 line-clamp-1">
                  {program.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content - List of training days */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-accent-orange/30 pt-4 space-y-3">
          {program.weeklyStructure.map((day, index) => {
            const isDayExpanded = expandedDayIndex === index
            const totalSets = day.exercises.reduce(
              (sum, e) => sum + e.targetSets,
              0
            )

            return (
              <div
                key={index}
                className="bg-dark-card/50 rounded-xl border border-accent-orange/20 hover:border-accent-orange/50 transition-colors overflow-hidden"
              >
                {/* Day Header - clickable to expand */}
                <div
                  className={`p-3 ${
                    !day.restDay && day.exercises.length > 0
                      ? 'cursor-pointer'
                      : ''
                  }`}
                  onClick={() =>
                    !day.restDay &&
                    day.exercises.length > 0 &&
                    toggleDay(index)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                        {day.restDay ? (
                          <Moon className="w-5 h-5 text-status-info" />
                        ) : (
                          <Dumbbell className="w-5 h-5 text-accent-orange" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {day.dayLabel}
                          {day.name && ` - ${day.name}`}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {day.restDay
                            ? 'יום מנוחה'
                            : `${day.exercises.length} תרגילים · ${totalSets} סטים`}
                          {!day.restDay &&
                            day.estimatedDuration &&
                            ` · ~${day.estimatedDuration} דקות`}
                        </p>
                      </div>
                    </div>
                    {!day.restDay && day.exercises.length > 0 && (
                      <div className="flex items-center gap-2">
                        {!isDayExpanded && (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleStartWorkout(day)
                            }}
                            className="p-2 bg-accent-orange/20 hover:bg-accent-orange/30 rounded-lg transition-colors"
                            aria-label="התחל אימון"
                          >
                            <Play className="w-5 h-5 text-accent-orange" />
                          </button>
                        )}
                        {isDayExpanded ? (
                          <ChevronUp className="w-4 h-4 text-accent-orange" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-accent-orange" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded day exercises */}
                {isDayExpanded && !day.restDay && (
                  <div className="border-t border-accent-orange/20 bg-dark-surface/30">
                    <div className="p-3">
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
                          <Clock className="w-3 h-3" />~{day.estimatedDuration}{' '}
                          דקות
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
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
