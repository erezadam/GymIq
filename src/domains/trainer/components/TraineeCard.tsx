import { useNavigate } from 'react-router-dom'
import { Flame, CalendarDays, CircleAlert, AlertTriangle, CheckCircle } from 'lucide-react'
import type { TraineeWithStats } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'

const AVATAR_GRADIENTS = [
  'from-primary-main to-status-info',
  'from-accent-purple to-accent-pink',
  'from-status-error to-accent-orange',
  'from-status-info to-primary-main',
  'from-accent-gold to-accent-orange',
  'from-status-success to-primary-main',
]

function getAvatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function getMemberDuration(date: Date | any): string {
  const d = date instanceof Date ? date : date?.toDate?.() || new Date(date)
  const months = Math.floor(daysSince(d) / 30)
  if (months < 1) return 'חדש'
  if (months === 1) return 'חודש'
  return `${months} חודשים`
}

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
    activeProgram,
  } = trainee

  const displayName = traineeProfile
    ? `${traineeProfile.firstName} ${traineeProfile.lastName}`
    : relationship.traineeName

  const initial = traineeProfile?.firstName?.charAt(0) || displayName.charAt(0)
  const avatarGradient = getAvatarGradient(displayName)

  const getDotColor = () => {
    if (thisWeekWorkouts >= 3) return 'bg-status-success'
    if (thisWeekWorkouts >= 1) return 'bg-status-warning'
    if (!lastWorkoutDate || daysSince(lastWorkoutDate) > 5) return 'bg-status-error'
    return 'bg-status-info'
  }

  const dotColor = getDotColor()
  const goalLabel = traineeProfile?.trainingGoals?.[0]
    ? TRAINING_GOAL_LABELS[traineeProfile.trainingGoals[0]]
    : undefined
  const memberDuration = getMemberDuration(relationship.createdAt)

  const needsAttention =
    !lastWorkoutDate || (lastWorkoutDate && daysSince(lastWorkoutDate) > 5 && thisWeekWorkouts === 0)

  return (
    <div
      onClick={() => navigate(`/trainer/trainee/${relationship.traineeId}`)}
      className={`bg-dark-card border rounded-2xl p-4 transition-all cursor-pointer shadow-card hover:shadow-card-hover ${
        needsAttention ? 'border-accent-orange/20 hover:border-accent-orange/40' : 'border-white/5 hover:border-white/10'
      }`}
    >
      {/* Needs attention badge */}
      {needsAttention && (
        <div className="flex justify-center mb-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent-orange/40 text-accent-orange text-xs">
            דורש תשומת לב
            <CircleAlert className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* Name + Avatar row */}
      <div className="flex items-center gap-3 mb-4">
        {/* Name - first child = start = RIGHT in RTL */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-text-primary truncate">{displayName}</h3>
          <p className="text-text-muted text-xs truncate">
            {goalLabel && <>{goalLabel} &middot; </>}
            {memberDuration}
          </p>
        </div>

        {/* Avatar - second child = end = LEFT in RTL */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xl font-bold text-white shadow-md`}
          >
            {initial}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 ${dotColor} rounded-full border-2 border-dark-card`}
          />
        </div>
      </div>

      {/* Program status */}
      <div className="mb-3">
        {activeProgram ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-status-success" />
            <span className="text-xs text-status-success">פעיל</span>
            <span className="text-xs text-text-muted truncate">{activeProgram.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-xs text-status-warning">אין תוכנית פעילה</span>
          </div>
        )}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-2">
        {/* First grid item = RIGHT column in RTL = השבוע */}
        <div className="bg-dark-surface border border-white/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-muted text-xs">השבוע</span>
            <CalendarDays className="w-3.5 h-3.5 text-text-muted" />
          </div>
          <p className="text-lg font-bold text-text-primary">{thisWeekWorkouts}/3</p>
        </div>
        {/* Second grid item = LEFT column in RTL = רצף ימים */}
        <div className="bg-dark-surface border border-white/10 rounded-xl px-3 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-muted text-xs">רצף ימים</span>
            <Flame className="w-3.5 h-3.5 text-accent-orange" />
          </div>
          <p className="text-lg font-bold text-text-primary">{currentStreak}</p>
        </div>
      </div>
    </div>
  )
}
