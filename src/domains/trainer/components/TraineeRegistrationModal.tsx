import { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { traineeAccountService } from '../services/traineeAccountService'
import type { CreateTraineeData, TrainingGoal } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'

interface TraineeRegistrationModalProps {
  onClose: () => void
  onSuccess: () => void
}

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

export function TraineeRegistrationModal({
  onClose,
  onSuccess,
}: TraineeRegistrationModalProps) {
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateTraineeData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    trainingGoals: [],
    injuries: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('נא למלא שם פרטי ושם משפחה')
      return
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('נא למלא כתובת אימייל תקינה')
      return
    }
    if (!formData.password || formData.password.length < 6) {
      setError('סיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const trainerName = `${user.firstName} ${user.lastName}`
      await traineeAccountService.createTraineeAccount(
        formData,
        user.uid,
        trainerName
      )
      onSuccess()
    } catch (err: any) {
      console.error('Error creating trainee:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('כתובת האימייל כבר רשומה במערכת')
      } else {
        setError(err.message || 'שגיאה ביצירת חשבון מתאמן')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleGoal = (goal: TrainingGoal) => {
    setFormData((prev) => ({
      ...prev,
      trainingGoals: prev.trainingGoals?.includes(goal)
        ? prev.trainingGoals.filter((g) => g !== goal)
        : [...(prev.trainingGoals || []), goal],
    }))
  }

  const updateField = <K extends keyof CreateTraineeData>(
    key: K,
    value: CreateTraineeData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-dark-surface rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border sticky top-0 bg-dark-surface z-10">
          <h2 className="text-xl font-bold text-text-primary">
            רישום מתאמן חדש
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                שם פרטי *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className="input-primary"
                placeholder="ישראל"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                שם משפחה *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className="input-primary"
                placeholder="ישראלי"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              אימייל *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="input-primary"
              placeholder="trainee@email.com"
              dir="ltr"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              סיסמה זמנית *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              className="input-primary"
              placeholder="לפחות 6 תווים"
              dir="ltr"
              minLength={6}
              required
            />
            <p className="text-xs text-text-muted mt-1">
              המתאמן יקבל אימייל לאיפוס סיסמה
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              טלפון
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="input-primary"
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>

          {/* Training Goals */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              מטרות אימון
            </label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    formData.trainingGoals?.includes(goal)
                      ? 'bg-status-info/20 text-status-info border border-status-info/30'
                      : 'bg-dark-card text-text-muted border border-dark-border hover:border-text-muted'
                  }`}
                >
                  {TRAINING_GOAL_LABELS[goal]}
                </button>
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              פציעות / מגבלות
            </label>
            <textarea
              value={formData.injuries}
              onChange={(e) => updateField('injuries', e.target.value)}
              className="input-primary min-h-[80px] resize-none"
              placeholder="פרט מגבלות פיזיות או פציעות..."
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              הערות
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="input-primary min-h-[60px] resize-none"
              placeholder="הערות נוספות..."
              rows={2}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>יוצר חשבון...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>צור מתאמן</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
