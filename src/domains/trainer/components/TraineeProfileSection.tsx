import { User, Target, AlertTriangle, FileText } from 'lucide-react'
import type { TraineeWithStats } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'

interface TraineeProfileSectionProps {
  trainee: TraineeWithStats
}

export function TraineeProfileSection({ trainee }: TraineeProfileSectionProps) {
  const profile = trainee.traineeProfile

  return (
    <div className="card space-y-4">
      {/* Name and contact */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            {profile?.firstName} {profile?.lastName}
          </h3>
          <p className="text-sm text-text-muted">{profile?.email}</p>
          {profile?.phoneNumber && (
            <p className="text-sm text-text-muted">{profile.phoneNumber}</p>
          )}
        </div>
      </div>

      {/* Training goals */}
      {profile?.trainingGoals && profile.trainingGoals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary-main" />
            <span className="text-sm font-medium text-text-secondary">מטרות אימון</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.trainingGoals.map((goal) => (
              <span
                key={goal}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-main/10 text-primary-main"
              >
                {TRAINING_GOAL_LABELS[goal] || goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Injuries/limitations */}
      {profile?.injuriesOrLimitations && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            <span className="text-sm font-medium text-text-secondary">מגבלות/פציעות</span>
          </div>
          <p className="text-sm text-text-muted bg-status-warning/5 rounded-lg p-3 border border-status-warning/20">
            {profile.injuriesOrLimitations}
          </p>
        </div>
      )}

      {/* Trainer notes */}
      {trainee.relationship.notes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-status-info" />
            <span className="text-sm font-medium text-text-secondary">הערות מאמן</span>
          </div>
          <p className="text-sm text-text-muted bg-dark-card rounded-lg p-3">
            {trainee.relationship.notes}
          </p>
        </div>
      )}
    </div>
  )
}
