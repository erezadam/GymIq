import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Send, ChevronDown, ChevronLeft, Check, Plus, ClipboardEdit } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { trainerService } from '../services/trainerService'
import { programService } from '../services/programService'
import { getUserWorkoutHistory, getWorkoutById } from '@/lib/firebase/workoutHistory'
import { useWorkoutBuilderStore } from '@/domains/workouts/store/workoutBuilderStore'
import type { TraineeWithStats, TraineeStats, TrainingProgram } from '../types'
import type { WorkoutHistorySummary, WorkoutHistoryEntry } from '@/domains/workouts/types'
import { TraineeProfileSection } from './TraineeProfileSection'
import { TraineePerformance } from './TraineePerformance'
import { TraineeRecentWorkouts } from './TraineeRecentWorkouts'
import { TraineeEditModal } from './TraineeEditModal'
import { StandaloneWorkoutEditor } from './StandaloneWorkoutEditor'

export default function TraineeDetail() {
  const { id: traineeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trainee, setTrainee] = useState<TraineeWithStats | null>(null)
  const [stats, setStats] = useState<TraineeStats | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [allPrograms, setAllPrograms] = useState<TrainingProgram[]>([])
  const [showProgramsList, setShowProgramsList] = useState(false)
  const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null)
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)
  const [expandedDayWorkout, setExpandedDayWorkout] = useState<WorkoutHistoryEntry | null>(null)
  const [loadingWorkout, setLoadingWorkout] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showWorkouts, setShowWorkouts] = useState(false)
  const [showStandaloneEditor, setShowStandaloneEditor] = useState(false)

  const { loadFromProgram, setTrainerReport, clearWorkout } = useWorkoutBuilderStore()

  // Currently expanded program (from the programs list)
  const expandedProgram = allPrograms.find(p => p.id === expandedProgramId) || null

  // Build map of completed program days from workout history
  const completedDays = useMemo(() => {
    const map = new Map<string, { date: Date; workoutId: string }>()
    if (!expandedProgram) return map
    workouts.forEach(w => {
      if (w.programId === expandedProgram.id && w.source === 'trainer_program' && w.status === 'completed' && w.programDayLabel) {
        const existing = map.get(w.programDayLabel)
        if (!existing || w.date > existing.date) {
          map.set(w.programDayLabel, { date: w.date, workoutId: w.id })
        }
      }
    })
    return map
  }, [workouts, expandedProgram])

  // Fetch full workout data when expanding a completed day
  useEffect(() => {
    if (expandedDayIndex === null || !expandedProgram) {
      setExpandedDayWorkout(null)
      return
    }
    const day = expandedProgram.weeklyStructure[expandedDayIndex]
    if (!day) return
    const completed = completedDays.get(day.dayLabel)
    if (!completed) {
      setExpandedDayWorkout(null)
      return
    }
    setLoadingWorkout(true)
    getWorkoutById(completed.workoutId)
      .then(w => setExpandedDayWorkout(w))
      .catch(() => setExpandedDayWorkout(null))
      .finally(() => setLoadingWorkout(false))
  }, [expandedDayIndex, expandedProgram, completedDays])

  useEffect(() => {
    if (!traineeId || !user?.uid) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [relationships, traineeStats, recentWorkouts] = await Promise.all([
          trainerService.getTrainerTrainees(user.uid),
          trainerService.getTraineeStats(traineeId),
          getUserWorkoutHistory(traineeId, 10),
        ])

        // Load programs separately - don't block page if index is missing
        programService.getTraineePrograms(traineeId)
          .then(programs => setAllPrograms(programs))
          .catch(err => console.warn('Could not load programs:', err))

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
                age: profile.age,
                height: profile.height,
                weight: profile.weight,
                bodyFatPercentage: profile.bodyFatPercentage,
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

  const handleEditSave = async () => {
    setShowEditModal(false)
    if (!traineeId || !user?.uid) return
    try {
      const [relationships, profile] = await Promise.all([
        trainerService.getTrainerTrainees(user.uid),
        trainerService.getTraineeProfile(traineeId),
      ])
      const rel = relationships.find((r) => r.traineeId === traineeId)
      if (rel && trainee) {
        setTrainee({
          ...trainee,
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
                age: profile.age,
                height: profile.height,
                weight: profile.weight,
                bodyFatPercentage: profile.bodyFatPercentage,
              }
            : undefined,
        })
      }
    } catch (err) {
      console.error('Error reloading trainee data:', err)
    }
  }

  // Report workout on behalf of trainee
  const handleReportWorkout = (program: TrainingProgram, dayIndex: number) => {
    const day = program.weeklyStructure[dayIndex]
    if (!day || !traineeId || !user) return

    clearWorkout()
    loadFromProgram(day, program.id, program.name)
    setTrainerReport(traineeId, user.uid, user.displayName || user.email || 'מאמן')
    navigate('/workout/session')
  }

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
      <TraineeProfileSection trainee={trainee} onEdit={() => setShowEditModal(true)} />

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

      {/* Training Programs */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-primary rounded-full" />
            תוכנית אימונים
          </h3>
        </div>

        {/* Three action buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => navigate(`/trainer/program/new?traineeId=${traineeId}`)}
            className="flex-1 bg-dark-card/80 border border-primary-main/30 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-primary-main/60 transition"
          >
            <Plus className="w-4 h-4 text-primary-main" />
            <span className="text-xs font-medium text-primary-main">תוכנית חדשה</span>
          </button>
          <button
            onClick={() => {
              setShowProgramsList(prev => !prev)
              if (showProgramsList) {
                setExpandedProgramId(null)
                setExpandedDayIndex(null)
              }
            }}
            className={`flex-1 border rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition ${
              showProgramsList
                ? 'bg-accent-purple/10 border-accent-purple/30'
                : 'bg-dark-card/80 border-white/10 hover:border-accent-purple/30'
            }`}
          >
            <span className="text-xs font-medium text-accent-purple">
              תוכניות {allPrograms.filter(p => p.type !== 'standalone').length > 0 ? `(${allPrograms.filter(p => p.type !== 'standalone').length})` : ''}
            </span>
            <ChevronDown className={`w-3 h-3 text-accent-purple transition-transform ${showProgramsList ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setShowStandaloneEditor(true)}
            className="flex-1 bg-dark-card/80 border border-accent-orange/30 rounded-xl p-3 flex flex-col items-center justify-center gap-1 hover:border-accent-orange/60 transition"
          >
            <ClipboardEdit className="w-4 h-4 text-accent-orange" />
            <span className="text-xs font-medium text-accent-orange">אימון בודד</span>
          </button>
        </div>

        {/* Programs list (excluding standalone) */}
        {showProgramsList && (
          <div className="space-y-2">
            {allPrograms.filter(p => p.type !== 'standalone').length === 0 ? (
              <div className="bg-dark-card/80 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-sm text-text-muted">אין תוכניות עדיין</p>
              </div>
            ) : (
              allPrograms.filter(p => p.type !== 'standalone').map((program) => {
                const isProgramExpanded = expandedProgramId === program.id
                const progTrainingDays = program.weeklyStructure?.filter(d => !d.restDay).length || 0
                const progTotalExercises = program.weeklyStructure?.flatMap(d => d.exercises).length || 0

                return (
                  <div key={program.id} className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden">
                    {/* Program header - clickable */}
                    <button
                      onClick={() => {
                        setExpandedProgramId(isProgramExpanded ? null : program.id)
                        setExpandedDayIndex(null)
                      }}
                      className="w-full p-4 flex items-center gap-3 text-right"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-purple-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-text-primary truncate">{program.name}</h4>
                          {program.status === 'active' && (
                            <span className="px-2 py-0.5 bg-primary-main/20 text-primary-main text-xs rounded flex-shrink-0">פעילה</span>
                          )}
                        </div>
                        <p className="text-text-muted text-xs">
                          {progTrainingDays} ימים • {progTotalExercises} תרגילים
                          {program.durationWeeks ? ` • ${program.durationWeeks} שבועות` : ''}
                        </p>
                      </div>
                      {isProgramExpanded ? (
                        <ChevronDown className="w-4 h-4 text-accent-purple flex-shrink-0" />
                      ) : (
                        <ChevronLeft className="w-4 h-4 text-text-muted flex-shrink-0" />
                      )}
                    </button>

                    {/* Expanded: Days list */}
                    {isProgramExpanded && program.weeklyStructure && (
                      <div className="border-t border-dark-border px-4 pb-4 pt-2 space-y-2">
                        {/* Edit button */}
                        <div className="flex justify-end mb-1">
                          <button
                            onClick={() => navigate(`/trainer/program/${program.id}/edit`)}
                            className="text-xs text-primary-main hover:underline"
                          >
                            ערוך תוכנית ←
                          </button>
                        </div>

                        {program.weeklyStructure
                          .filter(day => !day.restDay)
                          .map((day, filteredIdx) => {
                            const foundIdx = program.weeklyStructure.findIndex(
                              d => d.dayLabel === day.dayLabel
                            )
                            const originalIdx = foundIdx >= 0 ? foundIdx : filteredIdx
                            const isDayExpanded = expandedDayIndex === originalIdx
                            const dayCompleted = completedDays.get(day.dayLabel)
                            const dayNumber = filteredIdx + 1

                            const workoutExercises = isDayExpanded && dayCompleted && expandedDayWorkout
                              ? expandedDayWorkout.exercises
                              : null

                            return (
                              <div
                                key={day.dayLabel}
                                className={`rounded-xl overflow-hidden ${
                                  dayCompleted
                                    ? 'bg-status-success/10 border border-status-success/30'
                                    : 'bg-dark-surface/50'
                                }`}
                              >
                                {/* Day header - clickable */}
                                <button
                                  onClick={() => setExpandedDayIndex(isDayExpanded ? null : originalIdx)}
                                  className="w-full p-3 flex items-center gap-3 text-right"
                                >
                                  <div
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                                      dayCompleted
                                        ? 'bg-gradient-to-br from-status-success to-green-700'
                                        : 'bg-gradient-to-br from-accent-purple to-purple-600'
                                    }`}
                                  >
                                    {dayCompleted ? <Check className="w-5 h-5" /> : dayNumber}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm truncate ${
                                      dayCompleted ? 'text-status-success' : 'text-text-primary'
                                    }`}>
                                      {day.name || `אימון ${dayNumber}`}
                                    </div>
                                    <div className="text-xs text-text-muted">
                                      {dayCompleted ? (
                                        <span className="text-status-success/80">
                                          בוצע {dayCompleted.date.getDate()}.{dayCompleted.date.getMonth() + 1}.{dayCompleted.date.getFullYear()} •{' '}
                                        </span>
                                      ) : null}
                                      {day.exercises?.length || 0} תרגילים
                                      {day.estimatedDuration ? ` • ${day.estimatedDuration} דקות` : ''}
                                    </div>
                                  </div>
                                  {isDayExpanded ? (
                                    <ChevronDown className={`w-4 h-4 flex-shrink-0 ${
                                      dayCompleted ? 'text-status-success' : 'text-accent-purple'
                                    }`} />
                                  ) : (
                                    <ChevronLeft className={`w-4 h-4 flex-shrink-0 ${
                                      dayCompleted ? 'text-status-success/60' : 'text-text-muted'
                                    }`} />
                                  )}
                                </button>

                                {/* Expanded: exercises list */}
                                {isDayExpanded && day.exercises && (
                                  <div className="px-3 pb-3 pt-1 border-t border-dark-border/50 space-y-1.5">
                                    {/* Report workout button */}
                                    {!dayCompleted && (
                                      <button
                                        onClick={() => handleReportWorkout(program, originalIdx)}
                                        className="w-full py-2 px-3 bg-accent-purple/10 border border-accent-purple/30 rounded-lg flex items-center justify-center gap-2 hover:bg-accent-purple/20 transition text-sm"
                                      >
                                        <ClipboardEdit className="w-4 h-4 text-accent-purple" />
                                        <span className="text-accent-purple font-medium">דווח אימון עבור מתאמן</span>
                                      </button>
                                    )}
                                    {loadingWorkout && dayCompleted && (
                                      <div className="flex justify-center py-2">
                                        <div className="spinner w-4 h-4" />
                                      </div>
                                    )}
                                    {day.exercises.map((ex, exIdx) => {
                                      const actualEx = workoutExercises?.find(
                                        we => we.exerciseId === ex.exerciseId
                                      )
                                      const actualSets = actualEx?.sets?.filter(
                                        s => s.completed || (s.actualReps && s.actualReps > 0)
                                      )

                                      return (
                                        <div
                                          key={`${ex.exerciseId}-${exIdx}`}
                                          className="rounded-lg bg-dark-card/40 overflow-hidden"
                                        >
                                          <div className="flex items-center gap-3 py-2 px-2">
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
                                            <div className={`text-xs flex-shrink-0 ${
                                              actualSets && actualSets.length > 0 ? 'text-status-success' : 'text-primary-main'
                                            }`}>
                                              {ex.targetSets}×{ex.targetReps}
                                            </div>
                                          </div>

                                          {/* Actual sets performed */}
                                          {actualSets && actualSets.length > 0 && (
                                            <div className="px-2 pb-2 pr-14 space-y-0.5">
                                              {actualSets.map((set, setIdx) => {
                                                const isLast = setIdx === actualSets.length - 1
                                                return (
                                                  <div
                                                    key={setIdx}
                                                    className="flex items-center gap-1.5 text-xs text-text-muted"
                                                  >
                                                    <span className="text-status-success/50">
                                                      {isLast ? '└─' : '├─'}
                                                    </span>
                                                    <span>סט {setIdx + 1}:</span>
                                                    <span className="text-text-secondary">
                                                      {(set.actualWeight || 0) > 0 && (
                                                        <>{set.actualWeight} ק&quot;ג × </>
                                                      )}
                                                      {set.actualReps || 0}
                                                      {(set.actualWeight || 0) === 0 && ' חזרות'}
                                                    </span>
                                                    <Check className="w-3 h-3 text-status-success" />
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Standalone Workouts Section */}
        {allPrograms.filter(p => p.type === 'standalone').length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
              <ClipboardEdit className="w-4 h-4 text-accent-orange" />
              אימונים בודדים ({allPrograms.filter(p => p.type === 'standalone').length})
            </h4>
            <div className="space-y-2">
              {allPrograms
                .filter(p => p.type === 'standalone')
                .map((workout) => {
                  const day = workout.weeklyStructure?.[0]
                  const exerciseCount = day?.exercises?.length || 0
                  // Check if this standalone workout has been performed
                  const performedWorkout = workouts.find(
                    w => w.programId === workout.id && w.status === 'completed'
                  )

                  return (
                    <div
                      key={workout.id}
                      className={`rounded-xl overflow-hidden ${
                        performedWorkout
                          ? 'bg-status-success/10 border border-status-success/30'
                          : 'bg-dark-card/80 border border-accent-orange/20'
                      }`}
                    >
                      <div className="p-3 flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                            performedWorkout
                              ? 'bg-gradient-to-br from-status-success to-green-600'
                              : 'bg-gradient-to-br from-accent-orange to-orange-600'
                          }`}
                        >
                          {performedWorkout ? <Check className="w-5 h-5 text-white" /> : '🏋️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold text-sm truncate ${
                            performedWorkout ? 'text-status-success' : 'text-text-primary'
                          }`}>
                            {workout.name}
                          </h4>
                          <p className="text-text-muted text-xs">
                            {exerciseCount} תרגילים
                            {performedWorkout && (
                              <span className="text-status-success/80">
                                {' '}• בוצע {performedWorkout.date.getDate()}.{performedWorkout.date.getMonth() + 1}.{performedWorkout.date.getFullYear()}
                              </span>
                            )}
                          </p>
                        </div>
                        {!performedWorkout && day && (
                          <button
                            onClick={() => handleReportWorkout(workout, 0)}
                            className="px-3 py-1.5 bg-accent-orange/10 border border-accent-orange/30 rounded-lg text-xs text-accent-orange font-medium hover:bg-accent-orange/20 transition"
                          >
                            דווח
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Workouts - collapsed by default */}
      <div>
        <button
          onClick={() => setShowWorkouts(prev => !prev)}
          className="w-full flex justify-between items-center mb-3"
        >
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-primary rounded-full" />
            אימונים אחרונים
            {workouts.length > 0 && (
              <span className="text-sm font-normal text-text-muted">({workouts.length})</span>
            )}
          </h3>
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showWorkouts ? 'rotate-180' : ''}`} />
        </button>
        {showWorkouts && traineeId && (
          <TraineeRecentWorkouts workouts={workouts} traineeId={traineeId} />
        )}
      </div>

      {/* Edit Modal - rendered via portal to avoid layout containment issues */}
      {showEditModal && trainee && createPortal(
        <TraineeEditModal
          trainee={trainee}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
        />,
        document.body
      )}

      {/* Standalone Workout Editor */}
      {showStandaloneEditor && traineeId && trainee && createPortal(
        <StandaloneWorkoutEditor
          traineeId={traineeId}
          traineeName={trainee.traineeProfile?.displayName || trainee.relationship.traineeName}
          onClose={() => setShowStandaloneEditor(false)}
          onSaved={async () => {
            // Refresh programs list
            const programs = await programService.getTraineePrograms(traineeId)
            setAllPrograms(programs)
          }}
        />,
        document.body
      )}
    </div>
  )
}
