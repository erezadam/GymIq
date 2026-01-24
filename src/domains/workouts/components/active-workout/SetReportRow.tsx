/**
 * SetReportRow
 * A single row for reporting set data based on exercise reportType
 * Supports dynamic report types from Firebase
 */

import { Trash2 } from 'lucide-react'
import type { ReportedSet } from '../../types/active-workout.types'
import { workoutLabels } from '@/styles/design-tokens'

interface SetReportRowProps {
  set: ReportedSet
  reportType?: string  // Dynamic - loaded from Firebase
  onUpdate: (updates: Partial<ReportedSet>) => void
  onDelete: () => void
  canDelete: boolean
}

// Helper: Convert seconds to minutes and seconds
const secondsToMinutesSeconds = (totalSeconds: number): { minutes: number; seconds: number } => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return { minutes, seconds }
}

// Helper: Convert minutes and seconds to total seconds
const minutesSecondsToSeconds = (minutes: number, seconds: number): number => {
  return minutes * 60 + seconds
}

export function SetReportRow({
  set,
  reportType = 'weight_reps',
  onUpdate,
  onDelete,
  canDelete,
}: SetReportRowProps) {
  const { minutes, seconds } = secondsToMinutesSeconds(set.time || 0)

  const handleMinutesChange = (newMinutes: number) => {
    onUpdate({ time: minutesSecondsToSeconds(newMinutes, seconds) })
  }

  const handleSecondsChange = (newSeconds: number) => {
    // Clamp seconds to 0-59
    const clampedSeconds = Math.min(59, Math.max(0, newSeconds))
    onUpdate({ time: minutesSecondsToSeconds(minutes, clampedSeconds) })
  }

  // Render time input (minutes:seconds)
  const renderTimeInput = () => (
    <div className="set-input-group set-input-group--time">
      <label className="set-label">זמן</label>
      <div className="time-inputs">
        <input
          type="number"
          inputMode="numeric"
          className="set-input set-input--time"
          value={minutes || ''}
          onChange={(e) => handleMinutesChange(parseInt(e.target.value) || 0)}
          placeholder="0"
          min="0"
        />
        <span className="time-separator">:</span>
        <input
          type="number"
          inputMode="numeric"
          className="set-input set-input--time"
          value={seconds || ''}
          onChange={(e) => handleSecondsChange(parseInt(e.target.value) || 0)}
          placeholder="00"
          min="0"
          max="59"
        />
      </div>
    </div>
  )

  // Render weight input
  const renderWeightInput = () => (
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
  )

  // Render reps input
  const renderRepsInput = () => (
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
  )

  // Render intensity input (1-10 scale)
  const renderIntensityInput = () => (
    <div className="set-input-group">
      <label className="set-label">עצימות</label>
      <input
        type="number"
        inputMode="numeric"
        className="set-input"
        value={set.intensity || ''}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0
          // Clamp to 1-10 range
          const clamped = Math.min(10, Math.max(0, value))
          onUpdate({ intensity: clamped })
        }}
        placeholder="1-10"
        min="1"
        max="10"
      />
    </div>
  )

  // Render speed input (km/h)
  const renderSpeedInput = () => (
    <div className="set-input-group">
      <label className="set-label">מהירות</label>
      <input
        type="number"
        inputMode="decimal"
        className="set-input"
        value={set.speed || ''}
        onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) || 0 })}
        placeholder="קמ״ש"
        step="0.1"
        min="0"
      />
    </div>
  )

  // Render distance input (km)
  const renderDistanceInput = () => (
    <div className="set-input-group">
      <label className="set-label">מרחק</label>
      <input
        type="number"
        inputMode="decimal"
        className="set-input"
        value={set.distance || ''}
        onChange={(e) => onUpdate({ distance: parseFloat(e.target.value) || 0 })}
        placeholder="ק״מ"
        step="0.1"
        min="0"
      />
    </div>
  )

  // Render inputs based on reportType
  const renderInputs = () => {
    switch (reportType) {
      case 'reps_only':
        return renderRepsInput()

      case 'time_only':
        return renderTimeInput()

      case 'reps_time':
        return (
          <>
            {renderRepsInput()}
            {renderTimeInput()}
          </>
        )

      case 'intensity_time':
        return (
          <>
            {renderIntensityInput()}
            {renderTimeInput()}
          </>
        )

      case 'time_speed':
        return (
          <>
            {renderTimeInput()}
            {renderSpeedInput()}
          </>
        )

      case 'time_distance':
        return (
          <>
            {renderTimeInput()}
            {renderDistanceInput()}
          </>
        )

      case 'speed_distance':
        return (
          <>
            {renderSpeedInput()}
            {renderDistanceInput()}
          </>
        )

      case 'time_speed_distance':
        return (
          <>
            {renderTimeInput()}
            {renderSpeedInput()}
            {renderDistanceInput()}
          </>
        )

      case 'distance_only':
        return renderDistanceInput()

      case 'speed_only':
        return renderSpeedInput()

      case 'weight_reps':
      default:
        // Default to weight + reps for unknown types (backward compatibility)
        return (
          <>
            {renderWeightInput()}
            {renderRepsInput()}
          </>
        )
    }
  }

  return (
    <div className="set-report-row" dir="rtl">
      {/* Set number badge */}
      <div className="set-badge">{set.setNumber}</div>

      {/* Dynamic inputs based on reportType */}
      {renderInputs()}

      {/* Delete button */}
      {canDelete && (
        <button className="set-delete-btn" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
