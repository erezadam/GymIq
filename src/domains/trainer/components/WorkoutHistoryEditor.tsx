/**
 * WorkoutHistoryEditor — Modal for trainer to edit a trainee's workout history entry.
 * Allows removing unfinished exercises/sets, editing targets, and adding new exercises.
 * Completed sets (with actual data) are read-only.
 */
import { useState, useCallback } from 'react'
import { X, Trash2, Plus, AlertTriangle, Check, Loader2, Pencil } from 'lucide-react'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'
import type { Exercise } from '@/domains/exercises/types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import { trainerEditWorkout } from '@/lib/firebase/workoutHistory'

interface WorkoutHistoryEditorProps {
  workout: WorkoutHistoryEntry
  traineeId: string
  traineeName: string
  trainerId: string
  trainerName: string
  onClose: () => void
  onSaved: () => void
}

type EditableExercise = WorkoutHistoryEntry['exercises'][number]

function isSetCompleted(set: EditableExercise['sets'][number]): boolean {
  return set.completed || (set.actualReps != null && set.actualReps > 0)
}

function hasCompletedSets(exercise: EditableExercise): boolean {
  return exercise.sets.some(isSetCompleted)
}

export function WorkoutHistoryEditor({
  workout,
  traineeId,
  traineeName,
  trainerId,
  trainerName,
  onClose,
  onSaved,
}: WorkoutHistoryEditorProps) {
  const [exercises, setExercises] = useState<EditableExercise[]>(
    () => workout.exercises.map(ex => ({ ...ex, sets: ex.sets.map(s => ({ ...s })) }))
  )
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingSet, setEditingSet] = useState<{ exIdx: number; setIdx: number } | null>(null)

  // Check if anything changed
  const hasChanges = JSON.stringify(exercises) !== JSON.stringify(workout.exercises)

  const handleRemoveExercise = useCallback((idx: number) => {
    if (hasCompletedSets(exercises[idx])) {
      // Should not happen — button is hidden for exercises with completed sets
      return
    }
    setExercises(prev => prev.filter((_, i) => i !== idx))
    setConfirmDeleteIdx(null)
  }, [exercises])

  const handleRemoveSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const updated = [...prev]
      const ex = { ...updated[exIdx] }
      ex.sets = ex.sets.filter((_, i) => i !== setIdx)
      // If no sets left and no completed sets, remove the exercise
      if (ex.sets.length === 0) {
        return updated.filter((_, i) => i !== exIdx)
      }
      updated[exIdx] = ex
      return updated
    })
  }, [])

  const handleUpdateSetTarget = useCallback((exIdx: number, setIdx: number, field: 'targetReps' | 'targetWeight', value: number) => {
    setExercises(prev => {
      const updated = [...prev]
      const ex = { ...updated[exIdx] }
      ex.sets = ex.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
      updated[exIdx] = ex
      return updated
    })
  }, [])

  const handleAddExercise = useCallback((exercise: Exercise, isAdding: boolean) => {
    if (!isAdding) return

    const alreadyExists = exercises.some(e => e.exerciseId === exercise.id)
    if (alreadyExists) return

    const newExercise: EditableExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNameHe: exercise.nameHe,
      imageUrl: exercise.imageUrl,
      videoWebpUrl: exercise.videoWebpUrl,
      category: exercise.category,
      isCompleted: false,
      sets: [
        { type: 'working', targetReps: 10, targetWeight: 0, completed: false },
        { type: 'working', targetReps: 10, targetWeight: 0, completed: false },
        { type: 'working', targetReps: 10, targetWeight: 0, completed: false },
      ],
    }
    setExercises(prev => [...prev, newExercise])
    setShowExercisePicker(false)
  }, [exercises])

  const handleSave = async () => {
    if (exercises.length === 0) {
      setError('חייב להישאר לפחות תרגיל אחד')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Build edit summary
      const originalIds = new Set(workout.exercises.map(e => e.exerciseId))
      const newIds = new Set(exercises.map(e => e.exerciseId))
      const removed = workout.exercises.filter(e => !newIds.has(e.exerciseId))
      const added = exercises.filter(e => !originalIds.has(e.exerciseId))

      const summaryParts: string[] = []
      if (removed.length > 0) {
        summaryParts.push(`הוסר: ${removed.map(e => e.exerciseNameHe || e.exerciseName).join(', ')}`)
      }
      if (added.length > 0) {
        summaryParts.push(`נוסף: ${added.map(e => e.exerciseNameHe || e.exerciseName).join(', ')}`)
      }
      if (summaryParts.length === 0) {
        summaryParts.push('עדכון סטים/יעדים')
      }

      await trainerEditWorkout(workout.id, {
        exercises,
        lastEditedByTrainer: {
          trainerId,
          trainerName,
          editSummary: summaryParts.join(' | '),
        },
      })

      onSaved()
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת השינויים')
    } finally {
      setIsSaving(false)
    }
  }

  // Exercise picker view
  if (showExercisePicker) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-background flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <button
            onClick={() => setShowExercisePicker(false)}
            className="text-on-surface-variant text-sm"
          >
            חזרה לעריכה
          </button>
          <h2 className="text-on-surface font-bold">הוסף תרגיל</h2>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ExerciseLibrary
            programMode
            programExerciseIds={exercises.map(e => e.exerciseId)}
            onProgramExerciseToggle={handleAddExercise}
            onProgramBack={() => setShowExercisePicker(false)}
            targetUserId={traineeId}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-surface-container w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-dark-surface"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-on-surface font-bold text-base truncate">{workout.name}</h2>
            <p className="text-on-surface-variant text-xs">
              {new Date(workout.date).toLocaleDateString('he-IL')}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Warning banner */}
        <div className="mx-4 mt-3 p-3 bg-status-warning/10 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
          <span className="text-status-warning text-xs">
            עריכת אימון של {traineeName} — סטים שבוצעו לא ניתנים לשינוי
          </span>
        </div>

        {/* Exercises list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {exercises.map((ex, exIdx) => {
            const exHasCompleted = hasCompletedSets(ex)
            const canDeleteExercise = !exHasCompleted

            return (
              <div key={`${ex.exerciseId}-${exIdx}`} className="rounded-xl bg-dark-card overflow-hidden">
                {/* Exercise header */}
                <div className="flex items-center gap-3 p-3">
                  {/* #20 */}
                  <ExerciseMedia
                    imageUrl={ex.imageUrl}
                    videoWebpUrl={ex.videoWebpUrl}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    variant="thumbnail"
                    placeholder={
                      <div className="w-10 h-10 rounded-lg bg-dark-surface flex items-center justify-center text-sm flex-shrink-0">
                        🏋️
                      </div>
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-on-surface truncate">
                      {ex.exerciseNameHe || ex.exerciseName}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {ex.sets.length} סטים
                      {exHasCompleted && (
                        <span className="text-status-success mr-1">
                          ({ex.sets.filter(isSetCompleted).length} בוצעו)
                        </span>
                      )}
                    </div>
                  </div>
                  {canDeleteExercise && (
                    confirmDeleteIdx === exIdx ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemoveExercise(exIdx)}
                          className="px-2 py-1 bg-status-error/20 text-status-error text-xs rounded-lg"
                        >
                          מחק
                        </button>
                        <button
                          onClick={() => setConfirmDeleteIdx(null)}
                          className="px-2 py-1 bg-dark-surface text-on-surface-variant text-xs rounded-lg"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteIdx(exIdx)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-status-error/10"
                      >
                        <Trash2 className="w-4 h-4 text-status-error/60" />
                      </button>
                    )
                  )}
                </div>

                {/* Sets */}
                <div className="px-3 pb-3 space-y-1">
                  {ex.sets.map((set, setIdx) => {
                    const completed = isSetCompleted(set)
                    const isEditing = editingSet?.exIdx === exIdx && editingSet?.setIdx === setIdx

                    if (completed) {
                      // Read-only completed set
                      const setTime = (set as any).time as number | undefined
                      const hasTime = setTime !== undefined && setTime > 0
                      const hasReps = (set.actualReps || 0) > 0
                      const hasWeight = (set.actualWeight || 0) > 0
                      return (
                        <div
                          key={setIdx}
                          className="flex items-center gap-2 px-3 py-2 bg-status-success/5 rounded-lg"
                        >
                          <Check className="w-3.5 h-3.5 text-status-success flex-shrink-0" />
                          <span className="text-xs text-on-surface-variant flex-1">
                            סט {setIdx + 1}:
                            {hasTime && (
                              <> {`${Math.floor(setTime! / 60)}:${(setTime! % 60).toString().padStart(2, '0')}`} דק׳{(hasReps || hasWeight) && ' •'}</>
                            )}
                            {hasWeight && (
                              <> {set.actualWeight} ק&quot;ג × </>
                            )}
                            {hasReps && <> {set.actualReps} חזרות</>}
                            {!hasTime && !hasReps && !hasWeight && ' —'}
                          </span>
                          <span className="text-[10px] text-status-success/60">בוצע</span>
                        </div>
                      )
                    }

                    // Editable unfinished set
                    return (
                      <div
                        key={setIdx}
                        className="flex items-center gap-2 px-3 py-2 bg-dark-surface/50 rounded-lg"
                      >
                        <span className="text-xs text-on-surface-variant w-12 flex-shrink-0">
                          סט {setIdx + 1}:
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.targetWeight || 0}
                              onChange={e => handleUpdateSetTarget(exIdx, setIdx, 'targetWeight', Number(e.target.value) || 0)}
                              className="w-16 px-2 py-1 bg-dark-card rounded text-xs text-on-surface text-center"
                              placeholder="משקל"
                            />
                            <span className="text-xs text-on-surface-variant">ק&quot;ג ×</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.targetReps || 0}
                              onChange={e => handleUpdateSetTarget(exIdx, setIdx, 'targetReps', Number(e.target.value) || 0)}
                              className="w-14 px-2 py-1 bg-dark-card rounded text-xs text-on-surface text-center"
                              placeholder="חזרות"
                            />
                            <button
                              onClick={() => setEditingSet(null)}
                              className="w-6 h-6 flex items-center justify-center"
                            >
                              <Check className="w-3.5 h-3.5 text-primary-main" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xs text-on-surface-variant flex-1">
                              {(set.targetWeight || 0) > 0 && <>{set.targetWeight} ק&quot;ג × </>}
                              {set.targetReps || 0} חזרות
                            </span>
                            <button
                              onClick={() => setEditingSet({ exIdx, setIdx })}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-dark-card"
                            >
                              <Pencil className="w-3 h-3 text-on-surface-variant" />
                            </button>
                            <button
                              onClick={() => handleRemoveSet(exIdx, setIdx)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-status-error/10"
                            >
                              <Trash2 className="w-3 h-3 text-status-error/50" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Add exercise button */}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-3 border border-dashed border-dark-border rounded-xl flex items-center justify-center gap-2 text-on-surface-variant hover:text-primary-main hover:border-primary-main transition"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">הוסף תרגיל</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-status-error/10 rounded-xl text-status-error text-xs text-center">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-dark-border flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-dark-surface text-on-surface-variant rounded-xl text-sm font-medium"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex-1 py-3 bg-primary-main text-black rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>שומר...</span>
              </>
            ) : (
              <span>שמור שינויים</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
