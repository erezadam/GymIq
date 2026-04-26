import { ArrowRight, Flame, UserCog } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { hebShortDate } from './dateUtils'
import { StatusBadge, SecondaryBadge } from './StatusBadge'
import type { UserDetailStats } from './analytics.types'

interface UserDetailHeaderProps {
  stats: UserDetailStats
  /** When set, shows a "View as trainer" toggle that navigates to the trainer screen. */
  switchToTrainerHref?: string
  /** When set, shows a "Trainer view" badge label. */
  modeLabel?: string
}

export function UserDetailHeader({ stats, switchToTrainerHref, modeLabel }: UserDetailHeaderProps) {
  const navigate = useNavigate()
  const initials =
    (stats.user.firstName?.[0] ?? '') + (stats.user.lastName?.[0] ?? '') || stats.user.email[0]
  const isActive = !!stats.lastActivityAt && Date.now() - stats.lastActivityAt.getTime() < 7 * 86_400_000

  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-base text-on-surface-variant hover:text-on-surface flex items-center gap-1 mb-3 min-h-[44px]"
      >
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
        חזרה
      </button>

      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-full bg-primary-main/15 text-primary-main flex items-center justify-center text-xl font-bold flex-shrink-0">
          {initials.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">
              {stats.user.displayName ||
                `${stats.user.firstName ?? ''} ${stats.user.lastName ?? ''}`.trim() ||
                stats.user.email}
            </h1>
            <StatusBadge active={isActive} />
            {modeLabel && <SecondaryBadge label={modeLabel} tone="info" />}
            {stats.isTrainerAlsoTrainee && !modeLabel && (
              <SecondaryBadge label="גם מתאמן" tone="accent" />
            )}
          </div>
          <p className="text-base text-on-surface-variant mt-1">{stats.user.email}</p>
          <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
            <span>הצטרף: {hebShortDate(stats.joinedAt)}</span>
            {stats.trainerName && <span>מאמן: {stats.trainerName}</span>}
            {stats.lastActivityAt && (
              <span>פעילות אחרונה: {hebShortDate(stats.lastActivityAt)}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" aria-hidden="true" />
              רצף: {stats.currentStreakDays} ימים
            </span>
          </div>
        </div>
        {switchToTrainerHref && (
          <button
            type="button"
            onClick={() => navigate(switchToTrainerHref)}
            className="inline-flex items-center gap-2 rounded-xl border border-dark-border bg-surface-container-low text-on-surface px-3 py-2 hover:bg-surface-container-high min-h-[44px]"
          >
            <UserCog className="w-4 h-4" aria-hidden="true" />
            צפייה כמאמן
          </button>
        )}
      </div>
    </div>
  )
}
