import { useEffect, useState } from 'react'
import { trainerService } from '../../services/trainerService'
import { programService } from '../../services/programService'
import type { TraineeStats, TrainingProgram } from '../../types'
import type { AppUser } from '@/lib/firebase/auth'
import { TRAINING_GOAL_LABELS, type TrainingGoal } from '../../types'

interface TraineeSidePanelProps {
  traineeId: string
}

const PROGRESS_WIDTHS: Record<number, string> = {
  0: 'w-0',
  10: 'w-1/12',
  20: 'w-1/6',
  25: 'w-1/4',
  30: 'w-1/3',
  33: 'w-1/3',
  40: 'w-2/5',
  50: 'w-1/2',
  60: 'w-3/5',
  67: 'w-2/3',
  70: 'w-2/3',
  75: 'w-3/4',
  80: 'w-4/5',
  90: 'w-11/12',
  100: 'w-full',
}

function getProgressWidth(percent: number): string {
  const rounded = Math.round(percent / 10) * 10
  return PROGRESS_WIDTHS[rounded] || 'w-1/2'
}

export function TraineeSidePanel({ traineeId }: TraineeSidePanelProps) {
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [stats, setStats] = useState<TraineeStats | null>(null)
  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!traineeId) return
    setIsLoading(true)

    Promise.all([
      trainerService.getTraineeProfile(traineeId),
      trainerService.getTraineeStats(traineeId),
      programService.getTraineeActiveProgram(traineeId),
    ])
      .then(([p, s, prog]) => {
        setProfile(p)
        setStats(s)
        setActiveProgram(prog)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [traineeId])

  if (!traineeId) {
    return (
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center text-text-muted">
        <p className="text-lg mb-2">👤</p>
        <p>בחר מתאמן כדי לראות פרטים</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex justify-center">
        <div className="spinner" />
      </div>
    )
  }

  // Access profile fields - some may exist in Firestore but not in AppUser type
  const profileAny = profile as Record<string, any> | null
  const goals = (profile?.trainingGoals || []) as TrainingGoal[]
  const injuries = profile?.injuriesOrLimitations
  const notes = profileAny?.trainingNotes as string | undefined
  const fitnessLevel = profileAny?.fitnessLevel as string | undefined
  const programWeeks = activeProgram?.durationWeeks
  const currentWeek = activeProgram?.currentWeek || 0
  const progressPct = programWeeks ? Math.round((currentWeek / programWeeks) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
        <h3 className="font-bold text-sm text-text-muted mb-3 flex items-center gap-2">
          📊 סטטיסטיקות
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-surface/50 rounded-xl p-3 text-center">
            <div className="text-3xl font-black text-primary-main">
              {stats?.totalWorkouts || 0}
            </div>
            <div className="text-xs text-text-muted">סה&quot;כ אימונים</div>
          </div>
          <div className="bg-dark-surface/50 rounded-xl p-3 text-center">
            <div className="text-3xl font-black text-accent-orange">
              {stats?.currentStreak || 0}
            </div>
            <div className="text-xs text-text-muted">רצף ימים 🔥</div>
          </div>
          <div className="bg-dark-surface/50 rounded-xl p-3 text-center">
            <div className="text-3xl font-black text-status-success">
              {stats?.programCompletionRate || 0}%
            </div>
            <div className="text-xs text-text-muted">ביצוע תוכנית</div>
          </div>
          <div className="bg-dark-surface/50 rounded-xl p-3 text-center">
            <div className="text-3xl font-black text-status-info">
              {stats?.totalVolume ? `${Math.round(stats.totalVolume / 1000)}K` : '0'}
            </div>
            <div className="text-xs text-text-muted">נפח חודשי (kg)</div>
          </div>
        </div>
      </div>

      {/* Goals & Info */}
      {(goals.length > 0 || fitnessLevel) && (
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-text-muted mb-3 flex items-center gap-2">
            🎯 מטרות ומידע
          </h3>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <span
                key={goal}
                className="px-3 py-1.5 bg-primary-main/20 text-primary-main rounded-full text-sm"
              >
                {TRAINING_GOAL_LABELS[goal] || goal}
              </span>
            ))}
            {fitnessLevel && (
              <span className="px-3 py-1.5 bg-status-info/20 text-status-info rounded-full text-sm">
                🏋️ {fitnessLevel}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notes & Injuries */}
      {(injuries || notes) && (
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-text-muted mb-3 flex items-center gap-2">
            ⚠️ הערות ופציעות
          </h3>
          <div className="space-y-2">
            {injuries && (
              <div className="flex items-start gap-2 bg-status-warning/10 rounded-lg p-3">
                <span className="text-status-warning flex-shrink-0">⚠️</span>
                <span className="text-sm text-text-secondary">{injuries}</span>
              </div>
            )}
            {notes && (
              <div className="flex items-start gap-2 bg-status-info/10 rounded-lg p-3">
                <span className="text-status-info flex-shrink-0">💡</span>
                <span className="text-sm text-text-secondary">{notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Program */}
      {activeProgram && (
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
          <h3 className="font-bold text-sm text-text-muted mb-3 flex items-center gap-2">
            📋 תוכנית נוכחית
          </h3>
          <div className="bg-dark-surface/50 rounded-xl p-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-main to-status-info rounded-lg flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <div className="font-bold text-sm text-text-primary">{activeProgram.name}</div>
                {programWeeks && (
                  <div className="text-xs text-text-muted">
                    שבוע {currentWeek} מתוך {programWeeks}
                  </div>
                )}
              </div>
            </div>
            {programWeeks && (
              <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-l from-primary-main to-status-info rounded-full ${getProgressWidth(progressPct)}`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
