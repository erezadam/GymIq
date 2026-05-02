import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRealUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { trainerService, TrainerRelationshipError } from '@/domains/trainer/services/trainerService'

type TrainerOption = { uid: string; displayName: string }

export default function TrainerSelectionScreen() {
  const navigate = useNavigate()
  const realUser = useRealUser()
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingTrainer, setPendingTrainer] = useState<TrainerOption | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestSentToName, setRequestSentToName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const list = await trainerService.getAvailableTrainers()
        if (!cancelled) setTrainers(list)
      } catch (err) {
        console.error('Failed to load trainers:', err)
        if (!cancelled) setErrorMsg('שגיאה בטעינת רשימת המאמנים. נסה שוב.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleConfirm = async () => {
    if (!pendingTrainer || !realUser) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await trainerService.requestTrainer(
        {
          uid: realUser.uid,
          email: realUser.email,
          firstName: realUser.firstName,
          lastName: realUser.lastName,
          displayName: realUser.displayName,
        },
        pendingTrainer.uid,
        pendingTrainer.displayName
      )
      sessionStorage.removeItem('dismissedTrainerPrompt')
      setRequestSentToName(pendingTrainer.displayName)
      setPendingTrainer(null)
    } catch (err) {
      console.error('Failed to send trainer request:', err)
      const message =
        err instanceof TrainerRelationshipError
          ? err.message
          : 'שגיאה בשליחת הבקשה. נסה שוב.'
      setErrorMsg(message)
      setPendingTrainer(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state — request sent, awaiting trainer's decision.
  if (requestSentToName) {
    return (
      <div className="flex flex-col min-h-full px-4 py-6" dir="rtl">
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4 text-primary text-3xl">✓</div>
          <h1 className="text-2xl font-bold text-on-surface mb-3">הבקשה נשלחה</h1>
          <p className="text-on-surface-variant mb-2">
            המאמן <span className="text-on-surface font-semibold">{requestSentToName}</span> קיבל את בקשתך.
          </p>
          <p className="text-on-surface-variant mb-8">תקבל הודעה ברגע שהבקשה תאושר או תידחה.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold min-h-[44px]"
          >
            חזרה לדשבורד
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full px-4 py-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-on-surface">בחר את המאמן שלך</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="סגור"
          className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          ✕
        </button>
      </div>

      <p className="text-on-surface-variant mb-6">
        שלח בקשה למאמן. הוא יקבל הודעה ויאשר או ידחה אותה.
      </p>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">
          טוען מאמנים...
        </div>
      ) : trainers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-center">
          אין מאמנים זמינים כרגע.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {trainers.map(trainer => (
            <li
              key={trainer.uid}
              className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container border border-on-surface/10"
            >
              <span className="text-on-surface font-medium text-base flex-1 truncate">
                {trainer.displayName}
              </span>
              <button
                type="button"
                onClick={() => setPendingTrainer(trainer)}
                className="shrink-0 px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity min-h-[44px]"
              >
                שלח בקשה
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingTrainer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !isSubmitting && setPendingTrainer(null)}
          dir="rtl"
        >
          <div
            className="relative w-full max-w-sm bg-surface-container rounded-2xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !isSubmitting && setPendingTrainer(null)}
              aria-label="סגור"
              disabled={isSubmitting}
              className="absolute top-3 left-3 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface/10 disabled:opacity-40"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-on-surface mb-2 pr-2">אישור שליחת בקשה</h2>
            <p className="text-on-surface-variant mb-6">
              לשלוח בקשה ל־<span className="text-on-surface font-semibold">{pendingTrainer.displayName}</span>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-60 min-h-[44px]"
              >
                {isSubmitting ? 'שולח...' : 'שלח בקשה'}
              </button>
              <button
                type="button"
                onClick={() => setPendingTrainer(null)}
                disabled={isSubmitting}
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
