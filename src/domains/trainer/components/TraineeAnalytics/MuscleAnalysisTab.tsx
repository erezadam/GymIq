/**
 * Muscle Analysis Tab for Trainer's TraineeAnalytics
 * Shows weekly muscle breakdown for a specific trainee.
 * Allows trainer to pick exercises per muscle and save as standalone workout.
 */

import { useState } from 'react'
import { Calendar, ChevronRight, X, Plus, Save, Loader2, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { programService } from '@/domains/trainer/services/programService'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import type { Exercise } from '@/domains/exercises/types'
import type { ProgramExercise } from '@/domains/trainer/types'
import {
  useMuscleAnalysis,
  MIN_SETS,
  MIN_AVG_REPS,
  type MuscleRow,
  type WeekMode,
} from '@/domains/workouts/hooks/useMuscleAnalysis'

interface MuscleAnalysisTabProps {
  traineeId: string
}

export function MuscleAnalysisTab({ traineeId }: MuscleAnalysisTabProps) {
  const { user } = useAuthStore()
  const [weekMode, setWeekMode] = useState<WeekMode>('current')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleRow | null>(null)

  // Exercise picking state
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<{ muscle: string; subMuscle: string } | null>(null)
  const [selectedExercises, setSelectedExercises] = useState<ProgramExercise[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [workoutName, setWorkoutName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const { loading, rows, summaryRows, weekRange } = useMuscleAnalysis(traineeId, weekMode, customStart, customEnd)

  // Handle "+" click — open ExerciseLibrary filtered by muscle
  const handleAddExercises = (row: MuscleRow) => {
    setPickerMuscleFilter({ muscle: row.category, subMuscle: row.primaryMuscle })
    setShowExercisePicker(true)
  }

  // Handle exercise toggle from ExerciseLibrary
  const handleExerciseToggle = (exercise: Exercise, isAdding: boolean) => {
    if (isAdding) {
      const alreadyExists = selectedExercises.some(e => e.exerciseId === exercise.id)
      if (alreadyExists) return

      const newExercise: ProgramExercise = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        videoWebpUrl: exercise.videoWebpUrl,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        order: selectedExercises.length + 1,
        targetSets: 3,
        targetReps: '8-12',
        restTime: 90,
        reportType: exercise.reportType,
        assistanceTypes: exercise.assistanceTypes,
      }
      setSelectedExercises(prev => [...prev, newExercise])
    } else {
      setSelectedExercises(prev => {
        const updated = prev.filter(e => e.exerciseId !== exercise.id)
        updated.forEach((ex, i) => (ex.order = i + 1))
        return updated
      })
    }
  }

  // Save as standalone workout
  const handleSave = async () => {
    if (!user || !workoutName.trim() || selectedExercises.length === 0) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const cleanExercises = selectedExercises.map(ex => {
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
        if (ex.reportType) clean.reportType = ex.reportType
        if (ex.assistanceTypes && ex.assistanceTypes.length > 0) clean.assistanceTypes = ex.assistanceTypes
        return clean
      })

      await programService.createProgram({
        trainerId: user.uid,
        traineeId,
        originalTrainerId: user.uid,
        trainerName: user.displayName || user.firstName || '',
        name: workoutName.trim(),
        type: 'standalone',
        status: 'active',
        isModifiedByTrainee: false,
        weeklyStructure: [{
          dayLabel: workoutName.trim(),
          name: workoutName.trim(),
          exercises: cleanExercises,
          restDay: false,
        }],
        startDate: new Date(),
        currentWeek: 1,
      })

      // Reset state
      setSelectedExercises([])
      setWorkoutName('')
      setShowNameInput(false)
    } catch (err: any) {
      console.error('Error saving standalone workout:', err)
      setSaveError(err.message || 'שגיאה בשמירת האימון')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedExercises([])
    setWorkoutName('')
    setShowNameInput(false)
    setSaveError(null)
  }

  // Full-screen ExerciseLibrary picker
  if (showExercisePicker) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
        <ExerciseLibrary
          programMode
          programExerciseIds={selectedExercises.map(e => e.exerciseId)}
          onProgramExerciseToggle={handleExerciseToggle}
          onProgramBack={() => setShowExercisePicker(false)}
          targetUserId={traineeId}
          initialMuscleFilter={pickerMuscleFilter?.muscle}
          initialSubMuscleFilter={pickerMuscleFilter?.subMuscle}
        />
      </div>
    )
  }

  // Save modal — workout name input
  if (showNameInput) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setShowNameInput(false)}
      >
        <div
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-dark-card border border-dark-border p-6"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">שמירת אימון בודד</h2>
            <button
              onClick={() => setShowNameInput(false)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>

          <p className="text-sm text-on-surface-variant mb-4">
            {selectedExercises.length} תרגילים נבחרו
          </p>

          {saveError && (
            <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm mb-4">
              {saveError}
            </div>
          )}

          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            שם האימון *
          </label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-dark-surface border border-dark-border text-text-primary text-base focus:outline-none focus:ring-1 focus:ring-primary-main mb-4"
            placeholder="למשל: חיזוק רגליים, חזה + כתפיים..."
            autoFocus
          />

          <div className="flex gap-3">
            <button
              onClick={() => setShowNameInput(false)}
              className="flex-1 py-3 rounded-xl bg-dark-surface border border-dark-border text-on-surface-variant font-medium"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !workoutName.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary-main to-status-info text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  שמור
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Exercise detail modal
  if (selectedMuscle) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setSelectedMuscle(null)}
      >
        <div
          className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-dark-card border border-dark-border"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMuscle(null)}
                className="p-1 text-on-surface-variant hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-text-primary">{selectedMuscle.primaryMuscleHe}</h2>
                <p className="text-xs text-on-surface-variant">{selectedMuscle.totalSets} סטים · ממוצע {selectedMuscle.avgReps} חזרות</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMuscle(null)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            >
              <X className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
            {selectedMuscle.exercises.length === 0 ? (
              <p className="text-on-surface-variant text-center py-8">אין תרגילים בתקופה זו</p>
            ) : (
              <div className="space-y-3">
                {selectedMuscle.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-dark-card/60 border border-dark-border">
                    <span className="text-sm text-text-primary font-medium">{ex.name}</span>
                    <div className="text-left">
                      <div className="text-sm text-text-primary">{ex.sets} סטים</div>
                      <div className="text-xs text-on-surface-variant">ממוצע {ex.avgReps} חזרות</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      {/* Week Range Display */}
      {weekRange.startStr && (
        <p className="text-xs text-on-surface-variant mb-3">
          {weekRange.startStr} – {weekRange.endStr}
        </p>
      )}

      {/* Week Selector */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setWeekMode('last')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
              weekMode === 'last'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-on-surface-variant border border-dark-border'
            }`}
          >
            שבוע אחרון
          </button>
          <button
            onClick={() => setWeekMode('current')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
              weekMode === 'current'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-on-surface-variant border border-dark-border'
            }`}
          >
            שבוע נוכחי
          </button>
          <button
            onClick={() => setWeekMode('custom')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
              weekMode === 'custom'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-on-surface-variant border border-dark-border'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            בין תאריכים
          </button>
        </div>

        {weekMode === 'custom' && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="text-xs text-on-surface-variant block mb-1">מתאריך</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-on-surface-variant block mb-1">עד תאריך</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={selectedExercises.length > 0 ? 'pb-20' : ''}>
        {weekMode === 'custom' && (!customStart || !customEnd) ? (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant text-sm">
            <Calendar className="w-8 h-8 mb-3 opacity-40" />
            <p>בחר תאריך התחלה וסיום</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant text-sm">
            <span className="text-3xl mb-3 opacity-40">🏋️</span>
            <p>אין אימונים בתקופה זו</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Summary Table */}
            <h3 className="text-sm font-bold text-text-primary mb-2">סיכום לפי קבוצת שרירים</h3>
            <table className="w-full text-sm min-w-[340px] mb-6">
              <thead>
                <tr className="text-on-surface-variant text-xs border-b border-dark-border">
                  <th className="text-right py-2 pr-2 font-medium">קבוצת שרירים</th>
                  <th className="text-right py-2 font-medium">סטים / דקות</th>
                  <th className="text-center py-2 pl-2 font-medium">חזרות / zone</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr key={row.category} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                    <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                    <td className="py-2.5">
                      {row.isCardio ? (
                        row.totalMinutes && row.totalMinutes > 0 ? (
                          <div className="font-medium text-text-primary">{row.totalMinutes} דק׳</div>
                        ) : (
                          <div className="text-on-surface-variant">—</div>
                        )
                      ) : row.totalSets > 0 ? (
                        <div className={`font-medium ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-on-surface-variant">—</div>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-center">
                      {row.isCardio ? (
                        row.avgZone && row.avgZone > 0 ? (
                          <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )
                      ) : row.avgReps > 0 ? (
                        <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {row.avgReps}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Detailed Table */}
            <h3 className="text-sm font-bold text-text-primary mb-2">פירוט לפי תת-שריר</h3>
            <table className="w-full text-sm min-w-[340px]">
              <thead>
                <tr className="text-on-surface-variant text-xs border-b border-dark-border">
                  <th className="text-right py-2 pr-2 font-medium">שריר</th>
                  <th className="text-right py-2 font-medium">תת-שריר</th>
                  <th className="text-right py-2 font-medium">סטים / דקות</th>
                  <th className="text-center py-2 font-medium">חזרות / zone</th>
                  <th className="w-10 py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.primaryMuscle} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                    <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                    <td className="py-2.5 text-on-surface-variant">{row.primaryMuscleHe}</td>
                    <td
                      className={`py-2.5 ${row.totalSets > 0 ? 'cursor-pointer hover:bg-primary/5 rounded-lg transition-colors' : ''}`}
                      onClick={() => row.totalSets > 0 && setSelectedMuscle(row)}
                    >
                      {row.isCardio ? (
                        row.totalMinutes && row.totalMinutes > 0 ? (
                          <div className="font-medium text-text-primary underline decoration-current/30">{row.totalMinutes} דק׳</div>
                        ) : (
                          <div className="text-on-surface-variant">—</div>
                        )
                      ) : row.totalSets > 0 ? (
                        <div className={`font-medium underline decoration-current/30 ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-on-surface-variant">—</div>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {row.isCardio ? (
                        row.avgZone && row.avgZone > 0 ? (
                          <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )
                      ) : row.avgReps > 0 ? (
                        <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {row.avgReps}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-center">
                      <button
                        onClick={() => handleAddExercises(row)}
                        className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors mx-auto"
                        title={`הוסף תרגילים ל${row.primaryMuscleHe}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex flex-col gap-1 text-xs text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
                  עומד ביעד
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-error" />
                  מתחת ליעד
                </span>
                <span className="flex items-center gap-1">
                  <Plus className="w-3 h-3 text-primary" />
                  הוסף תרגילים
                </span>
              </div>
              <div>יעד: ≥{MIN_SETS} סטים, ≥{MIN_AVG_REPS} חזרות ממוצע</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      {selectedExercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-dark-surface/95 backdrop-blur-lg border-t border-primary-main/30 p-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between" dir="rtl">
            <button
              onClick={() => setShowNameInput(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-main to-status-info text-white font-bold text-sm"
            >
              סיום ({selectedExercises.length})
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearSelection}
                className="text-status-error text-xs hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                נקה
              </button>
              <span className="text-text-primary text-sm font-semibold">
                {selectedExercises.length} תרגילים נבחרו
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
