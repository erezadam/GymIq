import { useState } from 'react'
import { Plus, Search, X, ArrowRight, Moon, Sun } from 'lucide-react'
import type { ProgramDay, ProgramExercise } from '../../types'
import { ProgramExerciseEditor } from './ProgramExerciseEditor'
import { exerciseService } from '@/domains/exercises/services/exerciseService'
import type { Exercise } from '@/domains/exercises/types'

interface ProgramDayEditorProps {
  day: ProgramDay
  onUpdate: (day: ProgramDay) => void
  onBack: () => void
}

export function ProgramDayEditor({ day, onUpdate, onBack }: ProgramDayEditorProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Exercise[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    try {
      const results = await exerciseService.getExercises({ search: query })
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching exercises:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const addExercise = (exercise: Exercise) => {
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
    setShowPicker(false)
    setSearchQuery('')
    setSearchResults([])
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-icon">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary">{day.dayLabel}</h3>
          <input
            type="text"
            value={day.name}
            onChange={(e) => onUpdate({ ...day, name: e.target.value })}
            className="input-primary text-sm py-1 mt-1"
            placeholder="שם היום (למשל: חזה + טרייספס)"
          />
        </div>
        <button
          onClick={toggleRestDay}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
            day.restDay
              ? 'bg-status-info/20 text-status-info border border-status-info/30'
              : 'bg-dark-card text-text-muted border border-dark-border'
          }`}
        >
          {day.restDay ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{day.restDay ? 'מנוחה' : 'אימון'}</span>
        </button>
      </div>

      {/* Rest day message */}
      {day.restDay && (
        <div className="card text-center py-8 text-text-muted">
          <Moon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>יום מנוחה - אין תרגילים</p>
        </div>
      )}

      {/* Exercises */}
      {!day.restDay && (
        <>
          <div className="space-y-3">
            {day.exercises.map((exercise, index) => (
              <ProgramExerciseEditor
                key={`${exercise.exerciseId}-${index}`}
                exercise={exercise}
                onUpdate={(updates) => updateExercise(index, updates)}
                onRemove={() => removeExercise(index)}
              />
            ))}
          </div>

          {/* Add exercise button */}
          <button
            onClick={() => setShowPicker(true)}
            className="add-set-btn"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף תרגיל</span>
          </button>

          {/* Day notes */}
          <div>
            <input
              type="text"
              value={day.notes || ''}
              onChange={(e) => onUpdate({ ...day, notes: e.target.value || undefined })}
              className="input-primary text-sm"
              placeholder="הערות ליום..."
            />
          </div>
        </>
      )}

      {/* Exercise Picker Modal */}
      {showPicker && (
        <div className="modal-backdrop" onClick={() => setShowPicker(false)}>
          <div
            className="bg-dark-surface rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Picker header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-border">
              <h3 className="text-lg font-semibold text-text-primary">בחר תרגיל</h3>
              <button onClick={() => setShowPicker(false)} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-dark-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input-primary pr-10 text-sm"
                  placeholder="חפש תרגיל..."
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching && (
                <div className="flex justify-center py-8">
                  <div className="spinner-small" />
                </div>
              )}
              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="text-center py-8 text-text-muted text-sm">
                  לא נמצאו תרגילים
                </p>
              )}
              {!isSearching && searchQuery.length < 2 && (
                <p className="text-center py-8 text-text-muted text-sm">
                  הקלד לפחות 2 תווים לחיפוש
                </p>
              )}
              {searchResults.map((exercise) => {
                const alreadyAdded = day.exercises.some(
                  (e) => e.exerciseId === exercise.id
                )
                return (
                  <button
                    key={exercise.id}
                    onClick={() => !alreadyAdded && addExercise(exercise)}
                    disabled={alreadyAdded}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${
                      alreadyAdded
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-dark-card cursor-pointer'
                    }`}
                  >
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.nameHe}
                        className="w-10 h-10 rounded-lg object-cover bg-dark-card"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-dark-card flex items-center justify-center text-lg">
                        🏋️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {exercise.nameHe}
                      </p>
                      <p className="text-xs text-text-muted">
                        {exercise.category} · {exercise.equipment}
                      </p>
                    </div>
                    {alreadyAdded && (
                      <span className="text-xs text-status-success">נוסף</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
