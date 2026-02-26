/**
 * SetReportRow
 * A single row for reporting set data based on exercise reportType
 * Supports dynamic report types from Firebase
 * Also supports assistance type fields (graviton, bands)
 */

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ReportedSet } from '../../types/active-workout.types'
import { workoutLabels } from '@/styles/design-tokens'

interface SetReportRowProps {
  set: ReportedSet
  reportType?: string  // Dynamic - loaded from Firebase
  assistanceType?: 'graviton' | 'bands'  // User's assistance choice
  availableBands?: string[]  // Available band IDs for this exercise
  bandNameMap?: Record<string, string>  // Map of bandId -> bandName (passed from parent)
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
  assistanceType,
  availableBands,
  bandNameMap = {},
  onUpdate,
  onDelete,
  canDelete,
}: SetReportRowProps) {
  const { minutes, seconds } = secondsToMinutesSeconds(set.time || 0)
  const minutesInputRef = useRef<HTMLInputElement>(null)
  const secondsInputRef = useRef<HTMLInputElement>(null)

  // Raw string state for time inputs — allows free typing without immediate re-format
  const [minutesRaw, setMinutesRaw] = useState<string | null>(null)
  const [secondsRaw, setSecondsRaw] = useState<string | null>(null)

  // Raw string state for decimal inputs — allows typing "75." without losing the dot
  const [weightRaw, setWeightRaw] = useState<string | null>(null)
  const [speedRaw, setSpeedRaw] = useState<string | null>(null)
  const [distanceRaw, setDistanceRaw] = useState<string | null>(null)
  const [assistanceWeightRaw, setAssistanceWeightRaw] = useState<string | null>(null)

  // Format as 2-digit string (00)
  const formatTwoDigits = (val: number): string => val.toString().padStart(2, '0')

  const handleMinutesChange = (inputValue: string) => {
    const digits = inputValue.replace(/\D/g, '').slice(0, 2)
    setMinutesRaw(digits)
    const newMinutes = parseInt(digits) || 0
    onUpdate({ time: minutesSecondsToSeconds(newMinutes, seconds) })
    // Auto-focus seconds input when 2 digits are entered
    if (digits.length >= 2) {
      setMinutesRaw(null)
      secondsInputRef.current?.focus()
      secondsInputRef.current?.select()
    }
  }

  const handleSecondsChange = (inputValue: string) => {
    const digits = inputValue.replace(/\D/g, '').slice(0, 2)
    setSecondsRaw(digits)
    const newSeconds = Math.min(59, parseInt(digits) || 0)
    onUpdate({ time: minutesSecondsToSeconds(minutes, newSeconds) })
    // Auto-focus minutes input when 2 digits are entered
    if (digits.length >= 2) {
      setSecondsRaw(null)
      minutesInputRef.current?.focus()
      minutesInputRef.current?.select()
    }
  }

  const handleMinutesBlur = () => setMinutesRaw(null)
  const handleSecondsBlur = () => setSecondsRaw(null)

  // Render time input (minutes:seconds)
  // Using dir="ltr" to keep time display in standard MM:SS format (left to right)
  const renderTimeInput = () => (
    <div className="set-input-group set-input-group--time">
      <label className="set-label">זמן</label>
      <div className="time-inputs" dir="ltr">
        <input
          ref={minutesInputRef}
          type="text"
          className="set-input set-input--time"
          value={minutesRaw !== null ? minutesRaw : (minutes ? formatTwoDigits(minutes) : '')}
          onChange={(e) => handleMinutesChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={handleMinutesBlur}
          placeholder="00"
          maxLength={2}
        />
        <span className="time-separator">:</span>
        <input
          ref={secondsInputRef}
          type="text"
          className="set-input set-input--time"
          value={secondsRaw !== null ? secondsRaw : ((seconds || minutes) ? formatTwoDigits(seconds) : '')}
          onChange={(e) => handleSecondsChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={handleSecondsBlur}
          placeholder="00"
          maxLength={2}
        />
      </div>
    </div>
  )

  // Render weight input
  const renderWeightInput = () => (
    <div className="set-input-group">
      <label className="set-label">{workoutLabels.weight}</label>
      <input
        type="text"
        className="set-input"
        value={weightRaw !== null ? weightRaw : (set.weight || '')}
        onChange={(e) => {
          const val = e.target.value
          setWeightRaw(val)
          const parsed = parseFloat(val)
          if (!isNaN(parsed)) onUpdate({ weight: parsed })
          else if (val === '') onUpdate({ weight: 0 })
        }}
        onBlur={() => setWeightRaw(null)}
        placeholder="0"
      />
    </div>
  )

  // Render reps input
  const renderRepsInput = () => (
    <div className="set-input-group">
      <label className="set-label">{workoutLabels.reps}</label>
      <input
        type="text"
        className="set-input"
        value={set.reps || ''}
        onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
        placeholder="0"
      />
    </div>
  )

  // Render intensity input (1-100 scale)
  const renderIntensityInput = () => (
    <div className="set-input-group">
      <label className="set-label">עצימות</label>
      <input
        type="text"
        className="set-input"
        value={set.intensity || ''}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0
          // Clamp to 1-100 range
          const clamped = Math.min(100, Math.max(0, value))
          onUpdate({ intensity: clamped })
        }}
        placeholder="1-100"
      />
    </div>
  )

  // Render incline input (1-20 scale)
  const renderInclineInput = () => (
    <div className="set-input-group">
      <label className="set-label">שיפוע</label>
      <input
        type="text"
        className="set-input"
        value={set.incline || ''}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 0
          // Clamp to 1-20 range
          const clamped = Math.min(20, Math.max(0, value))
          onUpdate({ incline: clamped })
        }}
        placeholder="1-20"
      />
    </div>
  )

  // Render speed input (km/h)
  const renderSpeedInput = () => (
    <div className="set-input-group">
      <label className="set-label">מהירות</label>
      <input
        type="text"
        className="set-input"
        value={speedRaw !== null ? speedRaw : (set.speed || '')}
        onChange={(e) => {
          const val = e.target.value
          setSpeedRaw(val)
          const parsed = parseFloat(val)
          if (!isNaN(parsed)) onUpdate({ speed: parsed })
          else if (val === '') onUpdate({ speed: 0 })
        }}
        onBlur={() => setSpeedRaw(null)}
        placeholder="קמ״ש"
      />
    </div>
  )

  // Render distance input (km)
  const renderDistanceInput = () => (
    <div className="set-input-group">
      <label className="set-label">מרחק</label>
      <input
        type="text"
        className="set-input"
        value={distanceRaw !== null ? distanceRaw : (set.distance || '')}
        onChange={(e) => {
          const val = e.target.value
          setDistanceRaw(val)
          const parsed = parseFloat(val)
          if (!isNaN(parsed)) onUpdate({ distance: parsed })
          else if (val === '') onUpdate({ distance: 0 })
        }}
        onBlur={() => setDistanceRaw(null)}
        placeholder="ק״מ"
      />
    </div>
  )

  // Render assistance weight input (for graviton)
  const renderAssistanceWeightInput = () => (
    <div className="set-input-group">
      <label className="set-label">עזרה (ק״ג)</label>
      <input
        type="text"
        className="set-input"
        value={assistanceWeightRaw !== null ? assistanceWeightRaw : (set.assistanceWeight || '')}
        onChange={(e) => {
          const val = e.target.value
          setAssistanceWeightRaw(val)
          const parsed = parseFloat(val)
          if (!isNaN(parsed)) onUpdate({ assistanceWeight: parsed })
          else if (val === '') onUpdate({ assistanceWeight: 0 })
        }}
        onBlur={() => setAssistanceWeightRaw(null)}
        placeholder="0"
      />
    </div>
  )

  // Render band selection (for bands assistance) - single select
  const renderBandsSelection = () => {
    const selectedBand = set.assistanceBand

    const handleBandSelect = (bandId: string) => {
      // If clicking the same band, deselect it; otherwise select the new one
      const newBand = selectedBand === bandId ? undefined : bandId
      onUpdate({ assistanceBand: newBand })
    }

    // If no available bands, show a message
    if (!availableBands || availableBands.length === 0) {
      return (
        <div className="set-input-group" style={{ flex: 2 }}>
          <label className="set-label">גומייה</label>
          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>אין גומיות מוגדרות</span>
        </div>
      )
    }

    return (
      <div className="set-input-group" style={{ flex: 2 }}>
        <label className="set-label">גומייה</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {availableBands.map((bandId) => (
            <button
              key={bandId}
              type="button"
              onClick={() => handleBandSelect(bandId)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: `1px solid ${selectedBand === bandId ? '#2DD4BF' : '#4B5563'}`,
                background: selectedBand === bandId ? 'rgba(45, 212, 191, 0.2)' : 'transparent',
                color: selectedBand === bandId ? '#2DD4BF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {bandNameMap[bandId] || bandId}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Parse reportType to determine which fields to show
  // Supports both exact IDs (e.g., 'time_speed') and field-based parsing
  const getFieldsFromReportType = (type: string): string[] => {
    // Normalize: lowercase and split by common separators
    const normalized = type.toLowerCase()

    // Check for known field keywords in the reportType string
    const fields: string[] = []

    // Order matters for display - check in display order
    if (normalized.includes('weight') || normalized.includes('משקל')) fields.push('weight')
    if (normalized.includes('reps') || normalized.includes('חזרות')) fields.push('reps')
    if (normalized.includes('time') || normalized.includes('זמן')) fields.push('time')
    if (normalized.includes('intensity') || normalized.includes('עצימות')) fields.push('intensity')
    // Support typos and variations for speed
    if (normalized.includes('speed') || normalized.includes('spead') || normalized.includes('מהירות')) fields.push('speed')
    if (normalized.includes('distance') || normalized.includes('מרחק')) fields.push('distance')
    // Support variations for incline: incline, slope, slop, slot, שיפוע
    if (normalized.includes('incline') || normalized.includes('slope') || normalized.includes('slop') || normalized.includes('slot') || normalized.includes('שיפוע')) fields.push('incline')

    // If no fields detected, default to weight + reps
    if (fields.length === 0) {
      console.warn(`Unknown reportType: ${type}, defaulting to weight_reps`)
      return ['weight', 'reps']
    }

    return fields
  }

  // Render inputs based on reportType - dynamic field parsing
  const renderInputs = () => {
    // If assistance type is selected, show assistance-specific fields
    if (assistanceType === 'graviton') {
      console.log(`🏋️ SetReportRow: assistanceType=graviton`)
      return (
        <>
          {renderAssistanceWeightInput()}
          {renderRepsInput()}
        </>
      )
    }

    if (assistanceType === 'bands') {
      console.log(`🏋️ SetReportRow: assistanceType=bands`)
      return (
        <>
          {renderBandsSelection()}
          {renderRepsInput()}
        </>
      )
    }

    // Regular exercise - use reportType fields
    const fields = getFieldsFromReportType(reportType)
    console.log(`🏋️ SetReportRow: reportType=${reportType}, fields=`, fields)

    return (
      <>
        {fields.map((field) => {
          switch (field) {
            case 'weight':
              return <span key="weight">{renderWeightInput()}</span>
            case 'reps':
              return <span key="reps">{renderRepsInput()}</span>
            case 'time':
              return <span key="time">{renderTimeInput()}</span>
            case 'intensity':
              return <span key="intensity">{renderIntensityInput()}</span>
            case 'speed':
              return <span key="speed">{renderSpeedInput()}</span>
            case 'distance':
              return <span key="distance">{renderDistanceInput()}</span>
            case 'incline':
              return <span key="incline">{renderInclineInput()}</span>
            default:
              return null
          }
        })}
      </>
    )
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
