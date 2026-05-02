import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { trainerService } from '@/domains/trainer/services/trainerService'
import type { RelationshipStatus } from '@/domains/trainer/types'

const DISMISS_KEY = 'dismissedTrainerPrompt'

type LatestState = {
  relationshipId: string
  status: RelationshipStatus
  trainerName: string
  rejectionReason?: string
} | null

export default function SelectTrainerPrompt() {
  const user = useEffectiveUser()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<boolean>(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const [latestState, setLatestState] = useState<LatestState>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'user' || user.trainerId) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    trainerService
      .getMyLatestRelationshipState(user.uid)
      .then(state => {
        if (cancelled) return
        setLatestState(state)
      })
      .catch(err => {
        console.error('Failed to load relationship state:', err)
        // Fall back to default "select trainer" state on error.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.uid, user?.trainerId, user?.role])

  // Hide entirely while we don't yet know the state, to avoid flicker between
  // the default "select trainer" banner and a "pending"/"rejected" banner.
  if (isLoading) return null
  if (!user || user.role !== 'user') return null
  if (user.trainerId) return null

  // Treat cancelled as no state (per UX decision: trainee initiated the
  // cancellation themselves; no need to remind them).
  const effective: LatestState =
    latestState && latestState.status !== 'cancelled' ? latestState : null

  // Defensive: if a stale read returns active/paused before user.trainerId
  // syncs, do not surface the banner.
  if (effective && (effective.status === 'active' || effective.status === 'paused')) {
    return null
  }

  // ---- Pending state ----
  if (effective?.status === 'pending') {
    const handleCancel = async () => {
      setIsCancelling(true)
      try {
        await trainerService.cancelTrainerRequest(effective.relationshipId)
        setLatestState(null)
      } catch (err) {
        console.error('Failed to cancel trainer request:', err)
      } finally {
        setIsCancelling(false)
      }
    }
    return (
      <div
        className="mb-4 p-4 rounded-xl bg-status-warning/10 border border-status-warning/30 flex flex-col gap-3"
        dir="rtl"
      >
        <p className="text-on-surface text-sm leading-snug">
          <span className="font-semibold">בקשתך נשלחה למאמן {effective.trainerName}</span> וממתינה לאישור.
          תקבל הודעה ברגע שהיא תאושר או תידחה.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="px-4 py-2 rounded-lg border border-on-surface/20 text-on-surface-variant font-medium text-sm min-h-[44px] disabled:opacity-60"
          >
            {isCancelling ? 'מבטל...' : 'ביטול בקשה'}
          </button>
        </div>
      </div>
    )
  }

  // ---- Rejected state ----
  if (effective?.status === 'rejected') {
    return (
      <div
        className="mb-4 p-4 rounded-xl bg-status-error/10 border border-status-error/30 flex flex-col gap-3"
        dir="rtl"
      >
        <p className="text-on-surface text-sm leading-snug">
          <span className="font-semibold">המאמן {effective.trainerName} דחה את בקשתך.</span>
          {effective.rejectionReason ? (
            <span className="block mt-1 text-on-surface-variant">סיבה: {effective.rejectionReason}</span>
          ) : null}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/trainers')}
            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm min-h-[44px]"
          >
            בחר מאמן אחר
          </button>
        </div>
      </div>
    )
  }

  // ---- Ended state (recent, within 30-day fade window) ----
  if (effective?.status === 'ended') {
    return (
      <div
        className="mb-4 p-4 rounded-xl bg-surface-container border border-on-surface/10 flex flex-col gap-3"
        dir="rtl"
      >
        <p className="text-on-surface text-sm leading-snug">
          הקשר עם המאמן <span className="font-semibold">{effective.trainerName}</span> הסתיים.
          תוכל לבחור מאמן חדש בכל עת.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/trainers')}
            className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm min-h-[44px]"
          >
            בחר מאמן
          </button>
        </div>
      </div>
    )
  }

  // ---- Default: no active state, show the original "select trainer" prompt ----
  if (dismissed) return null

  const handleSkip = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/30 flex flex-col gap-3"
      dir="rtl"
    >
      <p className="text-on-surface text-sm leading-snug">
        עדיין לא בחרת מאמן. בחר מאמן מהרשימה כדי לקבל תוכניות אימון מותאמות אישית.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigate('/trainers')}
          className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm min-h-[44px]"
        >
          בחר מאמן
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 rounded-lg border border-on-surface/20 text-on-surface-variant font-medium text-sm min-h-[44px]"
        >
          דלג
        </button>
      </div>
    </div>
  )
}
