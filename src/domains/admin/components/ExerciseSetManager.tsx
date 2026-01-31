/**
 * ExerciseSetManager
 * Admin UI for managing exercise sets (recommended workout sets)
 */

import { useState, useEffect } from 'react'
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
import { deleteExerciseSetImage } from '@/lib/firebase/exerciseSetStorage'
import type { ExerciseSet } from '@/domains/exercises/types/exerciseSet.types'

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
  onEdit,
  onDelete,
  onToggleActive,
}: {
  exerciseSet: ExerciseSet
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleActive: (set: ExerciseSet) => void
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

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`card p-4 ${!exerciseSet.isActive ? 'opacity-60' : ''} ${isDragging ? 'z-50 shadow-lg ring-2 ring-primary-500/50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Image */}
        {exerciseSet.setImage ? (
          <img
            src={exerciseSet.setImage}
            alt={exerciseSet.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-dark-elevated flex items-center justify-center flex-shrink-0">
            <Layers className="w-6 h-6 text-text-muted" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{exerciseSet.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
              {diff.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted mt-0.5">
            <span>{muscleGroupLabels[exerciseSet.muscleGroup] || exerciseSet.muscleGroup}</span>
            <span>{exerciseSet.exerciseIds.length} תרגילים</span>
            <span>#{exerciseSet.order}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterMuscle, setFilterMuscle] = useState<string>('all')
  // editingSetId will be used when form component is ready
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadSets()
  }, [])

  const loadSets = async () => {
    setLoading(true)
    try {
      const data = await getExerciseSets()
      setExerciseSets(data)
    } catch (err) {
      console.error('Error loading exercise sets:', err)
      setError('שגיאה בטעינת סטים')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (setId: string) => {
    setError(null)
    if (!confirm('האם למחוק את הסט?')) return

    try {
      const set = exerciseSets.find((s) => s.id === setId)
      if (set?.setImage) {
        await deleteExerciseSetImage(set.setImage)
      }
      await deleteExerciseSet(setId)
      await loadSets()
    } catch (err) {
      console.error('Error deleting set:', err)
      setError('שגיאה במחיקת הסט')
    }
  }

  const handleToggleActive = async (set: ExerciseSet) => {
    try {
      await toggleExerciseSetActive(set.id, !set.isActive)
      await loadSets()
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
    // Optimistic update
    setExerciseSets((prev) => {
      const otherSets = prev.filter(
        (s) => !reordered.some((r) => r.id === s.id)
      )
      return [...otherSets, ...reordered].sort((a, b) => a.order - b.order)
    })

    try {
      await updateExerciseSetsOrder(reordered.map((s) => s.id))
      await loadSets()
    } catch (err) {
      console.error('Error reordering sets:', err)
      await loadSets() // Revert on error
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
    loadSets()
  }

  const filteredSets =
    filterMuscle === 'all'
      ? exerciseSets
      : exerciseSets.filter((s) => s.muscleGroup === filterMuscle)

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

      {/* Form placeholder - will be replaced with ExerciseSetForm in Step 3 */}
      {showForm && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {editingSetId ? 'עריכת סט' : 'סט חדש'}
            </h3>
            <button onClick={handleFormClose} className="btn-icon">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-text-muted text-sm">
            טופס יצירה/עריכה יתווסף בשלב 3
          </p>
          <p className="text-text-muted text-xs">
            {editingSetId ? `עריכת סט: ${editingSetId}` : 'יצירת סט חדש'}
          </p>
        </div>
      )}

      {/* Sets list with D&D */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredSets.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {filteredSets.map((set) => (
              <SortableSetRow
                key={set.id}
                exerciseSet={set}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
    </div>
  )
}
