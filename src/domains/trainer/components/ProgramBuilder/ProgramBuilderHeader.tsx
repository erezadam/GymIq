import { Save, Loader2 } from 'lucide-react'
import type { TrainerRelationship, TraineeStats } from '../../types'

interface ProgramBuilderHeaderProps {
  traineeId: string
  trainees: TrainerRelationship[]
  stats: TraineeStats | null
  isSaving: boolean
  onSave: () => void
  /** Optional subtitle override per tab */
  subtitle?: string
}

const AVATAR_GRADIENTS = [
  'from-primary-main to-status-info',
  'from-accent-purple to-accent-pink',
  'from-accent-orange to-status-error',
  'from-status-info to-accent-purple',
  'from-status-success to-primary-main',
  'from-accent-gold to-accent-orange',
]

function getAvatarGradient(name: string): string {
  const index = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export function ProgramBuilderHeader({
  traineeId,
  trainees,
  stats,
  isSaving,
  onSave,
  subtitle,
}: ProgramBuilderHeaderProps) {
  const rel = trainees.find((t) => t.traineeId === traineeId)
  const traineeName = rel?.traineeName || ''
  const firstLetter = traineeName.charAt(0) || '?'

  if (!traineeId || !traineeName) return null

  return (
    <div className="bg-gradient-to-br from-primary-main/10 to-status-info/10 border border-primary-main/20 p-4 border-b border-dark-border">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(traineeName)} flex items-center justify-center text-xl font-bold text-white flex-shrink-0`}
        >
          {firstLetter}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary truncate">{traineeName}</span>
            <span className="px-1.5 py-0.5 bg-status-success/20 text-status-success text-xs rounded flex-shrink-0">
              פעיל
            </span>
          </div>
          <div className="text-xs text-text-muted">
            {subtitle || (
              stats ? (
                <span className="flex items-center gap-2">
                  <span>🔥 {stats.currentStreak} ימים</span>
                  <span>•</span>
                  <span>{stats.thisWeekWorkouts}/3 השבוע</span>
                </span>
              ) : null
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 bg-gradient-to-br from-primary-main to-status-info rounded-xl text-sm font-bold text-white shadow-glow-cyan disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">שמור</span>
          <span className="sm:hidden">💾</span>
        </button>
      </div>
    </div>
  )
}
