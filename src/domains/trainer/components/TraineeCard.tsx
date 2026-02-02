import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  TrendingUp,
  Flame,
} from 'lucide-react'
import type { TraineeWithStats } from '../types'

interface TraineeCardProps {
  trainee: TraineeWithStats
}

export function TraineeCard({ trainee }: TraineeCardProps) {
  const navigate = useNavigate()
  const {
    relationship,
    traineeProfile,
    lastWorkoutDate,
    thisWeekWorkouts,
    currentStreak,
  } = trainee

  const displayName = traineeProfile
    ? `${traineeProfile.firstName} ${traineeProfile.lastName}`
    : relationship.traineeName

  const initial = traineeProfile?.firstName?.charAt(0) || displayName.charAt(0)

  const lastWorkoutText = lastWorkoutDate
    ? formatRelativeDate(lastWorkoutDate)
    : 'ללא אימונים'

  // Status indicator based on this week's activity
  const getActivityStatus = () => {
    if (thisWeekWorkouts >= 3) return { color: 'bg-status-success', label: 'פעיל' }
    if (thisWeekWorkouts >= 1) return { color: 'bg-status-warning', label: 'חלקי' }
    return { color: 'bg-status-error', label: 'לא פעיל' }
  }

  const activityStatus = getActivityStatus()

  return (
    <div
      onClick={() => navigate(`/trainer/trainee/${relationship.traineeId}`)}
      className="card cursor-pointer transition-all duration-200 hover:border-status-info/50 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-status-info/20 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-status-info">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {displayName}
          </h3>
          <p className="text-sm text-text-muted truncate">
            {relationship.traineeEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${activityStatus.color}`} />
          <span className="text-xs text-text-muted">{activityStatus.label}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-text-secondary truncate">{lastWorkoutText}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-text-secondary">{thisWeekWorkouts}/שבוע</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Flame className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="text-text-secondary">{currentStreak} ימים</span>
        </div>
      </div>
    </div>
  )
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`
  return `לפני ${Math.floor(days / 30)} חודשים`
}
