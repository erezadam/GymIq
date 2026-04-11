import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'

const DISMISS_KEY = 'dismissedTrainerPrompt'

export default function SelectTrainerPrompt() {
  const user = useEffectiveUser()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<boolean>(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  if (!user || user.role !== 'user') return null
  if (user.trainerId) return null
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
