import { useEffect, useState, useMemo } from 'react'
import { Play, Check, X } from 'lucide-react'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { programService } from '../../services/programService'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'
import type { TrainingProgram } from '../../types'

interface TraineeHistoryPanelProps {
  traineeId: string
}

type HistoryFilter = 'all' | 'week' | 'month' | 'modified'

interface ProgramDayCard {
  dayLabel: string
  dayName: string
  dayIndex: number
  exerciseCount: number
  workout?: WorkoutHistorySummary
  status: 'completed' | 'missed' | 'modified'
}

const DAY_GRADIENTS = [
  'from-primary-main to-teal-600',
  'from-status-info to-blue-600',
  'from-accent-purple to-purple-600',
  'from-accent-orange to-orange-600',
  'from-accent-pink to-pink-600',
  'from-accent-gold to-yellow-600',
  'from-status-success to-green-600',
]

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'היום'
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  if (diffDays < 14) return 'לפני שבוע'
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
  return `לפני ${Math.floor(diffDays / 30)} חודשים`
}

export function TraineeHistoryPanel({ traineeId }: TraineeHistoryPanelProps) {
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<HistoryFilter>('all')

  useEffect(() => {
    if (!traineeId) return
    setIsLoading(true)

    Promise.all([
      programService.getTraineeActiveProgram(traineeId),
      getUserWorkoutHistory(traineeId, 30, true),
    ])
      .then(([prog, wkts]) => {
        setProgram(prog)
        setWorkouts(wkts)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [traineeId])

  // Apply time filter to workouts
  const filteredWorkouts = useMemo(() => {
    const now = new Date()
    return workouts.filter((w) => {
      switch (filter) {
        case 'week': {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return w.date >= weekAgo
        }
        case 'month': {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return w.date >= monthAgo
        }
        case 'modified':
          return w.source === 'trainer_program' && w.status !== 'completed'
        default:
          return true
      }
    })
  }, [workouts, filter])

  // Build program-day cards by matching workouts to program days
  const dayCards = useMemo((): ProgramDayCard[] => {
    if (!program?.weeklyStructure) return []

    return program.weeklyStructure
      .filter((day) => !day.restDay)
      .map((day) => {
        // Find most recent workout matching this program day
        const matchingWorkout = filteredWorkouts.find(
          (w) => w.programDayLabel === day.dayLabel
        )

        let status: ProgramDayCard['status']
        if (!matchingWorkout) {
          status = 'missed'
        } else if (matchingWorkout.status === 'completed') {
          status = 'completed'
        } else if (matchingWorkout.status === 'cancelled') {
          status = 'missed'
        } else {
          status = 'modified'
        }

        // Get the original day index for gradient color
        const originalIndex = program.weeklyStructure.findIndex(
          (d) => d.dayLabel === day.dayLabel
        )

        return {
          dayLabel: day.dayLabel,
          dayName: day.name,
          dayIndex: originalIndex >= 0 ? originalIndex : 0,
          exerciseCount: day.exercises?.length || 0,
          workout: matchingWorkout,
          status,
        }
      })
  }, [program, filteredWorkouts])

  if (!traineeId) {
    return (
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center text-text-muted">
        <p>בחר מתאמן כדי לראות היסטוריה</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner" />
      </div>
    )
  }

  const FILTERS: { key: HistoryFilter; label: string; special?: boolean }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'week', label: 'השבוע' },
    { key: 'month', label: 'החודש' },
    { key: 'modified', label: 'עם שינויים', special: true },
  ]

  // No active program
  if (!program) {
    return (
      <div className="space-y-3">
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-lg mb-2">📋</p>
          <p className="text-text-muted">אין תוכנית פעילה</p>
          <p className="text-text-muted text-sm mt-1">צור תוכנית כדי לראות מעקב לפי ימים</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === f.key
                ? 'bg-gradient-to-br from-primary-main to-status-info text-white'
                : f.special
                  ? 'bg-dark-surface text-status-warning'
                  : 'bg-dark-surface text-text-secondary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Program Day Cards */}
      {dayCards.length === 0 ? (
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center text-text-muted">
          <p>אין אימונים בתקופה זו</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayCards.map((card) => {
            const gradient = DAY_GRADIENTS[card.dayIndex % DAY_GRADIENTS.length]
            const isCompleted = card.status === 'completed'
            const isMissed = card.status === 'missed'

            return (
              <div
                key={card.dayLabel}
                className={`bg-dark-card/80 backdrop-blur-lg border rounded-2xl p-5 transition ${
                  isCompleted
                    ? 'border-status-success/20'
                    : isMissed
                      ? 'border-status-error/20 opacity-75'
                      : 'border-status-warning/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Play button / Missed badge - RIGHT side in RTL */}
                  {isMissed ? (
                    <span className="px-3 py-1.5 bg-status-error/20 text-status-error text-xs font-medium rounded-lg flex-shrink-0">
                      פוספס
                    </span>
                  ) : (
                    <button
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Play className="w-5 h-5 text-white fill-white" />
                    </button>
                  )}

                  {/* Center: Day info */}
                  <div className="flex-1 min-w-0 text-center">
                    <h4 className="font-bold text-base text-text-primary">
                      {card.dayLabel} - {card.dayName}
                    </h4>
                    <p className="text-sm text-text-muted mt-1">
                      {card.workout ? (
                        <>
                          {formatRelativeDate(card.workout.date)}
                          {card.workout.duration > 0 && (
                            <> • {card.workout.duration} דקות</>
                          )}
                        </>
                      ) : (
                        <>לא בוצע</>
                      )}
                    </p>
                  </div>

                  {/* Status icon - LEFT side in RTL */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-status-success'
                        : isMissed
                          ? 'bg-status-error'
                          : 'bg-status-warning'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : isMissed ? (
                      <X className="w-6 h-6 text-white" />
                    ) : (
                      <span className="text-white text-lg">⚡</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
