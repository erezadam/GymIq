import { Minus, Plus, X, PlusCircle, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { SelectedExercise, QuickPlanSection } from '@/domains/workouts/store/workoutBuilderStore'

interface QuickPlanExerciseListProps {
  sections: QuickPlanSection[]
  exercises: SelectedExercise[]
  activeSectionId: string | null
  onAddSection: (title: string) => void
  onUpdateSectionTitle: (sectionId: string, title: string) => void
  onRemoveSection: (sectionId: string) => void
  onSetActiveSection: (sectionId: string) => void
  onSetCountChange: (exerciseId: string, count: number) => void
  onRemoveExercise: (exerciseId: string) => void
}

export default function QuickPlanExerciseList({
  sections,
  exercises,
  activeSectionId,
  onAddSection,
  onUpdateSectionTitle,
  onRemoveSection,
  onSetActiveSection,
  onSetCountChange,
  onRemoveExercise,
}: QuickPlanExerciseListProps) {
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [isAddingSection, setIsAddingSection] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const handleAddSection = () => {
    if (newSectionTitle.trim()) {
      onAddSection(newSectionTitle.trim())
      setNewSectionTitle('')
      setIsAddingSection(false)
    }
  }

  const handleStartEdit = (section: QuickPlanSection) => {
    setEditingSectionId(section.id)
    setEditingTitle(section.title)
  }

  const handleSaveEdit = (sectionId: string) => {
    if (editingTitle.trim()) {
      onUpdateSectionTitle(sectionId, editingTitle.trim())
    }
    setEditingSectionId(null)
  }

  const totalExercises = exercises.length
  const totalSets = exercises.reduce((sum, e) => sum + (e.customSetCount ?? 3), 0)

  return (
    <div className="flex flex-col gap-3">
      {sections.length === 0 && !isAddingSection && (
        <div className="text-center py-6 text-on-surface-variant text-sm">
          לחץ על &quot;+ הוספת כותרת&quot; כדי להתחיל לתכנן
        </div>
      )}

      {/* Sections with their exercises */}
      {sections.map((section) => {
        const sectionExercises = exercises.filter(
          (e) => e.quickPlanSectionId === section.id
        )
        const isActive = activeSectionId === section.id

        return (
          <div key={section.id} className="flex flex-col gap-1.5">
            {/* Section header */}
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-primary/15 border border-primary/30'
                  : 'bg-surface-container border border-transparent'
              }`}
              onClick={() => onSetActiveSection(section.id)}
            >
              {editingSectionId === section.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(section.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(section.id)
                  }}
                  className="flex-1 bg-transparent text-sm font-bold text-on-surface outline-none border-b border-primary"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`flex-1 text-sm font-bold ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                  {section.title}
                </span>
              )}

              {sectionExercises.length > 0 && (
                <span className="text-xs text-on-surface-variant">
                  {sectionExercises.length} תרגילים
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartEdit(section)
                }}
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label="ערוך כותרת"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveSection(section.id)
                }}
                className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-on-surface-variant hover:text-status-error hover:bg-status-error/10 transition-colors"
                aria-label="מחק כותרת"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Section exercises */}
            {sectionExercises.map((exercise) => {
              const setCount = exercise.customSetCount ?? 3

              return (
                <div
                  key={exercise.exerciseId}
                  className="flex items-center gap-2 rounded-xl bg-surface-container/60 px-3 py-2 mr-3"
                >
                  <button
                    type="button"
                    onClick={() => onRemoveExercise(exercise.exerciseId)}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:text-status-error hover:bg-status-error/10 transition-colors"
                    aria-label={`הסר ${exercise.exerciseNameHe}`}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <span className="flex-1 text-sm font-medium text-on-surface truncate">
                    {exercise.exerciseNameHe || exercise.exerciseName}
                  </span>

                  {/* Set count stepper */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSetCountChange(exercise.exerciseId, setCount - 1)}
                      disabled={setCount <= 1}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-elevated text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                      aria-label="הפחת סט"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-on-surface tabular-nums">
                      {setCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetCountChange(exercise.exerciseId, setCount + 1)}
                      disabled={setCount >= 20}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-surface-elevated text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
                      aria-label="הוסף סט"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Hint when section is active but empty */}
            {isActive && sectionExercises.length === 0 && (
              <div className="text-xs text-primary/70 text-center py-2 mr-3">
                בחר תרגילים מהרשימה למטה
              </div>
            )}
          </div>
        )
      })}

      {/* Add section input */}
      {isAddingSection ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSection()
              if (e.key === 'Escape') {
                setIsAddingSection(false)
                setNewSectionTitle('')
              }
            }}
            placeholder="כותרת הקבוצה (למשל: 3 סטים, EMOM 4 דקות...)"
            className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface text-sm placeholder:text-on-surface-variant border border-primary/30 outline-none focus:ring-2 focus:ring-primary/40"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddSection}
            disabled={!newSectionTitle.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-background-main text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            הוסף
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingSection(false)
              setNewSectionTitle('')
            }}
            className="px-3 py-2.5 rounded-xl text-on-surface-variant text-sm"
          >
            ביטול
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddingSection(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-on-surface-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-sm font-medium">+ הוספת כותרת</span>
        </button>
      )}

      {/* Summary */}
      {totalExercises > 0 && (
        <div className="text-xs text-on-surface-variant text-center mt-1">
          {totalExercises} תרגילים · {totalSets} סטים
        </div>
      )}
    </div>
  )
}
