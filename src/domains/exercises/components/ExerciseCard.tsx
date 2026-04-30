import { useState, useEffect } from 'react'
import type { Exercise } from '../types'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '../utils'
import { getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import { getMuscleNameHe, getCategoryNameHe } from '@/utils/muscleTranslations'
import { Check, Plus } from 'lucide-react'

// Cache the mapping to avoid repeated Firebase calls
let cachedMuscleNames: Record<string, string> | null = null
let loadingPromise: Promise<Record<string, string>> | null = null

async function loadMuscleNames(): Promise<Record<string, string>> {
  if (cachedMuscleNames) return cachedMuscleNames
  if (loadingPromise) return loadingPromise

  loadingPromise = getMuscleIdToNameHeMap().then((mapping) => {
    cachedMuscleNames = mapping
    return mapping
  }).catch((error) => {
    console.error('Failed to load muscle names:', error)
    return {}
  })

  return loadingPromise
}

interface ExerciseCardProps {
  exercise: Exercise
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const { addExercise, removeExercise, selectedExercises } = useWorkoutBuilderStore()
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})

  // Load dynamic muscle names on mount
  useEffect(() => {
    loadMuscleNames().then(setDynamicMuscleNames)
  }, [])

  const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.id)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelected) {
      removeExercise(exercise.id)
    } else {
      addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        videoWebpUrl: exercise.videoWebpUrl,
        primaryMuscle: exercise.primaryMuscle || exercise.category,
        category: exercise.category,
        equipment: exercise.equipment,
        complexity: exercise.complexity,
        reportType: exercise.reportType,
        assistanceTypes: exercise.assistanceTypes,   // Pass assistance options
        availableBands: exercise.availableBands,     // Pass available bands
      })
    }
  }

  // Difficulty stars
  const difficultyStars = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  }
  const stars = difficultyStars[exercise.difficulty]

  return (
    <div
      onClick={handleToggle}
      className={`card-exercise ${isSelected ? 'selected' : ''}`}
    >
      {/* Selection Badge */}
      {isSelected && (
        <div className="selection-badge">
          <Check className="w-5 h-5 text-neon-dark" strokeWidth={3} />
        </div>
      )}

      {/* Exercise Image */}
      <div className="image-container h-36 sm:h-44">
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

        {/* Gradient overlay */}
        <div className="image-overlay" />

        {/* Difficulty Stars - Top Right */}
        <div className="stars-container">
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= stars ? 'star-active' : 'star-inactive'}>
              ★
            </span>
          ))}
        </div>

        {/* Category Badge - Bottom */}
        <div className="absolute bottom-3 right-3">
          <span className="badge-category">{getCategoryNameHe(exercise.category, dynamicMuscleNames)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Exercise Name */}
        <h3 className="text-lg font-bold text-white mb-1 leading-tight">{exercise.nameHe}</h3>
        <p className="text-neon-gray-400 text-sm mb-3">{exercise.name}</p>

        {/* Primary Muscles */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="badge-muscle-primary">{getMuscleNameHe(exercise.primaryMuscle, dynamicMuscleNames)}</span>
          {exercise.secondaryMuscles.slice(0, 2).map((muscle) => (
            <span key={muscle} className="badge-muscle-secondary">
              {getMuscleNameHe(muscle, dynamicMuscleNames)}
            </span>
          ))}
        </div>

        {/* Equipment */}
        <div className="flex items-center gap-2 text-neon-gray-400 text-sm mb-4">
          <span className="text-base">{getEquipmentEmoji(exercise.equipment)}</span>
          <span>{getEquipmentHe(exercise.equipment)}</span>
        </div>

        {/* Add Button */}
        <button
          onClick={handleToggle}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isSelected
              ? 'bg-neon-cyan text-neon-dark'
              : 'bg-neon-gray-700 hover:bg-neon-gray-600 text-white'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-5 h-5" />
              נבחר
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              הוסף לאימון
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Helper functions for Hebrew translations (equipment only - muscles use central utility)

function getEquipmentHe(equipment: string): string {
  const map: Record<string, string> = {
    barbell: 'מוט ברזל',
    dumbbell: 'משקולות יד',
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

function getEquipmentEmoji(equipment: string): string {
  const map: Record<string, string> = {
    barbell: '🏋️',
    dumbbell: '💪',
    bodyweight: '🤸',
    pull_up_bar: '🔩',
    cable_machine: '⚙️',
    kettlebell: '🔔',
    machine: '🎰',
    bench: '🪑',
    resistance_band: '🔗',
  }
  return map[equipment] || '💪'
}

export default ExerciseCard
