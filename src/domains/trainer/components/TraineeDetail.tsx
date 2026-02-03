import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Send, ChevronDown, ChevronLeft, X } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { trainerService } from '../services/trainerService'
import { programService } from '../services/programService'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import type { TraineeWithStats, TraineeStats, TrainingProgram } from '../types'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'
import { TraineeProfileSection } from './TraineeProfileSection'
import { TraineePerformance } from './TraineePerformance'
import { TraineeRecentWorkouts } from './TraineeRecentWorkouts'

function getDayDateThisWeek(dayOfWeek: number): Date {
  const today = new Date()
  const currentDow = today.getDay()
  const diff = dayOfWeek - currentDow
  const date = new Date(today)
  date.setDate(today.getDate() + diff)
  date.setHours(23, 59, 59, 999)
  return date
}

function formatDayDate(dayOfWeek: number): string {
  const date = getDayDateThisWeek(dayOfWeek)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  return `יום ${HEBREW_DAYS[dayOfWeek]} ${day}/${month}`
}

function isDayPastDue(dayOfWeek: number): boolean {
  const today = new Date()
  return dayOfWeek < today.getDay()
}

export default function TraineeDetail() {
  const { id: traineeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trainee, setTrainee] = useState<TraineeWithStats | null>(null)
  const [stats, setStats] = useState<TraineeStats | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null)
  const [isProgramExpanded, setIsProgramExpanded] = useState(false)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!traineeId || !user?.uid) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [relationships, traineeStats, recentWorkouts, program] = await Promise.all([
          trainerService.getTrainerTrainees(user.uid),
          trainerService.getTraineeStats(traineeId),
          getUserWorkoutHistory(traineeId, 10),
          programService.getTraineeActiveProgram(traineeId),
        ])

        const rel = relationships.find((r) => r.traineeId === traineeId)
        if (!rel) {
          setError('מתאמן לא נמצא')
          setIsLoading(false)
          return
        }

        const profile = await trainerService.getTraineeProfile(traineeId)

        setTrainee({
          relationship: rel,
          traineeProfile: profile
            ? {
                uid: profile.uid,
                firstName: profile.firstName,
                lastName: profile.lastName,
                displayName: profile.displayName,
                email: profile.email,
                phoneNumber: profile.phoneNumber,
                trainingGoals: profile.trainingGoals as any,
                injuriesOrLimitations: profile.injuriesOrLimitations,
              }
            : undefined,
          lastWorkoutDate: recentWorkouts.length > 0 ? recentWorkouts[0].date : undefined,
          thisWeekWorkouts: traineeStats.thisWeekWorkouts,
          thisMonthWorkouts: traineeStats.thisMonthWorkouts,
          currentStreak: traineeStats.currentStreak,
          programCompletionRate: traineeStats.programCompletionRate,
        })
        setStats(traineeStats)
        setWorkouts(recentWorkouts)
        setActiveProgram(program)
      } catch (err: any) {
        console.error('Error loading trainee detail:', err)
        setError(err.message || 'שגיאה בטעינת נתונים')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [traineeId, user?.uid])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  if (error || !trainee) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/trainer')}
          className="btn-ghost flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה</span>
        </button>
        <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl text-center py-8">
          {error || 'מתאמן לא נמצא'}
        </div>
      </div>
    )
  }

  const totalExercises =
    activeProgram?.weeklyStructure.flatMap((d) => d.exercises).length || 0
  const trainingDays =
    activeProgram?.weeklyStructure.filter((d) => !d.restDay).length || 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/trainer')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm">חזרה לרשימה</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/trainer/trainee/${traineeId}/messages`)}
            className="bg-gradient-to-br from-primary-main to-status-info px-4 py-2 rounded-xl hover:opacity-90 transition flex items-center gap-2 text-sm text-white font-medium"
          >
            <Send className="w-4 h-4" />
            <span>שלח הודעה</span>
          </button>
        </div>
      </div>

      {/* Profile */}
      <TraineeProfileSection trainee={trainee} />

      {/* Performance Stats */}
      {stats && (
        <div>
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-gradient-primary rounded-full" />
            ביצועים
          </h3>
          <TraineePerformance stats={stats} />
        </div>
      )}

      {/* Active Program */}
      {activeProgram && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-primary rounded-full" />
              תוכנית נוכחית
            </h3>
            <button
              onClick={() => navigate(`/trainer/program/${activeProgram.id}/edit`)}
              className="text-primary-main hover:underline text-sm"
            >
              ערוך תוכנית ←
            </button>
          </div>
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
            {/* Program summary card - clickable */}
            <button
              onClick={() => {
                setIsProgramExpanded((prev) => !prev)
                if (isProgramExpanded) setExpandedDayIndex(null)
              }}
              className="w-full p-5 text-right"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  📋
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-text-primary truncate">{activeProgram.name}</h4>
                  <p className="text-text-muted text-sm">
                    {trainingDays} ימים בשבוע • {totalExercises} תרגילים
                    {activeProgram.durationWeeks
                      ? ` • שבוע ${activeProgram.currentWeek}/${activeProgram.durationWeeks}`
                      : ''}
                  </p>
                </div>
                {activeProgram.durationWeeks && (
                  <div className="text-left flex-shrink-0">
                    <div className="text-2xl font-bold text-primary-main">
                      {Math.round(
                        (activeProgram.currentWeek / activeProgram.durationWeeks) * 100
                      )}
                      %
                    </div>
                    <div className="text-xs text-text-muted">התקדמות</div>
                  </div>
                )}
              </div>
            </button>

            {/* Expanded: Program days list */}
            {isProgramExpanded && (
              <div className="border-t border-dark-border">
                {/* Close button */}
                <div className="flex justify-between items-center px-5 pt-3 pb-1">
                  <span className="text-sm font-medium text-text-muted">
                    אימונים בתוכנית ({trainingDays})
                  </span>
                  <button
                    onClick={() => {
                      setIsProgramExpanded(false)
                      setExpandedDayIndex(null)
                    }}
                    className="p-1 text-text-muted hover:text-text-primary transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="px-4 pb-4 space-y-2">
                  {activeProgram.weeklyStructure
                    .filter((day) => !day.restDay)
                    .map((day, filteredIdx) => {
                      const originalIdx = activeProgram.weeklyStructure.findIndex(
                        (d) => d.dayLabel === day.dayLabel
                      )
                      const isExpanded = expandedDayIndex === originalIdx
                      const dayGradients = [
                        'from-primary-main to-teal-600',
                        'from-status-info to-blue-600',
                        'from-accent-purple to-purple-600',
                        'from-accent-orange to-orange-600',
                        'from-accent-pink to-pink-600',
                        'from-accent-gold to-yellow-600',
                        'from-status-success to-green-600',
                      ]
                      const pastDue =
                        day.dayOfWeek !== undefined && isDayPastDue(day.dayOfWeek)
                      const gradient = pastDue
                        ? 'from-status-error to-red-700'
                        : dayGradients[filteredIdx % dayGradients.length]
                      const dayNumber = filteredIdx + 1
                      const dateLabel =
                        day.dayOfWeek !== undefined
                          ? formatDayDate(day.dayOfWeek)
                          : null

                      return (
                        <div
                          key={day.dayLabel}
                          className={`rounded-xl overflow-hidden ${
                            pastDue
                              ? 'bg-status-error/10 border border-status-error/30'
                              : 'bg-dark-surface/50'
                          }`}
                        >
                          {/* Day header - clickable */}
                          <button
                            onClick={() =>
                              setExpandedDayIndex(isExpanded ? null : originalIdx)
                            }
                            className="w-full p-3 flex items-center gap-3 text-right"
                          >
                            <div
                              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}
                            >
                              {dayNumber}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold text-sm truncate ${pastDue ? 'text-status-error' : 'text-text-primary'}`}>
                                {day.name || `אימון ${dayNumber}`}
                              </div>
                              <div className="text-xs text-text-muted">
                                {dateLabel && (
                                  <span className={pastDue ? 'text-status-error/70' : ''}>
                                    {dateLabel} •{' '}
                                  </span>
                                )}
                                {day.exercises?.length || 0} תרגילים
                                {day.estimatedDuration
                                  ? ` • ${day.estimatedDuration} דקות`
                                  : ''}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className={`w-4 h-4 flex-shrink-0 ${pastDue ? 'text-status-error' : 'text-primary-main'}`} />
                            ) : (
                              <ChevronLeft className={`w-4 h-4 flex-shrink-0 ${pastDue ? 'text-status-error/60' : 'text-text-muted'}`} />
                            )}
                          </button>

                          {/* Expanded: exercises list */}
                          {isExpanded && day.exercises && (
                            <div className="px-3 pb-3 pt-1 border-t border-dark-border/50 space-y-1.5">
                              {day.exercises.map((ex, exIdx) => (
                                <div
                                  key={`${ex.exerciseId}-${exIdx}`}
                                  className="flex items-center gap-3 py-2 px-2 rounded-lg bg-dark-card/40"
                                >
                                  {ex.imageUrl ? (
                                    <img
                                      src={ex.imageUrl}
                                      alt=""
                                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-dark-surface flex items-center justify-center text-sm flex-shrink-0">
                                      🏋️
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-text-primary truncate">
                                      {ex.exerciseNameHe || ex.exerciseName}
                                    </div>
                                    {ex.notes && (
                                      <div className="text-xs text-text-muted truncate">
                                        {ex.notes}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-primary-main flex-shrink-0">
                                    {ex.targetSets}×{ex.targetReps}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-primary rounded-full" />
            אימונים אחרונים
          </h3>
        </div>
        <TraineeRecentWorkouts workouts={workouts} />
      </div>
    </div>
  )
}
