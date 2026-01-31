/**
 * ExerciseSetManager
 * Admin UI for managing exercise sets (recommended workout sets)
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  X,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  Layers,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getExerciseSets,
  deleteExerciseSet,
  toggleExerciseSetActive,
  updateExerciseSetsOrder,
} from '@/lib/firebase/exerciseSets'
import { getExercises } from '@/lib/firebase/exercises'
import type { ExerciseSet } from '@/domains/exercises/types/exerciseSet.types'
import type { Exercise } from '@/domains/exercises/types/exercise.types'
import ExerciseSetForm from './ExerciseSetForm'

// Difficulty labels
const difficultyLabels: Record<string, { label: string; className: string }> = {
  beginner: { label: 'מתחילים', className: 'bg-green-500/20 text-green-400' },
  intermediate: { label: 'בינוני', className: 'bg-yellow-500/20 text-yellow-400' },
  advanced: { label: 'מתקדמים', className: 'bg-orange-500/20 text-orange-400' },
}

// Muscle group labels
const muscleGroupLabels: Record<string, string> = {
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'זרועות',
  core: 'ליבה',
  cardio: 'אירובי',
  functional: 'פונקציונלי',
  stretching: 'מתיחות',
  warmup: 'חימום',
}

/** Sortable row component */
function SortableSetRow({
  exerciseSet,
  exerciseNames,
  onEdit,
  onDelete,
  onToggleActive,
  onImageClick,
}: {
  exerciseSet: ExerciseSet
  exerciseNames: Map<string, string>
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleActive: (set: ExerciseSet) => void
  onImageClick: (url: string, name: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exerciseSet.id })

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const diff = difficultyLabels[exerciseSet.difficulty] || difficultyLabels.beginner

  // Resolve exercise names
  const exerciseNamesList = exerciseSet.exerciseIds
    .map((id) => exerciseNames.get(id))
    .filter(Boolean) as string[]

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`card p-4 ${!exerciseSet.isActive ? 'opacity-60' : ''} ${isDragging ? 'z-50 shadow-lg ring-2 ring-primary-500/50' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Drag handle */}
        <button
          className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary touch-none mt-4"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Image - square, clickable */}
        {exerciseSet.setImage ? (
          <img
            src={exerciseSet.setImage}
            alt={exerciseSet.name}
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onImageClick(exerciseSet.setImage, exerciseSet.name)}
          />
        ) : (
          <div className="w-24 h-24 rounded-xl bg-dark-elevated flex items-center justify-center flex-shrink-0">
            <Layers className="w-8 h-8 text-text-muted" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-lg">{exerciseSet.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
              {diff.label}
            </span>
            <span className="text-xs text-text-muted">#{exerciseSet.order}</span>
          </div>

          <div className="text-sm text-text-muted mt-1">
            {muscleGroupLabels[exerciseSet.muscleGroup] || exerciseSet.muscleGroup} &bull; {exerciseSet.exerciseIds.length} תרגילים
          </div>

          {/* Exercise names */}
          {exerciseNamesList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {exerciseNamesList.map((name, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-md bg-dark-elevated text-text-secondary"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button
            onClick={() => onToggleActive(exerciseSet)}
            className={`btn-icon ${exerciseSet.isActive ? 'text-green-400' : 'text-text-muted'}`}
            title={exerciseSet.isActive ? 'פעיל - לחץ להשבתה' : 'מושבת - לחץ להפעלה'}
          >
            {exerciseSet.isActive ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => onEdit(exerciseSet.id)}
            className="btn-icon"
            title="ערוך"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(exerciseSet.id)}
            className="btn-icon text-red-400"
            title="מחק"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExerciseSetManager() {
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMuscle, setFilterMuscle] = useState<string>('all')
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [setsData, exercisesData] = await Promise.all([
        getExerciseSets(),
        getExercises(),
      ])
      setExerciseSets(setsData)
      setExercises(exercisesData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  // Map exercise ID -> Hebrew name
  const exerciseNames = useMemo(() => {
    const map = new Map<string, string>()
    exercises.forEach((e) => map.set(e.id, e.nameHe))
    return map
  }, [exercises])

  const handleDelete = async (setId: string) => {
    setError(null)
    if (!confirm('האם למחוק את הסט?')) return

    try {
      await deleteExerciseSet(setId)
      await loadData()
    } catch (err) {
      console.error('Error deleting set:', err)
      setError('שגיאה במחיקת הסט')
    }
  }

  const handleToggleActive = async (set: ExerciseSet) => {
    try {
      await toggleExerciseSetActive(set.id, !set.isActive)
      await loadData()
    } catch (err) {
      console.error('Error toggling set:', err)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filteredSets.findIndex((s) => s.id === active.id)
    const newIndex = filteredSets.findIndex((s) => s.id === over.id)

    const reordered = arrayMove(filteredSets, oldIndex, newIndex)
    setExerciseSets((prev) => {
      const otherSets = prev.filter(
        (s) => !reordered.some((r) => r.id === s.id)
      )
      return [...otherSets, ...reordered].sort((a, b) => a.order - b.order)
    })

    try {
      await updateExerciseSetsOrder(reordered.map((s) => s.id))
      await loadData()
    } catch (err) {
      console.error('Error reordering sets:', err)
      await loadData()
    }
  }

  const handleEdit = (setId: string) => {
    setEditingSetId(setId)
    setShowForm(true)
  }

  const handleAdd = () => {
    setEditingSetId(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingSetId(null)
  }

  const filteredSets =
    filterMuscle === 'all'
      ? exerciseSets
      : exerciseSets.filter((s) => s.muscleGroup === filterMuscle)

  // Group sets by muscle group for display
  const groupedSets = useMemo(() => {
    if (filterMuscle !== 'all') return null // no grouping when filtered
    const groups = new Map<string, ExerciseSet[]>()
    exerciseSets.forEach((s) => {
      const list = groups.get(s.muscleGroup) || []
      list.push(s)
      groups.set(s.muscleGroup, list)
    })
    return groups
  }, [exerciseSets, filterMuscle])

  // Get unique muscle groups from existing sets
  const availableMuscleGroups = [
    ...new Set(exerciseSets.map((s) => s.muscleGroup)),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  const renderSetsList = (sets: ExerciseSet[]) => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sets.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {sets.map((set) => (
            <SortableSetRow
              key={set.id}
              exerciseSet={set}
              exerciseNames={exerciseNames}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onImageClick={(url, name) => setImagePreview({ url, name })}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול סטים מומלצים</h1>
          <p className="text-text-muted text-sm">
            צור וערוך סטים של תרגילים שמשתמשים יכולים לבחור במהירות
          </p>
        </div>
        <button onClick={handleAdd} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          הוסף סט
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mr-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Muscle group filter */}
      {availableMuscleGroups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterMuscle('all')}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filterMuscle === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-dark-surface text-text-muted hover:text-text-secondary'
            }`}
          >
            הכל ({exerciseSets.length})
          </button>
          {availableMuscleGroups.map((mg) => (
            <button
              key={mg}
              onClick={() => setFilterMuscle(mg)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                filterMuscle === mg
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-surface text-text-muted hover:text-text-secondary'
              }`}
            >
              {muscleGroupLabels[mg] || mg} (
              {exerciseSets.filter((s) => s.muscleGroup === mg).length})
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <ExerciseSetForm
          setId={editingSetId}
          onClose={handleFormClose}
          onSaved={loadData}
        />
      )}

      {/* Sets list - grouped or flat */}
      {groupedSets && groupedSets.size > 1 ? (
        // Grouped by muscle
        <div className="space-y-8">
          {Array.from(groupedSets.entries()).map(([mg, sets]) => (
            <div key={mg}>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                {muscleGroupLabels[mg] || mg}
                <span className="text-sm font-normal text-text-muted">({sets.length})</span>
              </h2>
              {renderSetsList(sets)}
            </div>
          ))}
        </div>
      ) : (
        // Flat list (filtered or single group)
        renderSetsList(filteredSets)
      )}

      {/* Empty state */}
      {filteredSets.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon">📋</span>
          <h3 className="empty-state-title">
            {filterMuscle === 'all' ? 'אין סטים מוגדרים' : 'אין סטים לקבוצה זו'}
          </h3>
          <p className="empty-state-text">
            לחץ על "הוסף סט" ליצירת סט מומלץ חדש
          </p>
        </div>
      )}

      {/* Image Preview Popup */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="max-w-lg w-full">
            <img
              src={imagePreview.url}
              alt={imagePreview.name}
              className="w-full rounded-xl"
            />
            <p className="text-white text-center mt-3 font-semibold">
              {imagePreview.name}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
