import { useState, useEffect } from 'react'
import { ArrowRight, Save, Loader2, Plus, Pencil } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { programService } from '../services/programService'
import type { ProgramExercise } from '../types'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import type { SelectedExercise } from '@/domains/workouts/store/workoutBuilderStore'

interface StandaloneWorkoutEditorProps {
  traineeId: string
  traineeName: string
  onClose: () => void
  onSaved: () => void
}

// Convert store exercises to ProgramExercise format
function toProgramExercises(exercises: SelectedExercise[]): ProgramExercise[] {
  return exercises.map((ex, index) => ({
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    exerciseNameHe: ex.exerciseNameHe,
    imageUrl: ex.imageUrl,
    category: ex.category,
    primaryMuscle: ex.primaryMuscle,
    equipment: ex.equipment,
    complexity: ex.complexity,
    order: index + 1,
    targetSets: ex.customSetCount || ex.sets.length || 3,
    targetReps: '8-12',
    restTime: ex.restTime || 90,
    reportType: ex.reportType,
    assistanceTypes: ex.assistanceTypes as string[] | undefined,
    sectionTitle: ex.sectionTitle,
  }))
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
  const [workoutName, setWorkoutName] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [notes, setNotes] = useState('')

  const { selectedExercises, clearWorkout, quickPlanSections } = useWorkoutBuilderStore()

  // Clear store when component mounts
  useEffect(() => {
    clearWorkout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!user) return

    if (!workoutName.trim()) {
      setError('נא להזין שם לאימון')
      return
    }
    if (selectedExercises.length === 0) {
      setError('נא להוסיף לפחות תרגיל אחד')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Quick Plan: order exercises by section, assign sectionTitle to the first
      // exercise of each section. This is the same logic ExerciseLibrary applies
      // in handleStartWorkout — it must also run here so the trainingProgram doc
      // persists section headers, otherwise loadFromProgram falls back to muscle
      // grouping when the workout is reported.
      let exercisesToSave: SelectedExercise[] = selectedExercises
      if (quickPlanSections.length > 0) {
        const sectionOrder = new Map(
          [...quickPlanSections].sort((a, b) => a.order - b.order).map((s, i) => [s.id, i])
        )
        const sectionTitleMap = new Map(quickPlanSections.map((s) => [s.id, s.title]))
        const sorted = [...selectedExercises].sort((a, b) => {
          const sa = sectionOrder.get(a.quickPlanSectionId || '') ?? 999
          const sb = sectionOrder.get(b.quickPlanSectionId || '') ?? 999
          if (sa !== sb) return sa - sb
          return (a.order ?? 0) - (b.order ?? 0)
        })
        const seenSections = new Set<string>()
        exercisesToSave = sorted.map((ex) => {
          const sid = ex.quickPlanSectionId
          if (sid && !seenSections.has(sid)) {
            seenSections.add(sid)
            return { ...ex, sectionTitle: sectionTitleMap.get(sid) || '' }
          }
          return { ...ex, sectionTitle: undefined }
        })
      }

      const programExercises = toProgramExercises(exercisesToSave)

      // Clean exercises - remove undefined values (Firestore doesn't accept them)
      const cleanExercises = programExercises.map(ex => {
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
        if (ex.imageUrl) clean.imageUrl = ex.imageUrl
        if (ex.category) clean.category = ex.category
        if (ex.primaryMuscle) clean.primaryMuscle = ex.primaryMuscle
        if (ex.equipment) clean.equipment = ex.equipment
        if (ex.notes) clean.notes = ex.notes
        if (ex.reportType) clean.reportType = ex.reportType
        if (ex.assistanceTypes && ex.assistanceTypes.length > 0) clean.assistanceTypes = ex.assistanceTypes
        if (ex.sectionTitle) clean.sectionTitle = ex.sectionTitle
        return clean
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanDay: any = {
        dayLabel: workoutName,
        name: workoutName,
        exercises: cleanExercises,
        restDay: false,
      }
      if (notes) cleanDay.notes = notes

      await programService.createProgram({
        trainerId: user.uid,
        traineeId,
        originalTrainerId: user.uid,
        trainerName: user.displayName || user.firstName || '',
        name: workoutName,
        type: 'standalone',
        status: 'active',
        isModifiedByTrainee: false,
        weeklyStructure: [cleanDay],
        startDate: new Date(),
        currentWeek: 1,
      })

      if (continueCreating) {
        clearWorkout()
        setWorkoutName('')
        setNotes('')
        setContinueCreating(false)
        onSaved()
      } else {
        clearWorkout()
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

  const handleBack = () => {
    if (selectedExercises.length > 0) {
      if (!window.confirm('יש תרגילים שלא נשמרו. לצאת בכל זאת?')) {
        return
      }
    }
    clearWorkout()
    onClose()
  }

  // Show ExerciseLibrary picker (same as trainee sees)
  if (showPicker) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
        <ExerciseLibrary
          targetUserId={traineeId}
          onProgramBack={() => setShowPicker(false)}
        />
      </div>
    )
  }

  // Build section-grouped display for exercises
  const exerciseDisplay = buildExerciseDisplay(selectedExercises, quickPlanSections)

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

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Workout name input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              שם האימון *
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="input-primary text-lg"
              placeholder="למשל: אימון רגליים, חזה + טרייספס..."
              autoFocus
            />
          </div>

          {/* Exercise count */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-primary rounded-full" />
              תרגילים ({selectedExercises.length})
            </h3>
            {selectedExercises.length > 0 && (
              <button
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1 text-sm text-primary-main hover:text-primary-main/80 transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                ערוך תרגילים
              </button>
            )}
          </div>

          {/* Exercise display - with section headers if Quick Plan was used */}
          {exerciseDisplay.length > 0 ? (
            <div className="space-y-3">
              {exerciseDisplay.map((item) => {
                if (item.type === 'header') {
                  return (
                    <div key={item.key} className="flex items-center gap-2 pt-2">
                      <span className="text-sm font-bold text-primary-main">{item.title}</span>
                      <div className="flex-1 h-px bg-primary-main/20" />
                    </div>
                  )
                }
                return (
                  <div key={item.key} className="text-sm bg-surface-container rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-on-surface font-medium">{item.exercise!.exerciseNameHe || item.exercise!.exerciseName}</span>
                    <span className="text-on-surface-variant">
                      {item.exercise!.customSetCount ?? 3} סטים
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full py-5 border-2 border-dashed border-dark-border rounded-2xl text-on-surface-variant hover:border-primary-main hover:text-primary-main transition flex items-center justify-center gap-3 text-lg"
            >
              <Plus className="w-5 h-5" />
              הוסף תרגילים
            </button>
          )}

          {/* Add more exercises button */}
          {selectedExercises.length > 0 && (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full mt-3 py-3 border-2 border-dashed border-dark-border rounded-2xl text-on-surface-variant hover:border-primary-main hover:text-primary-main transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              הוסף עוד תרגילים
            </button>
          )}

          {/* Notes */}
          <div className="mt-6">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
              הערות לאימון:
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-dark-surface/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-main placeholder-text-muted resize-none"
              placeholder="הערות למתאמן..."
              rows={2}
            />
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-dark-surface/95 backdrop-blur-lg border-t border-dark-border p-4 z-20">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={handleSaveAndContinue}
              disabled={isSaving || selectedExercises.length === 0}
              className="flex-1 py-3 bg-dark-card border border-primary-main/30 rounded-xl text-primary-main font-medium flex items-center justify-center gap-2 hover:bg-primary-main/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span>שמור וצור עוד</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || selectedExercises.length === 0}
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

// Build a flat display list with section headers and exercises
type DisplayItem =
  | { type: 'header'; key: string; title: string; exercise?: undefined }
  | { type: 'exercise'; key: string; exercise: SelectedExercise; title?: undefined }

function buildExerciseDisplay(
  exercises: SelectedExercise[],
  sections: { id: string; title: string }[]
): DisplayItem[] {
  if (sections.length === 0) {
    // No sections — flat list
    return exercises.map((ex) => ({
      type: 'exercise' as const,
      key: ex.exerciseId,
      exercise: ex,
    }))
  }

  // Group exercises by section
  const items: DisplayItem[] = []
  for (const section of sections) {
    const sectionExercises = exercises.filter(
      (e) => e.quickPlanSectionId === section.id
    )
    if (sectionExercises.length > 0 || sections.length > 0) {
      items.push({ type: 'header', key: `header_${section.id}`, title: section.title })
      for (const ex of sectionExercises) {
        items.push({ type: 'exercise', key: ex.exerciseId, exercise: ex })
      }
    }
  }

  // Any exercises without a section
  const unsectioned = exercises.filter(
    (e) => !e.quickPlanSectionId || !sections.some((s) => s.id === e.quickPlanSectionId)
  )
  for (const ex of unsectioned) {
    items.push({ type: 'exercise', key: ex.exerciseId, exercise: ex })
  }

  return items
}
