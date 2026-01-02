import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Trash2, GripVertical, Plus, Minus, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useWorkoutBuilderStore } from '../store'
import type { SetType } from '../types'

export default function WorkoutBuilder() {
  const navigate = useNavigate()
  const {
    workoutName,
    setWorkoutName,
    selectedExercises,
    removeExercise,
    reorderExercise,
    addSet,
    removeSet,
    updateSet,
    updateRestTime,
    clearWorkout,
  } = useWorkoutBuilderStore()

  const [expandedExercise, setExpandedExercise] = useState<string | null>(
    selectedExercises.length > 0 ? selectedExercises[0].exerciseId : null
  )
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Redirect to exercise library if no exercises selected
  if (selectedExercises.length === 0) {
    return (
      <div className="min-h-screen bg-neon-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className="text-6xl mb-6 block">💪</span>
          <h2 className="text-2xl font-bold text-white mb-4">אין תרגילים נבחרים</h2>
          <p className="text-neon-gray-400 mb-6">התחל בבחירת תרגילים מהספרייה כדי לבנות את האימון שלך</p>
          <button
            onClick={() => navigate('/exercises')}
            className="bg-neon-gradient text-neon-dark px-6 py-3 rounded-xl font-semibold hover:shadow-neon-cyan/30 hover:shadow-lg transition-all"
          >
            לספריית התרגילים
          </button>
        </div>
      </div>
    )
  }

  const handleStartWorkout = () => {
    // Store workout data in session and navigate
    navigate('/workout/session')
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderExercise(draggedIndex, index)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const setTypeLabels: Record<SetType, string> = {
    warmup: 'חימום',
    working: 'עבודה',
    dropset: 'דרופ',
    superset: 'סופרסט',
    amrap: 'AMRAP',
  }

  return (
    <div className="min-h-screen bg-neon-dark pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neon-dark/95 backdrop-blur-sm border-b border-neon-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/exercises')}
              className="p-2 text-neon-gray-400 hover:text-white hover:bg-neon-gray-800 rounded-lg transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">בניית אימון</h1>
              <p className="text-neon-gray-400 text-sm">{selectedExercises.length} תרגילים נבחרו</p>
            </div>
            <button
              onClick={() => navigate('/exercises')}
              className="px-3 py-2 bg-neon-gray-800 hover:bg-neon-gray-700 text-white rounded-lg text-sm transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              הוסף תרגיל
            </button>
          </div>

          {/* Workout Name Input */}
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="שם האימון (אופציונלי)"
            className="w-full px-4 py-3 bg-neon-gray-800 border border-neon-gray-700 rounded-xl text-white placeholder-neon-gray-500 focus:outline-none focus:border-neon-cyan transition-colors"
          />
        </div>
      </div>

      {/* Exercise List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {selectedExercises.map((exercise, index) => (
          <div
            key={exercise.exerciseId}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-neon-gray-800 rounded-xl overflow-hidden transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            }`}
          >
            {/* Exercise Header */}
            <div
              className="p-4 cursor-pointer flex items-center gap-3"
              onClick={() => setExpandedExercise(expandedExercise === exercise.exerciseId ? null : exercise.exerciseId)}
            >
              <div className="cursor-grab hover:bg-neon-gray-700 p-1 rounded">
                <GripVertical className="w-5 h-5 text-neon-gray-500" />
              </div>

              <div className="w-12 h-12 rounded-lg bg-neon-gray-700 overflow-hidden flex-shrink-0">
                {exercise.imageUrl ? (
                  <img
                    src={exercise.imageUrl}
                    alt={exercise.exerciseNameHe}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">💪</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{exercise.exerciseNameHe}</h3>
                <p className="text-neon-gray-400 text-sm">
                  {exercise.sets.length} סטים
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeExercise(exercise.exerciseId)
                }}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {expandedExercise === exercise.exerciseId ? (
                <ChevronUp className="w-5 h-5 text-neon-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neon-gray-400" />
              )}
            </div>

            {/* Expanded Content - Sets Configuration */}
            {expandedExercise === exercise.exerciseId && (
              <div className="px-4 pb-4 border-t border-neon-gray-700">
                {/* Rest Time */}
                <div className="py-3 flex items-center justify-between border-b border-neon-gray-700">
                  <span className="text-neon-gray-400 text-sm">זמן מנוחה בין סטים</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateRestTime(exercise.exerciseId, Math.max(15, exercise.restTime - 15))}
                      className="w-8 h-8 bg-neon-gray-700 hover:bg-neon-gray-600 rounded-lg flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-16 text-center text-white font-medium">{exercise.restTime}s</span>
                    <button
                      onClick={() => updateRestTime(exercise.exerciseId, Math.min(300, exercise.restTime + 15))}
                      className="w-8 h-8 bg-neon-gray-700 hover:bg-neon-gray-600 rounded-lg flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Sets Table Header */}
                <div className="grid grid-cols-12 gap-2 py-3 text-neon-gray-400 text-xs font-medium">
                  <div className="col-span-2 text-center">סט</div>
                  <div className="col-span-3 text-center">סוג</div>
                  <div className="col-span-3 text-center">חזרות</div>
                  <div className="col-span-3 text-center">משקל (ק"ג)</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Sets */}
                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className="grid grid-cols-12 gap-2 items-center py-2 border-t border-neon-gray-700/50"
                  >
                    <div className="col-span-2 text-center">
                      <span className="text-white font-medium">{setIndex + 1}</span>
                    </div>
                    <div className="col-span-3">
                      <select
                        value={set.type}
                        onChange={(e) => updateSet(exercise.exerciseId, setIndex, { type: e.target.value as SetType })}
                        className="w-full px-2 py-1.5 bg-neon-gray-700 border border-neon-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan"
                      >
                        {Object.entries(setTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={set.targetReps || ''}
                        onChange={(e) => updateSet(exercise.exerciseId, setIndex, { targetReps: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 bg-neon-gray-700 border border-neon-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-neon-cyan"
                        min="0"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={set.targetWeight || ''}
                        onChange={(e) => updateSet(exercise.exerciseId, setIndex, { targetWeight: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 bg-neon-gray-700 border border-neon-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:border-neon-cyan"
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeSet(exercise.exerciseId, setIndex)}
                        disabled={exercise.sets.length <= 1}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Set Button */}
                <button
                  onClick={() => addSet(exercise.exerciseId)}
                  className="w-full mt-3 py-2 bg-neon-gray-700 hover:bg-neon-gray-600 text-neon-cyan rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  הוסף סט
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-neon-gray-900/95 backdrop-blur-sm border-t border-neon-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={clearWorkout}
              className="px-4 py-2.5 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors"
            >
              נקה הכל
            </button>
            <button
              onClick={handleStartWorkout}
              className="flex-1 max-w-xs bg-neon-gradient text-neon-dark py-3 rounded-xl font-semibold hover:shadow-neon-cyan/30 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              התחל אימון
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
