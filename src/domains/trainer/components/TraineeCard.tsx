import { useNavigate } from 'react-router-dom'
import type { TraineeWithStats } from '../types'
import { TRAINING_GOAL_LABELS, PROGRAM_STATUS_LABELS } from '../types'

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

function getProgressWidthClass(percent: number): string {
  if (percent >= 95) return 'w-full'
  if (percent >= 85) return 'w-[85%]'
  if (percent >= 75) return 'w-3/4'
  if (percent >= 60) return 'w-[60%]'
  if (percent >= 50) return 'w-1/2'
  if (percent >= 35) return 'w-[35%]'
  if (percent >= 25) return 'w-1/4'
  if (percent >= 15) return 'w-[15%]'
  if (percent >= 5) return 'w-[5%]'
  return 'w-0'
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function formatRelativeDate(date: Date): string {
  const days = daysSince(date)
  if (days === 0) return 'היום'
  if (days === 1) return 'אתמול'
  if (days < 7) return `לפני ${days} ימים`
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`
  return `לפני ${Math.floor(days / 30)} חודשים`
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
    programCompletionRate,
    activeProgram,
  } = trainee

  const displayName = traineeProfile
    ? `${traineeProfile.firstName} ${traineeProfile.lastName}`
    : relationship.traineeName

  const initial = traineeProfile?.firstName?.charAt(0) || displayName.charAt(0)
  const avatarGradient = getAvatarGradient(displayName)

  const getActivityStatus = () => {
    if (thisWeekWorkouts >= 3)
      return {
        dotColor: 'bg-status-success',
        label: 'פעיל',
        labelColor: 'bg-status-success/20 text-status-success',
      }
    if (thisWeekWorkouts >= 1)
      return {
        dotColor: 'bg-status-warning',
        label: `${thisWeekWorkouts}/3`,
        labelColor: 'bg-status-warning/20 text-status-warning',
      }
    if (!lastWorkoutDate || daysSince(lastWorkoutDate) > 5)
      return {
        dotColor: 'bg-status-error',
        label: 'דורש תשומת לב',
        labelColor: 'bg-status-error/20 text-status-error',
      }
    return {
      dotColor: 'bg-status-info',
      label: 'חדש',
      labelColor: 'bg-status-info/20 text-status-info',
    }
  }

  const status = getActivityStatus()
  const goalLabel = traineeProfile?.trainingGoals?.[0]
    ? TRAINING_GOAL_LABELS[traineeProfile.trainingGoals[0]]
    : undefined
  const memberDuration = getMemberDuration(relationship.createdAt)
  const completionPercent = Math.min(100, Math.max(0, programCompletionRate))
  const progressWidthClass = getProgressWidthClass(completionPercent)

  const progressBarColor =
    completionPercent >= 80
      ? 'bg-gradient-to-l from-primary-main to-status-info'
      : completionPercent >= 40
        ? 'bg-status-warning'
        : completionPercent > 0
          ? 'bg-status-error'
          : 'bg-status-info animate-pulse'

  const needsAttention =
    !lastWorkoutDate || (lastWorkoutDate && daysSince(lastWorkoutDate) > 5 && thisWeekWorkouts === 0)
  const borderClass = needsAttention
    ? 'border-status-error/30 hover:border-status-error/50'
    : 'border-primary-main/20 hover:border-primary-main/50'

  return (
    <div
      onClick={() => navigate(`/trainer/trainee/${relationship.traineeId}`)}
      className={`bg-gradient-to-br from-primary-main/10 to-status-info/10 border rounded-2xl p-4 transition cursor-pointer ${borderClass}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-2xl font-bold text-white`}
          >
            {initial}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 ${status.dotColor} rounded-full border-2 border-dark-bg`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-text-primary truncate">{displayName}</h3>
              <p className="text-text-muted text-sm truncate">
                {goalLabel && <>{goalLabel} • </>}
                {memberDuration}
              </p>
            </div>
            <span
              className={`px-2 py-1 ${status.labelColor} text-xs rounded-lg whitespace-nowrap flex-shrink-0`}
            >
              {status.label}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-medium text-text-primary">{currentStreak} ימים</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm">📊</span>
              <span className="text-sm font-medium text-text-primary">
                {thisWeekWorkouts}/3 השבוע
              </span>
            </div>
            {lastWorkoutDate && (
              <div className="flex items-center gap-1">
                <span className="text-sm">📅</span>
                <span className="text-sm font-medium text-text-secondary">
                  {formatRelativeDate(lastWorkoutDate)}
                </span>
              </div>
            )}
          </div>

          {/* Program info */}
          {activeProgram ? (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm">📋</span>
              <span className="text-sm font-medium text-text-primary truncate">
                {activeProgram.name}
              </span>
              <span
                className={`px-2 py-0.5 text-xs rounded-md flex-shrink-0 ${
                  activeProgram.status === 'active'
                    ? 'bg-status-success/20 text-status-success'
                    : activeProgram.status === 'draft'
                      ? 'bg-status-info/20 text-status-info'
                      : activeProgram.status === 'paused'
                        ? 'bg-status-warning/20 text-status-warning'
                        : 'bg-dark-surface text-text-muted'
                }`}
              >
                {PROGRAM_STATUS_LABELS[activeProgram.status]}
              </span>
              {activeProgram.durationWeeks && (
                <span className="text-xs text-text-muted flex-shrink-0">
                  שבוע {activeProgram.currentWeek}/{activeProgram.durationWeeks}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm">⚠️</span>
              <span className="text-xs text-status-warning">אין תוכנית פעילה</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-dark-card rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressBarColor} ${progressWidthClass}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
