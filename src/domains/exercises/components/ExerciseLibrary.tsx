import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ChevronLeft, Dumbbell, Calendar } from 'lucide-react'
import type { Exercise, MuscleGroup } from '../types'
import type { PrimaryMuscle } from '../types/muscles'
import { defaultMuscleMapping } from '../types/muscles'
import { exerciseService } from '../services'
import { ExerciseCard } from './ExerciseCard'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import { getMuscles } from '@/lib/firebase/muscles'
import { saveWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'

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

export function ExerciseLibrary() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>(defaultMuscleMapping)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<string>('all')
  const [selectedSubMuscle, setSelectedSubMuscle] = useState<string>('all')
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const { selectedExercises, clearWorkout, setScheduledDate: setStoreDate } = useWorkoutBuilderStore()

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0]

  // Check if selected date is in the future
  const isPlannedWorkout = (): boolean => {
    if (!scheduledDate) return false
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const selected = new Date(scheduledDate)
    selected.setHours(0, 0, 0, 0)
    return selected > todayDate
  }

  // Format date for display (DD/MM/YYYY)
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

  // Get sub-muscles for selected primary muscle
  const availableSubMuscles = useMemo(() => {
    if (selectedPrimaryMuscle === 'all') return []
    const primaryMuscle = muscles.find(m => m.id === selectedPrimaryMuscle)
    return primaryMuscle?.subMuscles || []
  }, [selectedPrimaryMuscle, muscles])

  // Filter exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !ex.name.toLowerCase().includes(query) &&
          !ex.nameHe.includes(searchQuery)
        ) {
          return false
        }
      }

      // Primary muscle filter - check category or primaryMuscle
      if (selectedPrimaryMuscle !== 'all') {
        // Map category to primary muscle for filtering
        const exercisePrimaryMuscle = ex.primaryMuscle || ex.category
        if (exercisePrimaryMuscle !== selectedPrimaryMuscle && ex.category !== selectedPrimaryMuscle) {
          return false
        }
      }

      // Sub-muscle filter
      if (selectedSubMuscle !== 'all') {
        // Check if the sub-muscle is in secondary muscles or matches primary
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
  }, [exercises, searchQuery, selectedPrimaryMuscle, selectedSubMuscle, selectedEquipment])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedPrimaryMuscle('all')
    setSelectedSubMuscle('all')
    setSelectedEquipment('all')
  }

  const hasActiveFilters = selectedPrimaryMuscle !== 'all' || selectedSubMuscle !== 'all' || selectedEquipment !== 'all' || searchQuery

  const handleContinue = async () => {
    if (selectedExercises.length === 0 || !user?.uid) return

    const isPlanned = isPlannedWorkout()

    if (isPlanned) {
      // Save as planned workout to Firebase
      setIsSaving(true)
      try {
        const workoutDate = new Date(scheduledDate)

        await saveWorkoutHistory({
          userId: user.uid,
          name: 'אימון מתוכנן',
          date: workoutDate,
          startTime: workoutDate,
          endTime: workoutDate,
          duration: 0,
          status: 'planned',
          exercises: selectedExercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            isCompleted: false,
            sets: ex.sets.map(set => ({
              type: set.type,
              targetReps: set.targetReps || 10,
              targetWeight: set.targetWeight || 0,
              actualReps: 0,
              actualWeight: 0,
              completed: false,
            })),
          })),
          completedExercises: 0,
          totalExercises: selectedExercises.length,
          completedSets: 0,
          totalSets: selectedExercises.reduce((sum, ex) => sum + ex.sets.length, 0),
          totalVolume: 0,
          personalRecords: 0,
        })

        // Show toast and navigate to workout planning
        alert(`האימון נשמר לתאריך ${formatDateDisplay(scheduledDate)}`)
        clearWorkout()
        navigate('/workout-history')
      } catch (error) {
        console.error('Failed to save planned workout:', error)
        alert('שגיאה בשמירת האימון')
      } finally {
        setIsSaving(false)
      }
    } else {
      // Today or no date selected - navigate to active workout
      if (scheduledDate) {
        setStoreDate(new Date(scheduledDate))
      }
      navigate('/workout/session')
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          {/* Title Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="btn-icon">
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">ספריית תרגילים</h1>
                <p className="text-neon-gray-400 text-sm">בחר תרגילים לאימון שלך</p>
              </div>
            </div>

            {/* Selected Counter */}
            {selectedExercises.length > 0 && (
              <div className="counter-badge">
                <Dumbbell className="w-5 h-5 text-neon-cyan" />
                <span className="text-neon-cyan font-bold">{selectedExercises.length}</span>
                <span className="text-neon-cyan/80 text-sm">נבחרו</span>
              </div>
            )}
          </div>

          {/* Date Picker Field */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-neon-gray-400 text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span>תאריך לאימון (אופציונלי)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={today}
                className="w-full px-4 py-3 bg-neon-gray-800/50 border border-neon-gray-700 rounded-xl text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
              {scheduledDate && (
                <button
                  onClick={() => setScheduledDate('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-neon-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {scheduledDate && (
              <p className="text-xs mt-1 text-neon-gray-500">
                {isPlannedWorkout()
                  ? `📅 אימון מתוכנן ל-${formatDateDisplay(scheduledDate)}`
                  : `▶️ אימון להיום`
                }
              </p>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש תרגיל..."
              className="input-search"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-gray-500" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-neon-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter: Primary Muscle */}
          <div className="mb-3">
            <p className="text-neon-gray-500 text-xs mb-2">שריר מרכזי</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

          {/* Filter: Sub-Muscle (only show if primary muscle selected) */}
          {selectedPrimaryMuscle !== 'all' && availableSubMuscles.length > 0 && (
            <div className="mb-3">
              <p className="text-neon-gray-500 text-xs mb-2">תת שריר</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

          {/* Filter: Equipment */}
          <div className="mb-2">
            <p className="text-neon-gray-500 text-xs mb-2">סוג מכשיר</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {equipmentOptions.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={selectedEquipment === eq.id ? 'pill-active' : 'pill-default'}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-2">
              <button onClick={resetFilters} className="btn-danger text-sm flex items-center gap-1">
                <X className="w-4 h-4" />
                נקה סינון
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="content-container py-3">
        <p className="text-neon-gray-400 text-sm">
          {loading ? 'טוען...' : `${filteredExercises.length} תרגילים`}
        </p>
      </div>

      {/* Exercise Grid */}
      <div className="content-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <h3 className="empty-state-title">לא נמצאו תרגילים</h3>
            <p className="empty-state-text">נסה לשנות את הפילטרים או החיפוש</p>
            <button onClick={resetFilters} className="text-neon-cyan hover:underline">
              נקה את כל הפילטרים
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          <div className="flex items-center gap-4">
            {/* Selected Info */}
            <div className="flex-1 min-w-0">
              {selectedExercises.length > 0 ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Thumbnails */}
                  <div className="thumbnail-stack">
                    {selectedExercises.slice(0, 3).map((ex, i) => (
                      <div key={ex.exerciseId} className="thumbnail" style={{ zIndex: 3 - i }}>
                        {ex.imageUrl ? (
                          <img src={ex.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm sm:text-lg">💪</div>
                        )}
                      </div>
                    ))}
                    {selectedExercises.length > 3 && (
                      <div className="thumbnail flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                        +{selectedExercises.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm sm:text-base truncate">
                      <span className="xs:hidden">{selectedExercises.length}</span>
                      <span className="hidden xs:inline">{selectedExercises.length} תרגילים נבחרו</span>
                    </p>
                    <button onClick={clearWorkout} className="text-red-400 hover:text-red-300 text-xs sm:text-sm">
                      נקה
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-neon-gray-400 text-sm sm:text-base">בחר תרגילים</p>
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={selectedExercises.length === 0 || isSaving}
              className={`px-4 sm:px-8 py-3.5 rounded-xl font-bold text-base sm:text-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedExercises.length === 0 || isSaving
                  ? 'bg-neon-gray-700 text-neon-gray-500 cursor-not-allowed'
                  : isPlannedWorkout()
                    ? 'bg-workout-status-planned text-white hover:shadow-lg hover:shadow-red-500/30 hover:scale-105'
                    : 'bg-neon-gradient text-neon-dark hover:shadow-lg hover:shadow-neon-cyan/30 hover:scale-105'
              }`}
            >
              {isSaving ? (
                <span>שומר...</span>
              ) : isPlannedWorkout() ? (
                <>
                  <Calendar className="w-5 h-5" />
                  <span className="hidden sm:inline">שמור אימון מתוכנן ({selectedExercises.length})</span>
                  <span className="sm:hidden">שמור ({selectedExercises.length})</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">התחל להתאמן ({selectedExercises.length} תרגילים)</span>
                  <span className="sm:hidden">התחל ({selectedExercises.length})</span>
                  <ChevronLeft className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExerciseLibrary
