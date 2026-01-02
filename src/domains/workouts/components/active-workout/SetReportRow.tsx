/**
 * SetReportRow
 * A single row for reporting set data (weight and reps)
 */

import { Trash2 } from 'lucide-react'
import type { ReportedSet } from '../../types/active-workout.types'
import { workoutLabels } from '@/styles/design-tokens'

interface SetReportRowProps {
  set: ReportedSet
  onUpdate: (updates: Partial<ReportedSet>) => void
  onDelete: () => void
  canDelete: boolean
}

export function SetReportRow({
  set,
  onUpdate,
  onDelete,
  canDelete,
}: SetReportRowProps) {
  return (
    <div className="set-report-row" dir="rtl">
      {/* Set number badge */}
      <div className="set-badge">{set.setNumber}</div>

      {/* Weight input */}
      <div className="set-input-group">
        <label className="set-label">{workoutLabels.weight}</label>
        <input
          type="number"
          inputMode="decimal"
          className="set-input"
          value={set.weight || ''}
          onChange={(e) =>
            onUpdate({ weight: parseFloat(e.target.value) || 0 })
          }
          placeholder="0"
        />
      </div>

      {/* Reps input */}
      <div className="set-input-group">
        <label className="set-label">{workoutLabels.reps}</label>
        <input
          type="number"
          inputMode="numeric"
          className="set-input"
          value={set.reps || ''}
          onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>

      {/* Delete button */}
      {canDelete && (
        <button className="set-delete-btn" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
