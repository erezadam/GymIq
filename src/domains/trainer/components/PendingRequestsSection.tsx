import { useEffect, useState } from 'react'
import { Inbox, Check, X } from 'lucide-react'
import { trainerService } from '../services/trainerService'
import type { TrainerRelationship } from '../types'

interface PendingRequestsSectionProps {
  trainerId: string
  // Called after a request is approved so the parent can refresh its trainee
  // list (the newly-approved trainee should now appear there).
  onApproved?: () => void
}

function formatRequestedAt(d?: Date | { toDate?: () => Date }): string {
  if (!d) return ''
  const date = typeof d === 'object' && 'toDate' in d && d.toDate ? d.toDate() : (d as Date)
  if (!(date instanceof Date) || isNaN(date.getTime())) return ''
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function PendingRequestsSection({ trainerId, onApproved }: PendingRequestsSectionProps) {
  const [requests, setRequests] = useState<TrainerRelationship[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!trainerId) return
    let cancelled = false
    setIsLoading(true)
    trainerService
      .getPendingRequestsForTrainer(trainerId)
      .then(list => {
        if (!cancelled) setRequests(list)
      })
      .catch(err => {
        console.error('Failed to load pending requests:', err)
        if (!cancelled) setErrorMsg('שגיאה בטעינת בקשות ממתינות')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [trainerId])

  const handleApprove = async (relationshipId: string) => {
    setActionInProgress(relationshipId)
    setErrorMsg(null)
    try {
      await trainerService.approveTrainerRequest(relationshipId)
      setRequests(prev => prev.filter(r => r.id !== relationshipId))
      onApproved?.()
    } catch (err) {
      console.error('Approve failed:', err)
      const msg = (err as { message?: string })?.message || 'שגיאה באישור הבקשה'
      setErrorMsg(msg)
    } finally {
      setActionInProgress(null)
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectingId) return
    const id = rejectingId
    setActionInProgress(id)
    setErrorMsg(null)
    try {
      await trainerService.rejectTrainerRequest(id, rejectReason.trim() || undefined)
      setRequests(prev => prev.filter(r => r.id !== id))
      setRejectingId(null)
      setRejectReason('')
    } catch (err) {
      console.error('Reject failed:', err)
      setErrorMsg((err as { message?: string })?.message || 'שגיאה בדחיית הבקשה')
    } finally {
      setActionInProgress(null)
    }
  }

  // Hide the section entirely while loading or when there are no pending
  // requests — do not flash an empty card.
  if (isLoading) return null
  if (requests.length === 0 && !errorMsg) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-warning/15 flex items-center justify-center">
          <Inbox className="w-4 h-4 text-warning" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">בקשות ממתינות</h3>
          <div className="h-1 w-6 rounded-full bg-warning/40 mt-1" />
        </div>
        {requests.length > 0 && (
          <span className="ml-auto text-xs text-on-surface-variant">{requests.length} בקשות</span>
        )}
      </div>

      {errorMsg && (
        <div className="bg-error/10 border border-error/30 text-error rounded-xl p-3 text-sm" dir="rtl">
          {errorMsg}
        </div>
      )}

      <ul className="flex flex-col gap-2" dir="rtl">
        {requests.map(req => {
          const isBusy = actionInProgress === req.id
          const requestedAt = formatRequestedAt(req.requestedAt as Date | undefined)
          return (
            <li
              key={req.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-surface-container border border-on-surface/10"
            >
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-semibold text-base truncate">{req.traineeName}</p>
                {req.traineeEmail && (
                  <p className="text-on-surface-variant text-xs truncate">{req.traineeEmail}</p>
                )}
                {requestedAt && (
                  <p className="text-on-surface-variant text-xs mt-1">בקשה מ-{requestedAt}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleApprove(req.id)}
                  disabled={isBusy}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm min-h-[44px] disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isBusy ? 'מאשר...' : 'אישור'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(req.id)
                    setRejectReason('')
                  }}
                  disabled={isBusy}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-on-surface/20 text-on-surface font-medium text-sm min-h-[44px] disabled:opacity-60"
                >
                  <X className="w-4 h-4" />
                  <span>דחייה</span>
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Reject reason modal */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => actionInProgress !== rejectingId && setRejectingId(null)}
          dir="rtl"
        >
          <div
            className="relative w-full max-w-sm bg-surface-container rounded-2xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => actionInProgress !== rejectingId && setRejectingId(null)}
              aria-label="סגור"
              disabled={actionInProgress === rejectingId}
              className="absolute top-3 left-3 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/10 disabled:opacity-40"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-on-surface mb-3 pr-2">דחיית בקשה</h2>
            <p className="text-on-surface-variant text-sm mb-3">
              ניתן להוסיף סיבה (לא חובה). הסיבה תוצג למתאמן.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="סיבה (אופציונלי)"
              className="w-full min-h-[80px] p-3 rounded-lg bg-surface-container-low border border-on-surface/15 text-on-surface text-sm resize-none mb-4"
              maxLength={300}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionInProgress === rejectingId}
                className="flex-1 py-3 rounded-lg bg-error text-white font-semibold disabled:opacity-60 min-h-[44px]"
              >
                {actionInProgress === rejectingId ? 'דוחה...' : 'דחה בקשה'}
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                disabled={actionInProgress === rejectingId}
                className="flex-1 py-3 rounded-lg border border-on-surface/20 text-on-surface font-semibold disabled:opacity-60 min-h-[44px]"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
