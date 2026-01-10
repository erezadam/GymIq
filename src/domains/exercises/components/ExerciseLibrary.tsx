import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Check, Home, Calendar } from 'lucide-react'
import type { Exercise, MuscleGroup } from '../types'
import type { PrimaryMuscle } from '../types/muscles'
import { defaultMuscleMapping } from '../types/muscles'
import { exerciseService } from '../services'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '../utils'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import { getMuscles, getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import { getEquipment } from '@/lib/firebase/equipment'
import { MuscleIcon } from '@/shared/components/MuscleIcon'
import { saveWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '@/domains/workouts/types/active-workout.types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'

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
  const { user } = useAuthStore()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>(defaultMuscleMapping)
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})
  const [equipmentOptions, setEquipmentOptions] = useState<{ id: string; label: string }[]>([
    { id: 'all', label: 'הכל' },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<string>('all')
  const [selectedSubMuscle, setSelectedSubMuscle] = useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [imageModal, setImageModal] = useState<{ url: string; name: string } | null>(null)

  const { selectedExercises, addExercise, removeExercise, clearWorkout, scheduledDate, setScheduledDate } = useWorkoutBuilderStore()

  // Helper: Check if selected date is in the future
  const isPlannedWorkout = useMemo(() => {
    if (!scheduledDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(scheduledDate)
    selected.setHours(0, 0, 0, 0)
    return selected > today
  }, [scheduledDate])

  // Helper: Format date for input
  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  // Helper: Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0]
  }

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
      const [exercisesData, musclesData, muscleNamesMapping, equipmentData] = await Promise.all([
        exerciseService.getExercises(),
        getMuscles(),
        getMuscleIdToNameHeMap(),
        getEquipment(),
      ])
      setExercises(exercisesData)
      setMuscles(musclesData)
      setDynamicMuscleNames(muscleNamesMapping)

      // Set equipment options from Firebase
      setEquipmentOptions([
        { id: 'all', label: 'הכל' },
        ...equipmentData.map((eq) => ({ id: eq.id, label: eq.nameHe })),
      ])
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
        category: exercise.category,
        equipment: exercise.equipment,
        reportType: exercise.reportType,
      })
    }
  }

  const handleStartWorkout = async () => {
    if (selectedExercises.length === 0) return

    if (isAddingToWorkout) {
      // Adding exercises to existing workout - DON'T clear localStorage!
      // The useActiveWorkout hook will merge the new exercises
      navigate('/workout/session')
      return
    }

    // Check if this is a planned workout (future date)
    if (isPlannedWorkout && scheduledDate && user) {
      setSaving(true)
      try {
        // Create planned workout entry
        const plannedWorkout: Omit<WorkoutHistoryEntry, 'id'> = {
          userId: user.uid,
          name: 'אימון מתוכנן',
          date: scheduledDate,
          startTime: scheduledDate,
          endTime: scheduledDate,
          duration: 0,
          status: 'planned',
          exercises: selectedExercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName || '',
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl || '',
            isCompleted: false,
            sets: [
              {
                type: 'working' as const,
                targetReps: 10,
                targetWeight: 0,
                actualReps: 0,
                actualWeight: 0,
                completed: false,
              }
            ],
          })),
          completedExercises: 0,
          totalExercises: selectedExercises.length,
          completedSets: 0,
          totalSets: selectedExercises.length,
          totalVolume: 0,
          personalRecords: 0,
        }

        await saveWorkoutHistory(plannedWorkout)
        clearWorkout()
        setScheduledDate(null)
        navigate('/workout/history')
      } catch (error) {
        console.error('Failed to save planned workout:', error)
      } finally {
        setSaving(false)
      }
      return
    }

    // Starting fresh workout today - clear any existing saved workout
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
    navigate('/workout/session')
  }

  const handleImageClick = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation()
    if (exercise.imageUrl) {
      setImageModal({ url: exercise.imageUrl, name: exercise.nameHe })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <header style={{ flexShrink: 0, marginBottom: 16 }}>
        <div className="max-w-2xl mx-auto">
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

          {/* Date Picker - Simple row under title */}
          {!isAddingToWorkout && (
            <div className="flex items-center gap-2 mt-3 bg-background-card border border-border-default rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <span className="text-sm text-text-secondary">בחר תאריך לאימון:</span>
              <input
                type="date"
                min={getMinDate()}
                value={formatDateForInput(scheduledDate) || getMinDate()}
                onChange={(e) => {
                  if (e.target.value) {
                    const selectedDate = new Date(e.target.value)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    selectedDate.setHours(0, 0, 0, 0)
                    // If today is selected, set to null (default)
                    if (selectedDate.getTime() === today.getTime()) {
                      setScheduledDate(null)
                    } else {
                      setScheduledDate(selectedDate)
                    }
                  }
                }}
                className="flex-1 bg-transparent border-none text-white text-sm cursor-pointer focus:outline-none"
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: '100px' }}>
        <div className="max-w-2xl mx-auto">
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
                  <MuscleIcon icon={muscle.icon} size={20} />
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
                        {dynamicMuscleNames[exercise.primaryMuscle] || getSubMuscleHe(exercise.primaryMuscle)} • {getEquipmentHe(exercise.equipment)}
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
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Start Workout Button - Left side with orange glow */}
            <button
              onClick={handleStartWorkout}
              disabled={selectedExercises.length === 0 || saving}
              className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                selectedExercises.length === 0 || saving
                  ? 'bg-secondary-main text-text-disabled cursor-not-allowed'
                  : isPlannedWorkout
                    ? 'bg-workout-status-planned text-white hover:scale-105'
                    : 'bg-secondary-main border-2 border-accent-orange text-white shadow-glow-orange hover:scale-105'
              }`}
              style={selectedExercises.length > 0 && !isPlannedWorkout && !saving ? {
                boxShadow: '0 4px 0 #0A0C10, 0 0 12px rgba(255, 107, 53, 0.5)'
              } : {}}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>שומר...</span>
                </>
              ) : isAddingToWorkout ? (
                <>
                  <span>+</span>
                  <span>הוסף לאימון</span>
                </>
              ) : isPlannedWorkout ? (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>שמור לתוכנית</span>
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
                  onClick={() => {
                    clearWorkout()
                    setScheduledDate(null)
                  }}
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
