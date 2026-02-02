import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Send, ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { trainerService } from '../services/trainerService'
import { programService } from '../services/programService'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import type { TraineeWithStats, TraineeStats, TrainingProgram } from '../types'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'
import { TraineeProfileSection } from './TraineeProfileSection'
import { TraineePerformance } from './TraineePerformance'
import { TraineeRecentWorkouts } from './TraineeRecentWorkouts'

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

  useEffect(() => {
    if (!traineeId || !user?.uid) return

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Load everything in parallel
        const [relationships, traineeStats, recentWorkouts, program] = await Promise.all([
          trainerService.getTrainerTrainees(user.uid),
          trainerService.getTraineeStats(traineeId),
          getUserWorkoutHistory(traineeId, 10),
          programService.getTraineeActiveProgram(traineeId),
        ])

        // Find the relationship for this trainee
        const rel = relationships.find((r) => r.traineeId === traineeId)
        if (!rel) {
          setError('מתאמן לא נמצא')
          setIsLoading(false)
          return
        }

        // Load the profile
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
        <div className="card bg-status-error/10 text-status-error text-center py-8">
          {error || 'מתאמן לא נמצא'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/trainer')}
          className="btn-ghost flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/trainer/trainee/${traineeId}/messages`)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            <span>שלח הודעה</span>
          </button>
        </div>
      </div>

      {/* Profile */}
      <TraineeProfileSection trainee={trainee} />

      {/* Active program */}
      {activeProgram && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted mb-2">תוכנית פעילה</h3>
          <div className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-main/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary-main" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{activeProgram.name}</p>
                <p className="text-xs text-text-muted">
                  {activeProgram.weeklyStructure.filter((d) => !d.restDay).length} ימי אימון
                  {activeProgram.durationWeeks ? ` · ${activeProgram.durationWeeks} שבועות` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/trainer/program/${activeProgram.id}/edit`)}
              className="text-xs text-primary-main hover:text-primary-light transition-colors"
            >
              ערוך
            </button>
          </div>
        </div>
      )}

      {/* Performance */}
      {stats && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted mb-2">ביצועים</h3>
          <TraineePerformance stats={stats} />
        </div>
      )}

      {/* Recent workouts */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted mb-2">
          אימונים אחרונים ({workouts.length})
        </h3>
        <TraineeRecentWorkouts workouts={workouts} />
      </div>
    </div>
  )
}
