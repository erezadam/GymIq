import type { PersonalRecord } from '@/lib/firebase/workoutHistory'
import type { StuckExercise } from '@/domains/trainer/hooks/useTraineeAnalytics'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'

interface PRCardProps {
  record: PersonalRecord | StuckExercise
  variant: 'recent' | 'stuck'
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'היום'
  if (diffDays === 1) return 'אתמול'
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`
  return `${date.getDate()}/${date.getMonth() + 1}`
}

export function PRCard({ record, variant }: PRCardProps) {
  const isStuck = variant === 'stuck'
  const stuckRecord = isStuck ? (record as StuckExercise) : null

  const borderClass = isStuck
    ? 'border-status-error/40 bg-gradient-to-l from-status-error/10 to-transparent'
    : 'border-status-success/40 bg-gradient-to-l from-status-success/10 to-transparent'

  const iconBg = isStuck ? 'bg-status-error/20' : 'bg-status-success/20'
  const weightColor = isStuck ? 'text-status-error' : 'text-status-success'

  // Show improvement delta for recent PRs
  const delta = !isStuck && record.previousWeight !== undefined
    ? record.isBodyweight
      ? record.previousReps !== undefined ? `+${record.bestReps - record.previousReps} חזרות` : ''
      : `+${record.bestWeight - record.previousWeight} ק"ג`
    : ''

  return (
    <div className={`flex items-center gap-3 p-3.5 bg-dark-card/80 border rounded-xl ${borderClass}`}>
      <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
        {/* #19 */}
        <ExerciseMedia
          imageUrl={record.imageUrl}
          videoWebpUrl={record.videoWebpUrl}
          alt=""
          className="w-full h-full rounded-xl object-cover"
          variant="thumbnail"
          placeholder={'🏋️'}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">
          {record.exerciseNameHe || record.exerciseName}
        </div>
        <div className="text-[11px] text-on-surface-variant mt-0.5">
          {isStuck && stuckRecord
            ? `ללא שיפור ${stuckRecord.weeksSinceImprovement} שבועות`
            : formatRelativeDate(record.bestDate)}
        </div>
      </div>

      <div className="text-left flex-shrink-0">
        <div className={`text-lg font-bold ${weightColor}`}>
          {record.isBodyweight
            ? `${record.bestReps} חזרות`
            : `${record.bestWeight} ק"ג`}
        </div>
        {delta && (
          <div className="text-[11px] text-on-surface-variant">{delta}</div>
        )}
        {isStuck && (
          <div className="text-[11px] text-on-surface-variant">
            מאז {record.bestDate.getDate()}/{record.bestDate.getMonth() + 1}
          </div>
        )}
      </div>
    </div>
  )
}
