import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Dumbbell, TrendingUp, Trophy, ChevronLeft, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import type { WorkoutHistorySummary, WorkoutCompletionStatus } from '../types'

export default function WorkoutHistory() {
  const { user } = useAuthStore()
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkouts()
  }, [user])

  const loadWorkouts = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      const history = await getUserWorkoutHistory(user.uid)
      setWorkouts(history)
    } catch (error) {
      console.error('Failed to load workout history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 0) return 'היום'
    if (diff === 1) return 'אתמול'
    if (diff < 7) return `לפני ${diff} ימים`

    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}T`
    }
    return `${kg}kg`
  }

  const getStatusBadge = (status: WorkoutCompletionStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge-completed flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            הושלם
          </span>
        )
      case 'partial':
        return (
          <span className="badge-partial flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            חלקי
          </span>
        )
      case 'cancelled':
        return (
          <span className="badge-cancelled flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            בוטל
          </span>
        )
    }
  }

  // Group by month
  const groupedByMonth = workouts.reduce((acc, workout) => {
    const monthKey = workout.date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
    })
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(workout)
    return acc
  }, {} as Record<string, WorkoutHistorySummary[]>)

  // Calculate stats
  const totalWorkouts = workouts.length
  const completedWorkouts = workouts.filter(w => w.status === 'completed').length
  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0)
  const avgDuration = totalWorkouts > 0
    ? Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / totalWorkouts)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">היסטוריית אימונים</h1>
        <p className="text-text-muted mt-1">כל האימונים שלך במקום אחד</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-400/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{totalWorkouts}</p>
              <p className="text-text-muted text-xs">אימונים</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{completedWorkouts}</p>
              <p className="text-text-muted text-xs">הושלמו</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{formatVolume(totalVolume)}</p>
              <p className="text-text-muted text-xs">נפח כולל</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{avgDuration}</p>
              <p className="text-text-muted text-xs">דקות ממוצע</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workout list by month */}
      {Object.entries(groupedByMonth).map(([month, monthWorkouts]) => (
        <div key={month}>
          <h2 className="text-lg font-semibold text-text-primary mb-3">{month}</h2>
          <div className="space-y-3">
            {monthWorkouts.map((workout) => (
              <Link
                key={workout.id}
                to={`/workout/history/${workout.id}`}
                className="block p-4 bg-dark-surface hover:bg-dark-card border border-dark-border rounded-xl transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      workout.status === 'completed'
                        ? 'bg-green-400/20'
                        : workout.status === 'partial'
                          ? 'bg-yellow-400/20'
                          : 'bg-red-400/20'
                    }`}>
                      <Dumbbell className={`w-6 h-6 ${
                        workout.status === 'completed'
                          ? 'text-green-400'
                          : workout.status === 'partial'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-text-primary group-hover:text-primary-400 transition-colors">
                          {workout.name}
                        </p>
                        {getStatusBadge(workout.status)}
                        {workout.personalRecords > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/20 rounded-full">
                            <Trophy className="w-3 h-3 text-yellow-400" />
                            <span className="text-yellow-400 text-xs">{workout.personalRecords} PR</span>
                          </span>
                        )}
                      </div>
                      <p className="text-text-muted text-sm mt-1">
                        {formatDate(workout.date)} • {workout.duration} דקות • {workout.completedExercises}/{workout.totalExercises} תרגילים
                      </p>
                    </div>
                  </div>
                  <div className="text-left flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{formatVolume(workout.totalVolume)}</p>
                      <p className="text-text-muted text-sm">נפח</p>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-text-muted group-hover:text-primary-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {workouts.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">עדיין אין אימונים</h3>
          <p className="text-text-muted mb-6">התחל את האימון הראשון שלך!</p>
          <Link to="/exercises" className="btn-neon inline-flex items-center gap-2">
            התחל אימון
          </Link>
        </div>
      )}
    </div>
  )
}
