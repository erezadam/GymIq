/**
 * ExerciseSetCard
 * Card component for displaying an exercise set in the user-facing UI
 */

import { Layers, Check } from 'lucide-react'
import type { ExerciseSet } from '../types/exerciseSet.types'

const difficultyLabels: Record<string, { label: string; className: string }> = {
  beginner: { label: 'מתחילים', className: 'bg-green-500/20 text-green-400' },
  intermediate: { label: 'בינוני', className: 'bg-yellow-500/20 text-yellow-400' },
  advanced: { label: 'מתקדמים', className: 'bg-orange-500/20 text-orange-400' },
}

interface ExerciseSetCardProps {
  exerciseSet: ExerciseSet
  onSelect: (exerciseIds: string[]) => void
  allSelected: boolean
  newCount: number // how many exercises will be added (not already selected)
}

export default function ExerciseSetCard({
  exerciseSet,
  onSelect,
  allSelected,
  newCount,
}: ExerciseSetCardProps) {
  const diff = difficultyLabels[exerciseSet.difficulty] || difficultyLabels.beginner

  return (
    <div className="flex-shrink-0 w-40 rounded-xl bg-background-card border border-border-default overflow-hidden">
      {/* Image */}
      {exerciseSet.setImage ? (
        <img
          src={exerciseSet.setImage}
          alt={exerciseSet.name}
          className="w-full h-20 object-cover"
        />
      ) : (
        <div className="w-full h-20 bg-background-elevated flex items-center justify-center">
          <Layers className="w-8 h-8 text-text-muted" />
        </div>
      )}

      {/* Info */}
      <div className="p-2.5">
        <h4 className="text-sm font-semibold text-white truncate">{exerciseSet.name}</h4>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diff.className}`}>
            {diff.label}
          </span>
          <span className="text-[10px] text-text-muted">
            {exerciseSet.exerciseIds.length} תרגילים
          </span>
        </div>

        {/* Select button */}
        <button
          type="button"
          onClick={() => onSelect(exerciseSet.exerciseIds)}
          disabled={allSelected}
          className={`w-full mt-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            allSelected
              ? 'bg-primary-main/20 text-primary-main cursor-default'
              : 'bg-primary-main/10 text-primary-main hover:bg-primary-main/20'
          }`}
        >
          {allSelected ? (
            <span className="flex items-center justify-center gap-1">
              <Check className="w-3 h-3" />
              נבחרו
            </span>
          ) : (
            `בחר סט (${newCount})`
          )}
        </button>
      </div>
    </div>
  )
}
