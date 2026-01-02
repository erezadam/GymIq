/**
 * Set Row Components
 * CompletedSetRow, ActiveSetCard, UpcomingSetRow
 */

import { useState } from 'react'
import { Check, Info, Minus, Plus } from 'lucide-react'
import type { PlannedSet, CompletedSet, SetInputValues } from '../../types/workout-session.types'

// Set type labels in Hebrew
const setTypeLabels: Record<string, string> = {
  warmup: 'סט חימום',
  working: 'סט רגיל',
  dropset: 'דרופסט',
  superset: 'סופרסט',
  amrap: 'AMRAP',
}

// ============================================
// Completed Set Row
// ============================================
interface CompletedSetRowProps {
  set: CompletedSet
}

export function CompletedSetRow({ set }: CompletedSetRowProps) {
  return (
    <div className="set-row-completed">
      <div className="set-row-fields">
        {set.actualRIR !== undefined && (
          <div className="set-row-field">
            <span className="text-neon-gray-400 text-xs">RIR</span>
            <span className="text-white font-medium">{set.actualRIR}</span>
          </div>
        )}
        <div className="set-row-divider" />
        <div className="set-row-field">
          <span className="text-neon-gray-400 text-xs">חזרות</span>
          <span className="text-white font-medium">{set.actualReps}</span>
        </div>
        <div className="set-row-divider" />
        <div className="set-row-field">
          <span className="text-neon-gray-400 text-xs">משקל</span>
          <span className="text-white font-medium">{set.actualWeight}kg</span>
        </div>
      </div>
      <div className="set-row-badge completed">
        <Check className="w-3 h-3" />
      </div>
    </div>
  )
}

// ============================================
// Active Set Card
// ============================================
interface ActiveSetCardProps {
  set: PlannedSet
  onComplete: (values: SetInputValues) => void
}

export function ActiveSetCard({ set, onComplete }: ActiveSetCardProps) {
  const targetReps = typeof set.targetReps === 'object'
    ? `${set.targetReps.min} - ${set.targetReps.max}`
    : set.targetReps.toString()

  const defaultReps = typeof set.targetReps === 'object'
    ? Math.floor((set.targetReps.min + set.targetReps.max) / 2)
    : set.targetReps

  const [values, setValues] = useState<SetInputValues>({
    reps: defaultReps,
    weight: set.targetWeight || 0,
    rir: set.targetRIR,
  })

  const updateValue = (field: keyof SetInputValues, delta: number) => {
    setValues((prev) => ({
      ...prev,
      [field]: Math.max(0, (prev[field] || 0) + delta),
    }))
  }

  const handleComplete = () => {
    onComplete(values)
  }

  return (
    <div className="active-set-card">
      {/* Set Type Header */}
      <div className="active-set-header">
        <span className="text-white text-sm">סוג הסט: {setTypeLabels[set.setType] || set.setType}</span>
        <Info className="w-4 h-4 text-neon-cyan cursor-pointer" />
      </div>

      {/* Input Fields */}
      <div className="active-set-fields">
        {/* RIR Input */}
        {set.targetRIR !== undefined && (
          <div className="active-set-field">
            <span className="text-neon-gray-400 text-xs mb-1">RIR</span>
            <div className="active-set-input-group">
              <button
                onClick={() => updateValue('rir', -1)}
                className="active-set-btn"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="active-set-value">{values.rir ?? '-'}</span>
              <button
                onClick={() => updateValue('rir', 1)}
                className="active-set-btn"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-neon-gray-500 text-xs">({set.targetRIR})</span>
          </div>
        )}

        <div className="active-set-divider" />

        {/* Reps Input */}
        <div className="active-set-field">
          <span className="text-neon-gray-400 text-xs mb-1">חזרות</span>
          <div className="active-set-input-group">
            <button
              onClick={() => updateValue('reps', -1)}
              className="active-set-btn"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="active-set-value">{values.reps}</span>
            <button
              onClick={() => updateValue('reps', 1)}
              className="active-set-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-neon-gray-500 text-xs">({targetReps})</span>
        </div>

        <div className="active-set-divider" />

        {/* Weight Input */}
        <div className="active-set-field">
          <span className="text-neon-gray-400 text-xs mb-1">משקל</span>
          <div className="active-set-input-group">
            <button
              onClick={() => updateValue('weight', -2.5)}
              className="active-set-btn"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="active-set-value">{values.weight}kg</span>
            <button
              onClick={() => updateValue('weight', 2.5)}
              className="active-set-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-neon-gray-500 text-xs">({set.targetWeight}kg)</span>
        </div>
      </div>

      {/* Set Number Badge */}
      <div className="active-set-badge">
        {set.setNumber}
      </div>

      {/* Notes */}
      {set.notes && (
        <p className="text-neon-gray-400 text-xs text-center mt-2">{set.notes}</p>
      )}

      {/* Complete Button */}
      <button onClick={handleComplete} className="active-set-complete-btn">
        <Check className="w-5 h-5" />
        סיים סט
      </button>
    </div>
  )
}

// ============================================
// Upcoming Set Row
// ============================================
interface UpcomingSetRowProps {
  set: PlannedSet
}

export function UpcomingSetRow({ set }: UpcomingSetRowProps) {
  const targetReps = typeof set.targetReps === 'object'
    ? `${set.targetReps.min}-${set.targetReps.max}`
    : set.targetReps

  return (
    <div className="set-row-upcoming">
      <div className="set-row-fields">
        <div className="set-row-field">
          <span className="text-neon-gray-500 text-xs">RIR</span>
          <span className="text-neon-gray-500">___</span>
        </div>
        <div className="set-row-divider" />
        <div className="set-row-field">
          <span className="text-neon-gray-500 text-xs">חזרות</span>
          <span className="text-neon-gray-500">{targetReps}</span>
        </div>
        <div className="set-row-divider" />
        <div className="set-row-field">
          <span className="text-neon-gray-500 text-xs">משקל</span>
          <span className="text-neon-gray-500">{set.targetWeight || '___'}kg</span>
        </div>
      </div>
      <div className="set-row-badge upcoming">
        {set.setNumber}
      </div>
    </div>
  )
}
