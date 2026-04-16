import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { useRealUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { TRAINING_GOAL_LABELS } from '@/domains/trainer/types'
import type { TrainingGoal } from '@/domains/trainer/types'

const GOAL_OPTIONS: TrainingGoal[] = [
  'muscle_gain',
  'weight_loss',
  'strength',
  'endurance',
  'flexibility',
  'general_fitness',
  'rehabilitation',
  'sport_specific',
]

const ROLE_LABELS: Record<string, string> = {
  user: 'מתאמן',
  trainer: 'מאמן',
  admin: 'מנהל',
}

interface FormState {
  firstName: string
  lastName: string
  city: string
  age: string
  height: string
  weight: string
  bodyFatPercentage: string
  trainingGoals: TrainingGoal[]
  injuriesOrLimitations: string
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useRealUser()
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    city: user?.city || '',
    age: user?.age?.toString() || '',
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    bodyFatPercentage: user?.bodyFatPercentage?.toString() || '',
    trainingGoals: (user?.trainingGoals as TrainingGoal[]) || [],
    injuriesOrLimitations: user?.injuriesOrLimitations || '',
  })

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleGoal = (goal: TrainingGoal) => {
    setForm((prev) => ({
      ...prev,
      trainingGoals: prev.trainingGoals.includes(goal)
        ? prev.trainingGoals.filter((g) => g !== goal)
        : [...prev.trainingGoals, goal],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('נא למלא שם פרטי ושם משפחה')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
        city: form.city.trim() || undefined,
        age: form.age ? Number(form.age) : undefined,
        height: form.height ? Number(form.height) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        bodyFatPercentage: form.bodyFatPercentage ? Number(form.bodyFatPercentage) : undefined,
        trainingGoals: form.trainingGoals,
        injuriesOrLimitations: form.injuriesOrLimitations.trim() || undefined,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'שגיאה בשמירת הפרופיל')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8 text-on-surface-variant">
        טוען פרופיל...
      </div>
    )
  }

  const inputClass =
    'w-full px-4 py-3 rounded-lg bg-dark-surface border border-white/10 text-text-primary placeholder:text-on-surface-variant focus:outline-none focus:border-primary-main transition'
  const labelClass = 'block text-sm font-medium text-on-surface-variant mb-1.5'

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-main/20 flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-primary-main" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">פרופיל אישי</h1>
          <p className="text-sm text-on-surface-variant">ערוך את הפרטים האישיים שלך</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only */}
        <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-on-surface-variant">פרטי חשבון</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={labelClass}>אימייל</span>
              <div className="px-4 py-3 rounded-lg bg-dark-surface/50 text-text-primary border border-white/5">
                {user.email || '—'}
              </div>
            </div>
            <div>
              <span className={labelClass}>טלפון</span>
              <div className="px-4 py-3 rounded-lg bg-dark-surface/50 text-text-primary border border-white/5">
                {user.phoneNumber || '—'}
              </div>
            </div>
            <div>
              <span className={labelClass}>תפקיד</span>
              <div className="px-4 py-3 rounded-lg bg-dark-surface/50 text-text-primary border border-white/5">
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          </div>
        </div>

        {/* Editable - basic */}
        <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-on-surface-variant">פרטים אישיים</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={labelClass}>שם פרטי *</label>
              <input
                id="firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>שם משפחה *</label>
              <input
                id="lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="city" className={labelClass}>עיר</label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Body metrics */}
        <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-on-surface-variant">נתוני גוף</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="age" className={labelClass}>גיל</label>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                value={form.age}
                onChange={(e) => update('age', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="height" className={labelClass}>גובה (ס"מ)</label>
              <input
                id="height"
                type="number"
                inputMode="numeric"
                value={form.height}
                onChange={(e) => update('height', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="weight" className={labelClass}>משקל (ק"ג)</label>
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                value={form.weight}
                onChange={(e) => update('weight', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="bodyFat" className={labelClass}>% שומן</label>
              <input
                id="bodyFat"
                type="number"
                inputMode="decimal"
                value={form.bodyFatPercentage}
                onChange={(e) => update('bodyFatPercentage', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-on-surface-variant">מטרות אימון</h2>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const active = form.trainingGoals.includes(goal)
              return (
                <button
                  type="button"
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={
                    active
                      ? 'px-4 py-2 rounded-full text-sm bg-primary-main text-dark-bg font-semibold transition'
                      : 'px-4 py-2 rounded-full text-sm bg-dark-surface text-on-surface-variant border border-white/10 hover:border-primary-main/40 transition'
                  }
                >
                  {TRAINING_GOAL_LABELS[goal]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Injuries */}
        <div className="bg-dark-card/60 border border-white/10 rounded-2xl p-4 space-y-3">
          <label htmlFor="injuries" className={labelClass}>פציעות או מגבלות</label>
          <textarea
            id="injuries"
            value={form.injuriesOrLimitations}
            onChange={(e) => update('injuriesOrLimitations', e.target.value)}
            rows={3}
            className={inputClass + ' resize-none'}
            placeholder="כאבי גב, בעיות ברך וכו'"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-status-error/15 border border-status-error/30 text-status-error text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl bg-dark-surface text-text-primary border border-white/10 hover:border-white/20 transition disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] px-4 py-3 rounded-xl bg-primary-main text-dark-bg font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                שמור שינויים
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
