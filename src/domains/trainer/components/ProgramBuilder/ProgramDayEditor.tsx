import { useState } from 'react'
import { Plus, ArrowRight, Moon, Sun } from 'lucide-react'
import type { ProgramDay, ProgramExercise } from '../../types'
import { ProgramExerciseEditor } from './ProgramExerciseEditor'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import type { Exercise } from '@/domains/exercises/types'

interface ProgramDayEditorProps {
  day: ProgramDay
  dayIndex: number
  onUpdate: (day: ProgramDay) => void
  onBack: () => void
}

const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const DAY_LETTER_GRADIENTS = [
  'from-primary-main to-teal-600',
  'from-status-info to-blue-600',
  'from-accent-purple to-purple-600',
  'from-accent-orange to-orange-600',
  'from-accent-pink to-pink-600',
  'from-accent-gold to-yellow-600',
  'from-status-success to-green-600',
]

export function ProgramDayEditor({ day, dayIndex, onUpdate, onBack }: ProgramDayEditorProps) {
  const [showPicker, setShowPicker] = useState(false)

  const letter = DAY_LETTERS[dayIndex] || String(dayIndex + 1)
  const gradient = DAY_LETTER_GRADIENTS[dayIndex % DAY_LETTER_GRADIENTS.length]

  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.targetSets, 0)
  const estimatedMinutes = Math.round(
    day.exercises.reduce((sum, ex) => {
      return sum + ex.targetSets * (45 + ex.restTime)
    }, 0) / 60 + day.exercises.length * 2
  )

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

  const toggleRestDay = () => {
    onUpdate({
      ...day,
      restDay: !day.restDay,
      exercises: day.restDay ? day.exercises : [],
    })
  }

  // Group exercises for superset display
  type ExerciseGroup = {
    supersetGroup: string | null
    exercises: { exercise: ProgramExercise; originalIndex: number }[]
  }
  const exerciseGroups: ExerciseGroup[] = []
  day.exercises.forEach((exercise, index) => {
    const group = exercise.supersetGroup || null
    if (group) {
      const existing = exerciseGroups.find(g => g.supersetGroup === group)
      if (existing) {
        existing.exercises.push({ exercise, originalIndex: index })
      } else {
        exerciseGroups.push({ supersetGroup: group, exercises: [{ exercise, originalIndex: index }] })
      }
    } else {
      exerciseGroups.push({ supersetGroup: null, exercises: [{ exercise, originalIndex: index }] })
    }
  })

  // Full-screen ExerciseLibrary picker
  if (showPicker) {
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
        <ExerciseLibrary
          programMode
          programExerciseIds={day.exercises.map(e => e.exerciseId)}
          onProgramExerciseToggle={handleExerciseToggle}
          onProgramBack={() => setShowPicker(false)}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition"
        >
          <ArrowRight className="w-5 h-5" />
          <span>חזרה למבנה</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
          עריכת יום {letter}
        </h1>
        <div className="w-20" />
      </div>

      {/* Day Header Card */}
      <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Day letter icon */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl sm:text-4xl font-black text-white flex-shrink-0`}
          >
            {letter}
          </div>

          {/* Name + stats */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={day.name}
              onChange={(e) => onUpdate({ ...day, name: e.target.value })}
              className="bg-transparent text-xl sm:text-2xl font-bold text-text-primary focus:outline-none border-b-2 border-transparent focus:border-primary-main w-full mb-2"
              placeholder="שם האימון (למשל: חזה + טרייספס)"
            />
            <div className="flex items-center gap-3 sm:gap-4 text-text-muted text-sm flex-wrap">
              <span className="flex items-center gap-1">
                📅 {day.dayLabel}
              </span>
              <span className="flex items-center gap-1">
                🏋️ {day.exercises.length} תרגילים
              </span>
              {estimatedMinutes > 0 && (
                <span className="flex items-center gap-1">
                  ⏱️ ~{estimatedMinutes} דקות
                </span>
              )}
            </div>
          </div>

          {/* Total sets counter */}
          {totalSets > 0 && (
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="text-2xl sm:text-3xl font-black text-primary-main">{totalSets}</div>
              <div className="text-sm text-text-muted">סטים</div>
            </div>
          )}
        </div>

        {/* Rest day toggle */}
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={toggleRestDay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition ${
              day.restDay
                ? 'bg-status-info/20 text-status-info border border-status-info/30'
                : 'bg-dark-surface text-text-muted border border-dark-border hover:border-primary-main/30'
            }`}
          >
            {day.restDay ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{day.restDay ? 'יום מנוחה' : 'יום אימון'}</span>
          </button>
        </div>
      </div>

      {/* Rest day message */}
      {day.restDay && (
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl text-center py-12 text-text-muted">
          <Moon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">יום מנוחה - אין תרגילים</p>
        </div>
      )}

      {/* Exercises */}
      {!day.restDay && (
        <>
          <div className="space-y-4">
            {exerciseGroups.map((group, groupIndex) => {
              // Superset group with multiple exercises
              if (group.supersetGroup && group.exercises.length > 1) {
                return (
                  <div key={groupIndex} className="relative">
                    {/* Superset accent bar */}
                    <div className="absolute right-2 top-4 bottom-4 w-1.5 rounded-full bg-gradient-to-b from-accent-purple to-accent-pink" />
                    {/* Superset label */}
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-10">
                      <div className="px-2 py-1 bg-accent-purple text-white text-xs rounded font-bold -rotate-90 origin-center whitespace-nowrap">
                        סופרסט
                      </div>
                    </div>
                    {/* Exercises */}
                    <div className="mr-7 space-y-2">
                      {group.exercises.map(({ exercise, originalIndex }) => (
                        <ProgramExerciseEditor
                          key={`${exercise.exerciseId}-${originalIndex}`}
                          exercise={exercise}
                          onUpdate={(updates) => updateExercise(originalIndex, updates)}
                          onRemove={() => removeExercise(originalIndex)}
                          isSuperset
                        />
                      ))}
                    </div>
                  </div>
                )
              }

              // Regular exercise(s)
              return group.exercises.map(({ exercise, originalIndex }) => (
                <ProgramExerciseEditor
                  key={`${exercise.exerciseId}-${originalIndex}`}
                  exercise={exercise}
                  onUpdate={(updates) => updateExercise(originalIndex, updates)}
                  onRemove={() => removeExercise(originalIndex)}
                />
              ))
            })}
          </div>

          {/* Add exercise button */}
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-5 border-2 border-dashed border-dark-border rounded-2xl text-text-muted hover:border-primary-main hover:text-primary-main transition flex items-center justify-center gap-3 text-lg"
          >
            <Plus className="w-5 h-5" />
            הוסף תרגיל
          </button>

          {/* Day notes */}
          <div>
            <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
              📝 הערות ליום:
            </div>
            <textarea
              value={day.notes || ''}
              onChange={(e) => onUpdate({ ...day, notes: e.target.value || undefined })}
              className="w-full bg-dark-surface/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-main placeholder-text-muted resize-none"
              placeholder="הערות כלליות ליום האימון..."
              rows={2}
            />
          </div>
        </>
      )}

      {/* Bottom actions */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-5 sm:px-6 py-3 sm:py-4 bg-dark-surface rounded-xl hover:bg-dark-card transition flex items-center gap-2 text-text-secondary"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה למבנה</span>
        </button>
      </div>
    </div>
  )
}
