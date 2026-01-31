/**
 * ExerciseSetExercisePicker
 * Multi-select exercise picker for exercise sets
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, X, GripVertical } from 'lucide-react'
import { getExercises } from '@/lib/firebase/exercises'
import type { Exercise } from '@/domains/exercises/types/exercise.types'
import { getExerciseImageUrl } from '@/domains/exercises/utils/getExerciseImageUrl'

interface ExerciseSetExercisePickerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  muscleGroup?: string // pre-filter by muscle group
}

export default function ExerciseSetExercisePicker({
  selectedIds,
  onChange,
  muscleGroup,
}: ExerciseSetExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    setLoading(true)
    try {
      const data = await getExercises()
      setExercises(data)
    } catch (error) {
      console.error('Error loading exercises:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedExercises = useMemo(
    () =>
      selectedIds
        .map((id) => exercises.find((e) => e.id === id))
        .filter(Boolean) as Exercise[],
    [selectedIds, exercises]
  )

  const availableExercises = useMemo(() => {
    let filtered = exercises.filter((e) => !selectedIds.includes(e.id))

    if (muscleGroup && muscleGroup !== 'all') {
      filtered = filtered.filter(
        (e) => e.category === muscleGroup || e.primaryMuscle === muscleGroup
      )
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.nameHe.includes(q)
      )
    }

    return filtered.slice(0, 30) // Limit for performance
  }, [exercises, selectedIds, muscleGroup, search])

  const handleAdd = (exerciseId: string) => {
    onChange([...selectedIds, exerciseId])
  }

  const handleRemove = (exerciseId: string) => {
    onChange(selectedIds.filter((id) => id !== exerciseId))
  }

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...selectedIds]
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    onChange(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-text-secondary">
        בחירת תרגילים * (מינימום 2)
      </label>

      {/* Selected exercises */}
      {selectedExercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">
            תרגילים נבחרים ({selectedExercises.length}):
          </p>
          <div className="space-y-1.5">
            {selectedExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center gap-2 bg-dark-elevated rounded-lg p-2"
              >
                <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0" />
                <img
                  src={getExerciseImageUrl(exercise)}
                  alt={exercise.nameHe}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      '/images/exercise-placeholder.svg'
                  }}
                />
                <span className="text-sm text-white flex-1 truncate">
                  {exercise.nameHe}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index - 1)}
                      className="text-xs text-text-muted hover:text-text-secondary px-1"
                    >
                      ↑
                    </button>
                  )}
                  {index < selectedExercises.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index + 1)}
                      className="text-xs text-text-muted hover:text-text-secondary px-1"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(exercise.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & available exercises */}
      <div className="border border-dark-border rounded-xl overflow-hidden">
        {/* Search */}
        <div className="p-2 border-b border-dark-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="חפש תרגיל..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-primary text-sm pr-9 w-full"
            />
          </div>
        </div>

        {/* Available list */}
        <div className="max-h-60 overflow-y-auto">
          {availableExercises.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-muted">
              {search ? 'לא נמצאו תרגילים' : 'כל התרגילים נבחרו'}
            </div>
          ) : (
            availableExercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => handleAdd(exercise.id)}
                className="w-full flex items-center gap-2 p-2 hover:bg-dark-elevated transition-colors border-b border-dark-border/50 last:border-b-0"
              >
                <img
                  src={getExerciseImageUrl(exercise)}
                  alt={exercise.nameHe}
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      '/images/exercise-placeholder.svg'
                  }}
                />
                <div className="flex-1 text-right min-w-0">
                  <p className="text-sm text-white truncate">{exercise.nameHe}</p>
                  <p className="text-xs text-text-muted truncate">{exercise.name}</p>
                </div>
                <Plus className="w-4 h-4 text-primary-500 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
