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
  Trash2,
  X,
} from 'lucide-react'
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore'
import { ProgramExerciseCard } from './ProgramExerciseCard'
import { programService } from '../../services/programService'
import toast from 'react-hot-toast'
import type { TrainingProgram, ProgramDay } from '../../types'

interface TrainerProgramCardProps {
  program: TrainingProgram
  onDisconnected?: () => void
}

export function TrainerProgramCard({ program, onDisconnected }: TrainerProgramCardProps) {
  const navigate = useNavigate()
  const { loadFromProgram } = useWorkoutBuilderStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

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
          <button
            onClick={e => {
              e.stopPropagation()
              setShowDisconnectDialog(true)
            }}
            className="p-2 rounded-lg transition-colors"
            aria-label="נתק תוכנית"
          >
            <Trash2 className="w-4 h-4 text-red-400/60 hover:text-red-400" />
          </button>
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

      {/* Disconnect Confirmation Dialog */}
      {showDisconnectDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-4"
          onClick={() => !disconnecting && setShowDisconnectDialog(false)}
        >
          <div
            className="bg-dark-surface rounded-2xl p-6 max-w-sm w-full animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <button
                onClick={() => setShowDisconnectDialog(false)}
                className="p-1 text-text-muted"
                disabled={disconnecting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              ניתוק תוכנית
            </h3>
            <p className="text-text-muted text-sm mb-6">
              האם לנתק את התוכנית &quot;{program.name}&quot;? התוכנית תיעלם מהתצוגה שלך.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectDialog(false)}
                className="flex-1 py-2.5 bg-dark-card text-text-secondary rounded-xl text-sm font-medium"
                disabled={disconnecting}
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  setDisconnecting(true)
                  try {
                    await programService.disconnectProgram(program.id)
                    toast.success('התוכנית נותקה בהצלחה')
                    setShowDisconnectDialog(false)
                    onDisconnected?.()
                  } catch {
                    toast.error('שגיאה בניתוק התוכנית')
                  } finally {
                    setDisconnecting(false)
                  }
                }}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                disabled={disconnecting}
              >
                {disconnecting ? 'מנתק...' : 'נתק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
