import { useState, useEffect, useCallback, useRef } from 'react'
import { X, UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { traineeAccountService } from '../services/traineeAccountService'
import { trainerService } from '../services/trainerService'
import type { CreateTraineeData, TrainingGoal } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'
import type { AppUser } from '@/lib/firebase/auth'

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

type EmailCheckStatus =
  | 'idle'           // No check yet
  | 'checking'       // Currently checking
  | 'new_user'       // Email not found - new user
  | 'available'      // Existing user without trainer - can link
  | 'has_trainer'    // Existing user with different trainer
  | 'already_yours'  // Already this trainer's trainee

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

  // Email check state
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>('idle')
  const [existingUser, setExistingUser] = useState<AppUser | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Check email when it changes (debounced)
  const checkEmail = useCallback(async (email: string) => {
    if (!user) return

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailCheckStatus('idle')
      setExistingUser(null)
      return
    }

    setEmailCheckStatus('checking')
    setError(null)

    try {
      const foundUser = await trainerService.findUserByEmail(trimmedEmail)

      if (!foundUser) {
        // Scenario 1: Email doesn't exist - new user
        setEmailCheckStatus('new_user')
        setExistingUser(null)
        return
      }

      // Email exists - check trainer relationships
      setExistingUser(foundUser)

      // Check if already this trainer's trainee
      const isAlreadyTrainee = await trainerService.checkTrainerRelationship(
        user.uid,
        foundUser.uid
      )

      if (isAlreadyTrainee) {
        // Scenario 4: Already this trainer's trainee
        setEmailCheckStatus('already_yours')
        return
      }

      // Check if has different trainer
      if (foundUser.trainerId && foundUser.trainerId !== user.uid) {
        // Scenario 3: Has different trainer
        setEmailCheckStatus('has_trainer')
        return
      }

      // Scenario 2: Exists without trainer - can link
      setEmailCheckStatus('available')

      // Auto-fill form with existing data (readonly)
      setFormData(prev => ({
        ...prev,
        firstName: foundUser.firstName || prev.firstName,
        lastName: foundUser.lastName || prev.lastName,
        phone: foundUser.phoneNumber || prev.phone,
        age: foundUser.age,
        height: foundUser.height,
        weight: foundUser.weight,
        bodyFatPercentage: foundUser.bodyFatPercentage,
        trainingGoals: (foundUser.trainingGoals as TrainingGoal[]) || prev.trainingGoals,
        injuries: foundUser.injuriesOrLimitations || prev.injuries,
      }))
    } catch (err) {
      console.error('Error checking email:', err)
      setEmailCheckStatus('idle')
      setExistingUser(null)
    }
  }, [user])

  // Debounced email check
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      checkEmail(formData.email)
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [formData.email, checkEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Block submission for invalid statuses
    if (emailCheckStatus === 'has_trainer' || emailCheckStatus === 'already_yours') {
      return
    }

    // Validation for new users
    if (emailCheckStatus !== 'available') {
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
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const trainerName = `${user.firstName} ${user.lastName}`

      if (emailCheckStatus === 'available' && existingUser) {
        // Link existing user
        await traineeAccountService.linkExistingUser(
          existingUser,
          user.uid,
          trainerName,
          {
            trainingGoals: formData.trainingGoals,
            injuries: formData.injuries,
            notes: formData.notes,
            age: formData.age,
            height: formData.height,
            weight: formData.weight,
            bodyFatPercentage: formData.bodyFatPercentage,
          }
        )
      } else {
        // Create new trainee
        await traineeAccountService.createTraineeAccount(
          formData,
          user.uid,
          trainerName
        )
      }
      onSuccess()
    } catch (err: any) {
      console.error('Error creating/linking trainee:', err)
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

  // Determine if form fields should be readonly (existing user)
  const isExistingUser = emailCheckStatus === 'available'
  const canSubmit =
    emailCheckStatus !== 'has_trainer' &&
    emailCheckStatus !== 'already_yours' &&
    emailCheckStatus !== 'checking' &&
    emailCheckStatus !== 'idle'

  // Get status message
  const getStatusMessage = () => {
    switch (emailCheckStatus) {
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>בודק...</span>
          </div>
        )
      case 'available':
        return (
          <div className="flex items-center gap-2 text-status-success text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>{existingUser?.displayName || existingUser?.firstName} קיים במערכת - ניתן להוסיף</span>
          </div>
        )
      case 'has_trainer':
        return (
          <div className="flex items-center gap-2 text-status-error text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>משתמש זה כבר משויך למאמן אחר</span>
          </div>
        )
      case 'already_yours':
        return (
          <div className="flex items-center gap-2 text-status-error text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>משתמש זה כבר ברשימת המתאמנים שלך</span>
          </div>
        )
      default:
        return null
    }
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
            {isExistingUser ? 'הוספת מתאמן קיים' : 'רישום מתאמן חדש'}
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

          {/* Email - First field for checking */}
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
            <div className="mt-1.5">
              {getStatusMessage()}
            </div>
          </div>

          {/* Existing user info banner */}
          {isExistingUser && existingUser && (
            <div className="bg-status-success/10 border border-status-success/30 rounded-xl p-4">
              <p className="text-status-success text-sm font-medium mb-1">
                משתמש קיים במערכת
              </p>
              <p className="text-text-secondary text-sm">
                {existingUser.displayName || `${existingUser.firstName} ${existingUser.lastName}`} ({existingUser.email})
              </p>
              <p className="text-text-muted text-xs mt-2">
                ניתן לערוך: מדדים גופניים, מטרות אימון, פציעות והערות מאמן.
              </p>
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                שם פרטי {!isExistingUser && '*'}
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className={`input-primary ${isExistingUser ? 'bg-dark-card/50 text-text-muted' : ''}`}
                placeholder="ישראל"
                required={!isExistingUser}
                disabled={isExistingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                שם משפחה {!isExistingUser && '*'}
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className={`input-primary ${isExistingUser ? 'bg-dark-card/50 text-text-muted' : ''}`}
                placeholder="ישראלי"
                required={!isExistingUser}
                disabled={isExistingUser}
              />
            </div>
          </div>

          {/* Password - only for new users */}
          {!isExistingUser && (
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
          )}

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              טלפון
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className={`input-primary ${isExistingUser ? 'bg-dark-card/50 text-text-muted' : ''}`}
              placeholder="050-1234567"
              dir="ltr"
              disabled={isExistingUser}
            />
          </div>

          {/* Body Metrics - always editable */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              מדדים גופניים
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  גיל
                </label>
                <input
                  type="number"
                  value={formData.age ?? ''}
                  onChange={(e) => updateField('age', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                  placeholder="25"
                  dir="ltr"
                  min="10"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  גובה (ס&quot;מ)
                </label>
                <input
                  type="number"
                  value={formData.height ?? ''}
                  onChange={(e) => updateField('height', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                  placeholder="175"
                  dir="ltr"
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  משקל (ק&quot;ג)
                </label>
                <input
                  type="number"
                  value={formData.weight ?? ''}
                  onChange={(e) => updateField('weight', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                  placeholder="75"
                  dir="ltr"
                  min="20"
                  max="300"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  אחוז שומן (%)
                </label>
                <input
                  type="number"
                  value={formData.bodyFatPercentage ?? ''}
                  onChange={(e) => updateField('bodyFatPercentage', e.target.value ? Number(e.target.value) : undefined)}
                  className="input-primary"
                  placeholder="15"
                  dir="ltr"
                  min="3"
                  max="60"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Training Goals - always editable */}
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

          {/* Injuries - always editable */}
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

          {/* Notes - always editable */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              הערות מאמן
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
            disabled={isSubmitting || !canSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{isExistingUser ? 'מוסיף...' : 'יוצר חשבון...'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>{isExistingUser ? 'הוסף לרשימת המתאמנים שלי' : 'צור מתאמן'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
