import { useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { trainerService } from '../services/trainerService'
import type { TraineeWithStats, TrainingGoal } from '../types'
import { TRAINING_GOAL_LABELS } from '../types'

interface TraineeEditModalProps {
  trainee: TraineeWithStats
  onClose: () => void
  onSave: () => void
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

interface FormData {
  firstName: string
  lastName: string
  phoneNumber: string
  trainingGoals: TrainingGoal[]
  injuriesOrLimitations: string
  notes: string
  age: string
  height: string
  weight: string
  bodyFatPercentage: string
}

export function TraineeEditModal({ trainee, onClose, onSave }: TraineeEditModalProps) {
  const profile = trainee.traineeProfile
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phoneNumber: profile?.phoneNumber || '',
    trainingGoals: (profile?.trainingGoals as TrainingGoal[]) || [],
    injuriesOrLimitations: profile?.injuriesOrLimitations || '',
    notes: trainee.relationship.notes || '',
    age: profile?.age?.toString() || '',
    height: profile?.height?.toString() || '',
    weight: profile?.weight?.toString() || '',
    bodyFatPercentage: profile?.bodyFatPercentage?.toString() || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.uid) return

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('נא למלא שם פרטי ושם משפחה')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Update user profile fields
      await trainerService.updateTraineeProfile(profile.uid, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        trainingGoals: formData.trainingGoals,
        injuriesOrLimitations: formData.injuriesOrLimitations.trim() || undefined,
        age: formData.age ? Number(formData.age) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        bodyFatPercentage: formData.bodyFatPercentage ? Number(formData.bodyFatPercentage) : undefined,
      })

      // Update relationship notes separately
      if (formData.notes !== (trainee.relationship.notes || '')) {
        await trainerService.updateRelationshipNotes(
          trainee.relationship.id,
          formData.notes.trim()
        )
      }

      onSave()
    } catch (err: any) {
      console.error('Error updating trainee:', err)
      setError(err.message || 'שגיאה בעדכון פרטי מתאמן')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleGoal = (goal: TrainingGoal) => {
    setFormData((prev) => ({
      ...prev,
      trainingGoals: prev.trainingGoals.includes(goal)
        ? prev.trainingGoals.filter((g) => g !== goal)
        : [...prev.trainingGoals, goal],
    }))
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
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
            עריכת פרטי מתאמן
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
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              טלפון
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => updateField('phoneNumber', e.target.value)}
              className="input-primary"
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>

          {/* Body Metrics */}
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
                  value={formData.age}
                  onChange={(e) => updateField('age', e.target.value)}
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
                  value={formData.height}
                  onChange={(e) => updateField('height', e.target.value)}
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
                  value={formData.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
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
                  value={formData.bodyFatPercentage}
                  onChange={(e) => updateField('bodyFatPercentage', e.target.value)}
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
                    formData.trainingGoals.includes(goal)
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
              value={formData.injuriesOrLimitations}
              onChange={(e) => updateField('injuriesOrLimitations', e.target.value)}
              className="input-primary min-h-[80px] resize-none"
              placeholder="פרט מגבלות פיזיות או פציעות..."
              rows={3}
            />
          </div>

          {/* Notes */}
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
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>שומר...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>שמור שינויים</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
