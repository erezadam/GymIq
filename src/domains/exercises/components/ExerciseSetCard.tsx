/**
 * ExerciseSetCard
 * Card component for displaying an exercise set in the user-facing UI
 * Tap grid to expand, tap button to select set
 */

import { useState } from 'react'
import { Layers, Check, X } from 'lucide-react'
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
  const [showPreview, setShowPreview] = useState(false)
  const diff = difficultyLabels[exerciseSet.difficulty] || difficultyLabels.beginner
  const images = exerciseSet.exerciseImages?.length === 4
    ? exerciseSet.exerciseImages
    : null

  return (
    <>
      <div className="flex-shrink-0 w-40 rounded-xl bg-background-card border border-border-default overflow-hidden">
        {/* 2x2 Image Grid - tap to expand */}
        {images ? (
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="grid grid-cols-2 w-full"
          >
            {images.map((url, i) => (
              <div key={i} className="aspect-square bg-background-elevated overflow-hidden">
                <img
                  src={url}
                  alt={`תרגיל ${i + 1}`}
                  className="w-full h-full object-contain object-center"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src =
                      '/images/exercise-placeholder.svg'
                  }}
                />
              </div>
            ))}
          </button>
        ) : exerciseSet.setImage ? (
          <img
            src={exerciseSet.setImage}
            alt={exerciseSet.name}
            className="w-full h-20 object-contain bg-black/40"
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

      {/* Fullscreen Preview Modal */}
      {showPreview && images && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">{exerciseSet.name}</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-2 text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden">
              {images.map((url, i) => (
                <div key={i} className="aspect-square bg-background-elevated rounded-lg overflow-hidden">
                  <img
                    src={url}
                    alt={`תרגיל ${i + 1}`}
                    className="w-full h-full object-contain object-center"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        '/images/exercise-placeholder.svg'
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 justify-center">
              <span className={`text-xs px-2 py-0.5 rounded-full ${diff.className}`}>
                {diff.label}
              </span>
              <span className="text-xs text-text-muted">
                {exerciseSet.exerciseIds.length} תרגילים
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
