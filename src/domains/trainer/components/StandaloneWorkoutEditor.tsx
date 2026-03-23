import { useState } from 'react'
import { ArrowRight, Save, Loader2, Plus } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { programService } from '../services/programService'
import type { ProgramDay } from '../types'

interface StandaloneWorkoutEditorProps {
  traineeId: string
  traineeName: string
  onClose: () => void
  onSaved: () => void
}

export function StandaloneWorkoutEditor({
  traineeId,
  traineeName,
  onClose,
  onSaved,
}: StandaloneWorkoutEditorProps) {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [continueCreating, setContinueCreating] = useState(false)

  // Initialize with empty day
  const [day, setDay] = useState<ProgramDay>({
    dayLabel: 'אימון',
    name: '',
    exercises: [],
    restDay: false,
  })

  const handleSave = async () => {
    if (!user) return

    // Validation
    if (!day.name.trim()) {
      setError('נא להזין שם לאימון')
      return
    }
    if (day.exercises.length === 0) {
      setError('נא להוסיף לפחות תרגיל אחד')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Clean exercises - remove undefined values (Firestore doesn't accept them)
      const cleanExercises = day.exercises.map(ex => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clean: any = {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          order: ex.order,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restTime: ex.restTime,
        }
        // Only add optional fields if they have values
        if (ex.imageUrl) clean.imageUrl = ex.imageUrl
        if (ex.category) clean.category = ex.category
        if (ex.primaryMuscle) clean.primaryMuscle = ex.primaryMuscle
        if (ex.equipment) clean.equipment = ex.equipment
        if (ex.targetWeight) clean.targetWeight = ex.targetWeight
        if (ex.notes) clean.notes = ex.notes
        if (ex.supersetGroup) clean.supersetGroup = ex.supersetGroup
        if (ex.reportType) clean.reportType = ex.reportType
        if (ex.assistanceTypes && ex.assistanceTypes.length > 0) clean.assistanceTypes = ex.assistanceTypes
        return clean
      })

      // Clean day - build object without undefined values
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanDay: any = {
        dayLabel: day.name,
        name: day.name,
        exercises: cleanExercises,
        restDay: false,
      }
      if (day.notes) cleanDay.notes = day.notes
      if (day.estimatedDuration) cleanDay.estimatedDuration = day.estimatedDuration

      // Create a program with single day + type: 'standalone'
      await programService.createProgram({
        trainerId: user.uid,
        traineeId,
        originalTrainerId: user.uid,
        name: day.name,
        type: 'standalone',
        status: 'active',
        isModifiedByTrainee: false,
        weeklyStructure: [cleanDay],
        startDate: new Date(),
        currentWeek: 1,
      })

      if (continueCreating) {
        // Reset for another workout
        setDay({
          dayLabel: 'אימון',
          name: '',
          exercises: [],
          restDay: false,
        })
        setContinueCreating(false)
        onSaved() // Refresh parent data
      } else {
        onSaved()
        onClose()
      }
    } catch (err: any) {
      console.error('Error saving standalone workout:', err)
      setError(err.message || 'שגיאה בשמירת האימון')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndContinue = () => {
    setContinueCreating(true)
    handleSave()
  }

  // Custom back handler for ProgramDayEditor
  const handleBack = () => {
    if (day.exercises.length > 0) {
      if (!window.confirm('יש תרגילים שלא נשמרו. לצאת בכל זאת?')) {
        return
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
      <div className="min-h-full pb-32">
        {/* Header */}
        <div className="sticky top-0 bg-dark-bg/95 backdrop-blur-lg border-b border-dark-border z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-on-surface-variant hover:text-text-primary transition"
              >
                <ArrowRight className="w-5 h-5" />
                <span>ביטול</span>
              </button>
              <div className="text-center">
                <h1 className="text-lg font-bold text-text-primary">אימון בודד חדש</h1>
                <p className="text-sm text-on-surface-variant">עבור {traineeName}</p>
              </div>
              <div className="w-16" />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-2xl mx-auto px-4 mt-4">
            <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Day Editor - reusing existing component */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Workout name input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              שם האימון *
            </label>
            <input
              type="text"
              value={day.name}
              onChange={(e) => setDay({ ...day, name: e.target.value })}
              className="input-primary text-lg"
              placeholder="למשל: אימון רגליים, חזה + טרייספס..."
              autoFocus
            />
          </div>

          {/* Exercise editor - inline version of ProgramDayEditor functionality */}
          <StandaloneExerciseList
            day={day}
            onUpdate={setDay}
            traineeId={traineeId}
          />
        </div>

        {/* Fixed bottom actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-dark-surface/95 backdrop-blur-lg border-t border-dark-border p-4 z-20">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={handleSaveAndContinue}
              disabled={isSaving || day.exercises.length === 0}
              className="flex-1 py-3 bg-dark-card border border-primary-main/30 rounded-xl text-primary-main font-medium flex items-center justify-center gap-2 hover:bg-primary-main/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span>שמור וצור עוד</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || day.exercises.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-primary-main to-status-info rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>שמור וסיים</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simplified exercise list for standalone workouts
import { ProgramExerciseEditor } from './ProgramBuilder/ProgramExerciseEditor'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import type { ProgramExercise } from '../types'
import type { Exercise } from '@/domains/exercises/types'

interface StandaloneExerciseListProps {
  day: ProgramDay
  onUpdate: (day: ProgramDay) => void
  traineeId: string
}

function StandaloneExerciseList({ day, onUpdate, traineeId }: StandaloneExerciseListProps) {
  const [showPicker, setShowPicker] = useState(false)

  const handleExerciseToggle = (exercise: Exercise, isAdding: boolean) => {
    if (isAdding) {
      const alreadyExists = day.exercises.some(e => e.exerciseId === exercise.id)
      if (alreadyExists) return

      const newExercise: ProgramExercise = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        order: day.exercises.length + 1,
        targetSets: 3,
        targetReps: '8-12',
        restTime: 90,
        reportType: exercise.reportType,
        assistanceTypes: exercise.assistanceTypes,
      }
      onUpdate({
        ...day,
        exercises: [...day.exercises, newExercise],
      })
    } else {
      const updated = day.exercises.filter(e => e.exerciseId !== exercise.id)
      updated.forEach((ex, i) => (ex.order = i + 1))
      onUpdate({ ...day, exercises: updated })
    }
  }

  const updateExercise = (index: number, updates: Partial<ProgramExercise>) => {
    const updated = [...day.exercises]
    updated[index] = { ...updated[index], ...updates }
    onUpdate({ ...day, exercises: updated })
  }

  const removeExercise = (index: number) => {
    const updated = day.exercises.filter((_, i) => i !== index)
    updated.forEach((ex, i) => (ex.order = i + 1))
    onUpdate({ ...day, exercises: updated })
  }

  // Full-screen ExerciseLibrary picker
  if (showPicker) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
        <ExerciseLibrary
          programMode
          programExerciseIds={day.exercises.map(e => e.exerciseId)}
          onProgramExerciseToggle={handleExerciseToggle}
          onProgramBack={() => setShowPicker(false)}
          targetUserId={traineeId}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Exercise count */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-primary rounded-full" />
          תרגילים ({day.exercises.length})
        </h3>
        {day.exercises.length > 0 && (
          <div className="text-sm text-on-surface-variant">
            ~{Math.round(day.exercises.reduce((sum, ex) => sum + ex.targetSets * (45 + ex.restTime), 0) / 60 + day.exercises.length * 2)} דקות
          </div>
        )}
      </div>

      {/* Exercise list */}
      {day.exercises.map((exercise, index) => (
        <ProgramExerciseEditor
          key={`${exercise.exerciseId}-${index}`}
          exercise={exercise}
          onUpdate={(updates) => updateExercise(index, updates)}
          onRemove={() => removeExercise(index)}
        />
      ))}

      {/* Add exercise button */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-full py-5 border-2 border-dashed border-dark-border rounded-2xl text-on-surface-variant hover:border-primary-main hover:text-primary-main transition flex items-center justify-center gap-3 text-lg"
      >
        <Plus className="w-5 h-5" />
        הוסף תרגיל
      </button>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
          📝 הערות לאימון:
        </div>
        <textarea
          value={day.notes || ''}
          onChange={(e) => onUpdate({ ...day, notes: e.target.value || undefined })}
          className="w-full bg-dark-surface/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-main placeholder-text-muted resize-none"
          placeholder="הערות למתאמן..."
          rows={2}
        />
      </div>
    </div>
  )
}
