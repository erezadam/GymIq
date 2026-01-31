/**
 * ExerciseSetForm
 * Create/Edit form for exercise sets with image upload and exercise picker
 */

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import {
  createExerciseSet,
  updateExerciseSet,
  getExerciseSetById,
  getExerciseSets,
} from '@/lib/firebase/exerciseSets'
import { useAuthStore } from '@/domains/authentication/store'
import ExerciseSetExercisePicker from './ExerciseSetExercisePicker'
import type { ExerciseCategory, ExerciseDifficulty } from '@/domains/exercises/types/exercise.types'

interface ExerciseSetFormProps {
  setId?: string | null // null = create, string = edit
  onClose: () => void
  onSaved: () => void
}

const muscleGroupOptions: { value: ExerciseCategory; label: string }[] = [
  { value: 'chest', label: 'חזה' },
  { value: 'back', label: 'גב' },
  { value: 'legs', label: 'רגליים' },
  { value: 'shoulders', label: 'כתפיים' },
  { value: 'arms', label: 'זרועות' },
  { value: 'core', label: 'ליבה' },
  { value: 'cardio', label: 'אירובי' },
  { value: 'functional', label: 'פונקציונלי' },
  { value: 'stretching', label: 'מתיחות' },
]

const difficultyOptions: { value: ExerciseDifficulty; label: string }[] = [
  { value: 'beginner', label: 'מתחילים' },
  { value: 'intermediate', label: 'בינוני' },
  { value: 'advanced', label: 'מתקדמים' },
]

export default function ExerciseSetForm({
  setId,
  onClose,
  onSaved,
}: ExerciseSetFormProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(!!setId)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<ExerciseCategory>('chest')
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('beginner')
  const [description, setDescription] = useState('')
  const [exerciseImages, setExerciseImages] = useState<string[]>([])
  const [exerciseIds, setExerciseIds] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (setId) {
      loadSet(setId)
    }
  }, [setId])

  const loadSet = async (id: string) => {
    setLoading(true)
    try {
      const data = await getExerciseSetById(id)
      if (data) {
        setName(data.name)
        setNameEn(data.nameEn || '')
        setMuscleGroup(data.muscleGroup)
        setDifficulty(data.difficulty)
        setDescription(data.description || '')
        setExerciseImages(data.exerciseImages || [])
        setExerciseIds(data.exerciseIds)
        setIsActive(data.isActive)
      }
    } catch (error) {
      console.error('Error loading set:', error)
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'שם חובה (מינימום 2 תווים)'
    }
    if (!muscleGroup) {
      newErrors.muscleGroup = 'יש לבחור קבוצת שריר'
    }
    if (exerciseIds.length !== 4) {
      newErrors.exerciseIds = 'יש לבחור בדיוק 4 תרגילים'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        muscleGroup,
        exerciseIds,
        exerciseImages,
        description: description.trim() || undefined,
        difficulty,
        isActive,
        order: 0, // will be set below
      }

      if (setId) {
        // Update
        await updateExerciseSet(setId, data)
      } else {
        // Create - set order to last
        const existingSets = await getExerciseSets()
        data.order = existingSets.length + 1
        await createExerciseSet(data, user?.uid || '')
      }

      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving set:', error)
      setErrors({ submit: 'שגיאה בשמירת הסט' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6" dir="rtl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {setId ? 'עריכת סט' : 'יצירת סט חדש'}
          </h3>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            שם הסט *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="כתפיים בסיסי"
            className="input-primary w-full"
            maxLength={50}
          />
          {errors.name && (
            <p className="text-sm text-red-400 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Name English (optional) */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            שם באנגלית (אופציונלי)
          </label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Basic Shoulders"
            className="input-primary w-full"
            dir="ltr"
            maxLength={50}
          />
        </div>

        {/* Muscle Group + Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              קבוצת שריר *
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as ExerciseCategory)}
              className="input-primary w-full"
            >
              {muscleGroupOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.muscleGroup && (
              <p className="text-sm text-red-400 mt-1">{errors.muscleGroup}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              רמת קושי *
            </label>
            <div className="flex gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                    difficulty === opt.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-elevated text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            תיאור (אופציונלי)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="סט מאוזן לפיתוח כתפיים עגולות"
            className="input-primary w-full h-20 resize-none"
            maxLength={200}
          />
        </div>

        {/* 2x2 Image Grid Preview */}
        {exerciseImages.length === 4 && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              תמונת הסט (אוטומטית מהתרגילים)
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden w-48">
              {exerciseImages.map((url, i) => (
                <div key={i} className="aspect-square bg-background-elevated rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt={`תרגיל ${i + 1}`}
                    className="w-full h-full object-contain object-center"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        '/images/exercise-placeholder.svg'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Picker */}
        <div>
          <ExerciseSetExercisePicker
            selectedIds={exerciseIds}
            onChange={setExerciseIds}
            onExerciseImagesResolved={setExerciseImages}
            muscleGroup={muscleGroup}
          />
          {errors.exerciseIds && (
            <p className="text-sm text-red-400 mt-1">{errors.exerciseIds}</p>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isActive ? 'bg-primary-500' : 'bg-dark-elevated'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                isActive ? 'right-0.5' : 'right-5'
              }`}
            />
          </button>
          <span className="text-sm text-text-secondary">
            {isActive ? 'פעיל - מוצג למשתמשים' : 'לא פעיל - מוסתר'}
          </span>
        </div>

        {/* Submit error */}
        {errors.submit && (
          <p className="text-sm text-red-400">{errors.submit}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {setId ? 'שמור שינויים' : 'צור סט'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}
