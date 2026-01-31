/**
 * RecommendedSets
 * Collapsible section showing recommended exercise sets for the user
 */

import { useState, useEffect } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import { getActiveExerciseSets } from '@/lib/firebase/exerciseSets'
import type { ExerciseSet } from '../types/exerciseSet.types'
import ExerciseSetCard from './ExerciseSetCard'

interface RecommendedSetsProps {
  muscleGroup?: string // filter by muscle group ('all' or undefined = show all)
  onSelectSet: (exerciseIds: string[]) => void
  selectedExerciseIds: string[] // currently selected exercise IDs
}

export default function RecommendedSets({
  muscleGroup,
  onSelectSet,
  selectedExerciseIds,
}: RecommendedSetsProps) {
  const [sets, setSets] = useState<ExerciseSet[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadSets()
  }, [])

  const loadSets = async () => {
    try {
      const data = await getActiveExerciseSets()
      setSets(data)
    } catch (error) {
      console.error('Error loading recommended sets:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter sets by muscle group
  const filteredSets =
    muscleGroup && muscleGroup !== 'all'
      ? sets.filter((s) => s.muscleGroup === muscleGroup)
      : sets

  // Don't render if no sets available
  if (loading || filteredSets.length === 0) return null

  const selectedSet = new Set(selectedExerciseIds)

  return (
    <div className="mb-4">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 text-text-secondary hover:text-white transition-colors"
      >
        <Layers className="w-4 h-4 text-primary-main flex-shrink-0" />
        <span className="text-sm font-medium">
          סטים מומלצים ({filteredSets.length})
        </span>
        <ChevronDown
          className={`w-4 h-4 mr-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Cards - horizontal scroll */}
      {expanded && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide mt-1">
          {filteredSets.map((exerciseSet) => {
            const newCount = exerciseSet.exerciseIds.filter(
              (id) => !selectedSet.has(id)
            ).length
            const allSelected = newCount === 0

            return (
              <ExerciseSetCard
                key={exerciseSet.id}
                exerciseSet={exerciseSet}
                onSelect={onSelectSet}
                allSelected={allSelected}
                newCount={newCount}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
