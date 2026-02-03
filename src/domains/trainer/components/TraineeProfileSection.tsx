import { AlertTriangle, FileText } from 'lucide-react'
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

interface TraineeProfileSectionProps {
  trainee: TraineeWithStats
}

export function TraineeProfileSection({ trainee }: TraineeProfileSectionProps) {
  const profile = trainee.traineeProfile
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : trainee.relationship.traineeName
  const initial = profile?.firstName?.charAt(0) || displayName.charAt(0)
  const avatarGradient = getAvatarGradient(displayName)

  const completionPercent = Math.min(100, Math.max(0, trainee.programCompletionRate))
  const circumference = 283
  const strokeOffset = circumference - (circumference * completionPercent) / 100

  const statusColor =
    trainee.thisWeekWorkouts >= 3
      ? 'bg-status-success'
      : trainee.thisWeekWorkouts >= 1
        ? 'bg-status-warning'
        : 'bg-status-error'

  return (
    <div className="space-y-4">
      {/* Profile Header - Glass card */}
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-5">
          {/* Large Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-3xl sm:text-4xl font-bold text-white`}
            >
              {initial}
            </div>
            <div
              className={`absolute -bottom-2 -right-2 w-7 h-7 ${statusColor} rounded-full border-4 border-dark-bg flex items-center justify-center`}
            >
              <span className="text-xs text-white">✓</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary truncate">
              {displayName}
            </h1>
            <p className="text-text-muted text-sm mt-0.5 truncate">
              {profile?.email}
              {profile?.phoneNumber && ` • ${profile.phoneNumber}`}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {profile?.trainingGoals?.slice(0, 2).map((goal) => (
                <span
                  key={goal}
                  className="px-3 py-1 bg-primary-main/20 text-primary-main rounded-full text-sm"
                >
                  💪 {TRAINING_GOAL_LABELS[goal] || goal}
                </span>
              ))}
            </div>
          </div>

          {/* Circular Progress */}
          <div className="text-center flex-shrink-0 hidden sm:block">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  className="stroke-dark-card"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00D4AA" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-text-primary">{completionPercent}%</span>
                <span className="text-xs text-text-muted">ביצוע</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile circular progress - shown below on small screens */}
        <div className="sm:hidden flex justify-center mt-4 pt-4 border-t border-white/10">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                className="stroke-dark-card"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#progressGradientMobile)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="progressGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00D4AA" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-text-primary">{completionPercent}%</span>
              <span className="text-[10px] text-text-muted">ביצוע</span>
            </div>
          </div>
        </div>
      </div>

      {/* Injuries/limitations */}
      {profile?.injuriesOrLimitations && (
        <div className="bg-status-warning/5 border border-status-warning/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            <span className="text-sm font-medium text-status-warning">מגבלות/פציעות</span>
          </div>
          <p className="text-sm text-text-secondary">{profile.injuriesOrLimitations}</p>
        </div>
      )}

      {/* Trainer notes */}
      {trainee.relationship.notes && (
        <div className="bg-dark-card/50 border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-status-info" />
            <span className="text-sm font-medium text-text-secondary">הערות מאמן</span>
          </div>
          <p className="text-sm text-text-muted">{trainee.relationship.notes}</p>
        </div>
      )}
    </div>
  )
}
