import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Check, Home } from 'lucide-react'
import type { Exercise, MuscleGroup } from '../types'
import type { PrimaryMuscle } from '../types/muscles'
import { defaultMuscleMapping } from '../types/muscles'
import { exerciseService } from '../services'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '../utils'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import { getMuscles } from '@/lib/firebase/muscles'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '@/domains/workouts/types/active-workout.types'

// Equipment options
const equipmentOptions = [
  { id: 'all', label: 'הכל' },
  { id: 'barbell', label: 'מוט' },
  { id: 'dumbbell', label: 'משקולות' },
  { id: 'bodyweight', label: 'גוף' },
  { id: 'cable_machine', label: 'כבלים' },
  { id: 'machine', label: 'מכונה' },
  { id: 'pull_up_bar', label: 'מתח' },
]

// Helper functions
function getEquipmentHe(equipment: string): string {
  const map: Record<string, string> = {
    barbell: 'מוט ברזל',
    dumbbell: 'משקולות',
    bodyweight: 'משקל גוף',
    pull_up_bar: 'מתח',
    cable_machine: 'כבלים',
    kettlebell: 'קטלבל',
    machine: 'מכונה',
    bench: 'ספסל',
    resistance_band: 'גומייה',
  }
  return map[equipment] || equipment
}

function getSubMuscleHe(muscle: string): string {
  const map: Record<string, string> = {
    triceps: 'יד אחורית',
    biceps: 'יד קידמית',
    forearms: 'אמות',
    chest: 'חזה',
    lats: 'גב רחב',
    quadriceps: 'ארבע ראשי',
    hamstrings: 'ירך אחורי',
    glutes: 'ישבן',
    shoulders: 'כתפיים',
    calves: 'שוקיים',
    traps: 'טרפז',
    lower_back: 'גב תחתון',
    core: 'ליבה',
  }
  return map[muscle] || muscle
}

export function ExerciseLibrary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAddingToWorkout = searchParams.get('addToWorkout') === 'true'

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>(defaultMuscleMapping)
  const [loading, setLoading] = useState(true)
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<string>('all')
  const [selectedSubMuscle, setSelectedSubMuscle] = useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [imageModal, setImageModal] = useState<{ url: string; name: string } | null>(null)

  const { selectedExercises, addExercise, removeExercise, clearWorkout } = useWorkoutBuilderStore()

  useEffect(() => {
    loadData()
  }, [])

  // Reset sub-muscle when primary muscle changes
  useEffect(() => {
    setSelectedSubMuscle('all')
  }, [selectedPrimaryMuscle])

  const loadData = async () => {
    setLoading(true)
    try {
      const [exercisesData, musclesData] = await Promise.all([
        exerciseService.getExercises(),
        getMuscles(),
      ])
      setExercises(exercisesData)
      setMuscles(musclesData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get selected muscle name in Hebrew
  const selectedMuscleName = useMemo(() => {
    if (selectedPrimaryMuscle === 'all') return 'כל השרירים'
    const muscle = muscles.find(m => m.id === selectedPrimaryMuscle)
    return muscle?.nameHe || selectedPrimaryMuscle
  }, [selectedPrimaryMuscle, muscles])

  // Get sub-muscles for selected primary muscle
  const availableSubMuscles = useMemo(() => {
    if (selectedPrimaryMuscle === 'all') return []
    const primaryMuscle = muscles.find(m => m.id === selectedPrimaryMuscle)
    return primaryMuscle?.subMuscles || []
  }, [selectedPrimaryMuscle, muscles])

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // Primary muscle filter
      if (selectedPrimaryMuscle !== 'all') {
        const exercisePrimaryMuscle = ex.primaryMuscle || ex.category
        if (exercisePrimaryMuscle !== selectedPrimaryMuscle && ex.category !== selectedPrimaryMuscle) {
          return false
        }
      }

      // Sub-muscle filter
      if (selectedSubMuscle !== 'all') {
        if (ex.primaryMuscle !== selectedSubMuscle && !ex.secondaryMuscles.includes(selectedSubMuscle as MuscleGroup)) {
          return false
        }
      }

      // Equipment filter
      if (selectedEquipment !== 'all' && ex.equipment !== selectedEquipment) {
        return false
      }

      return true
    })
  }, [exercises, selectedPrimaryMuscle, selectedSubMuscle, selectedEquipment])

  const handleToggleExercise = (exercise: Exercise) => {
    const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.id)
    if (isSelected) {
      removeExercise(exercise.id)
    } else {
      addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        primaryMuscle: exercise.primaryMuscle || exercise.category,
      })
    }
  }

  const handleStartWorkout = () => {
    if (selectedExercises.length === 0) return

    if (isAddingToWorkout) {
      // Adding exercises to existing workout - DON'T clear localStorage!
      // The useActiveWorkout hook will merge the new exercises
      navigate('/workout/session')
    } else {
      // Starting fresh workout - clear any existing saved workout
      localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
      navigate('/workout/session')
    }
  }

  const handleImageClick = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation()
    if (exercise.imageUrl) {
      setImageModal({ url: exercise.imageUrl, name: exercise.nameHe })
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(isAddingToWorkout ? '/workout/session' : '/dashboard')}
              className="flex items-center gap-1 text-text-secondary hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-sm">{isAddingToWorkout ? 'חזרה לאימון' : 'חזור'}</span>
            </button>
            <h1 className="text-xl font-bold text-white">
              {isAddingToWorkout ? 'הוספת תרגילים לאימון' : 'בחירת תרגילים'}
            </h1>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="page-content" style={{ paddingBottom: '80px' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Muscle Title with Count */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              {selectedMuscleName} ({filteredExercises.length} תרגילים)
            </h2>
          </div>

          {/* Primary Muscle Filter */}
          <div className="mb-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedPrimaryMuscle('all')}
                className={selectedPrimaryMuscle === 'all' ? 'pill-active' : 'pill-default'}
              >
                הכל
              </button>
              {muscles.map((muscle) => (
                <button
                  key={muscle.id}
                  onClick={() => setSelectedPrimaryMuscle(muscle.id)}
                  className={selectedPrimaryMuscle === muscle.id ? 'pill-active' : 'pill-default'}
                >
                  <span>{muscle.icon}</span>
                  <span>{muscle.nameHe}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Muscle Filter */}
          {selectedPrimaryMuscle !== 'all' && availableSubMuscles.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedSubMuscle('all')}
                  className={selectedSubMuscle === 'all' ? 'pill-active' : 'pill-default'}
                >
                  הכל
                </button>
                {availableSubMuscles.map((subMuscle) => (
                  <button
                    key={subMuscle.id}
                    onClick={() => setSelectedSubMuscle(subMuscle.id)}
                    className={selectedSubMuscle === subMuscle.id ? 'pill-active' : 'pill-default'}
                  >
                    {subMuscle.nameHe}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Filter - Smaller font */}
          <div className="mb-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {equipmentOptions.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedEquipment === eq.id
                      ? 'bg-primary-main text-background-main'
                      : 'bg-background-card border border-border-default text-text-secondary hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-white mb-2">לא נמצאו תרגילים</h3>
              <p className="text-text-muted">נסה לשנות את הפילטרים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExercises.map((exercise) => {
                const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.id)
                return (
                  <div
                    key={exercise.id}
                    onClick={() => handleToggleExercise(exercise)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-main/10 border-2 border-primary-main'
                        : 'bg-background-card border border-border-default hover:border-border-light'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary-main'
                        : 'border-2 border-border-light'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-background-main" strokeWidth={3} />}
                    </div>

                    {/* Exercise Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{exercise.nameHe}</h3>
                      <p className="text-xs text-text-muted truncate">
                        {getSubMuscleHe(exercise.primaryMuscle)} • {getEquipmentHe(exercise.equipment)}
                      </p>
                    </div>

                    {/* Image */}
                    <div
                      onClick={(e) => handleImageClick(e, exercise)}
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-background-elevated"
                    >
                      <img
                        src={getExerciseImageUrl(exercise)}
                        alt={exercise.nameHe}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.onerror = null
                          target.src = EXERCISE_PLACEHOLDER_IMAGE
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 bg-background-main border-t border-border-default"
        style={{ padding: '12px 16px' }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Start Workout Button - Left side with orange glow */}
          <button
            onClick={handleStartWorkout}
            disabled={selectedExercises.length === 0}
            className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
              selectedExercises.length === 0
                ? 'bg-secondary-main text-text-disabled cursor-not-allowed'
                : 'bg-secondary-main border-2 border-accent-orange text-white shadow-glow-orange hover:scale-105'
            }`}
            style={selectedExercises.length > 0 ? {
              boxShadow: '0 4px 0 #0A0C10, 0 0 12px rgba(255, 107, 53, 0.5)'
            } : {}}
          >
            {isAddingToWorkout ? (
              <>
                <span>+</span>
                <span>הוסף לאימון</span>
              </>
            ) : (
              <>
                <Home className="w-5 h-5" />
                <span>התחל אימון</span>
              </>
            )}
          </button>

          {/* Selected Count - Right side */}
          <div className="flex items-center gap-4">
            {selectedExercises.length > 0 && (
              <button
                onClick={clearWorkout}
                className="text-status-error text-sm hover:underline"
              >
                נקה
              </button>
            )}
            <span className="text-white font-semibold">
              {selectedExercises.length > 0
                ? `${selectedExercises.length} תרגילים נבחרו`
                : 'בחר תרגילים'
              }
            </span>
          </div>
        </div>
      </footer>

      {/* Image Modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="max-w-lg w-full">
            <img
              src={imageModal.url}
              alt={imageModal.name}
              className="w-full rounded-xl"
            />
            <p className="text-white text-center mt-3 font-semibold">{imageModal.name}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExerciseLibrary
