import { AlertTriangle, FileText, Pencil } from 'lucide-react'
import type { TraineeWithStats } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'
import { TraineeAvatar } from './TraineeAvatar'

interface TraineeProfileSectionProps {
  trainee: TraineeWithStats
  onEdit?: () => void
}

export function TraineeProfileSection({ trainee, onEdit }: TraineeProfileSectionProps) {
  const profile = trainee.traineeProfile
  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : trainee.relationship.traineeName

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
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 relative">
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg bg-dark-surface/80 text-on-surface-variant hover:text-primary-main hover:bg-dark-surface transition"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-5">
          {/* Large Avatar */}
          <div className="relative flex-shrink-0">
            <TraineeAvatar
              traineeId={trainee.relationship.traineeId}
              displayName={displayName}
              photoURL={profile?.photoURL}
              sizeClass="w-20 h-20 sm:w-24 sm:h-24"
              roundedClass="rounded-3xl"
              textSizeClass="text-3xl sm:text-4xl"
            />
            <div
              className={`absolute -bottom-2 -right-2 w-7 h-7 ${statusColor} rounded-full border-4 border-dark-bg flex items-center justify-center z-10`}
            >
              <span className="text-xs text-white">✓</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary truncate">
              {displayName}
            </h1>
            <p className="text-on-surface-variant text-sm mt-0.5 truncate">
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
                <span className="text-xs text-on-surface-variant">ביצוע</span>
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
              <span className="text-[10px] text-on-surface-variant">ביצוע</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body Metrics */}
      {profile && (profile.age || profile.height || profile.weight || profile.bodyFatPercentage) && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: profile.age, label: 'גיל', unit: '' },
            { value: profile.height, label: 'גובה', unit: 'ס"מ' },
            { value: profile.weight, label: 'משקל', unit: 'ק"ג' },
            { value: profile.bodyFatPercentage, label: 'שומן', unit: '%' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-xl p-3 text-center"
            >
              <div className="text-lg font-bold text-primary-main">
                {metric.value != null ? metric.value : '—'}
              </div>
              <div className="text-xs text-on-surface-variant">
                {metric.label}
                {metric.unit && metric.value != null && (
                  <span className="text-on-surface-variant/60"> {metric.unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Injuries/limitations */}
      {profile?.injuriesOrLimitations && (
        <div className="bg-status-warning/5 border border-status-warning/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            <span className="text-sm font-medium text-status-warning">מגבלות/פציעות</span>
          </div>
          <p className="text-sm text-on-surface-variant">{profile.injuriesOrLimitations}</p>
        </div>
      )}

      {/* Trainer notes */}
      {trainee.relationship.notes && (
        <div className="bg-dark-card/50 border border-dark-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-status-info" />
            <span className="text-sm font-medium text-on-surface-variant">הערות מאמן</span>
          </div>
          <p className="text-sm text-on-surface-variant">{trainee.relationship.notes}</p>
        </div>
      )}
    </div>
  )
}
