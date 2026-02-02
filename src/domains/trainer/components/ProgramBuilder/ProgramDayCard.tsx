import { GripVertical, Trash2, Edit2, Moon } from 'lucide-react'
import type { ProgramDay } from '../../types'

interface ProgramDayCardProps {
  day: ProgramDay
  index: number
  onEdit: (index: number) => void
  onRemove: (index: number) => void
}

export function ProgramDayCard({ day, index, onEdit, onRemove }: ProgramDayCardProps) {
  const exerciseCount = day.exercises.length
  const totalSets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0)

  if (day.restDay) {
    return (
      <div className="card flex items-center justify-between opacity-60">
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-text-muted" />
          <Moon className="w-5 h-5 text-status-info" />
          <div>
            <p className="text-sm font-medium text-text-primary">{day.dayLabel}</p>
            <p className="text-xs text-text-muted">יום מנוחה</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="btn-icon text-text-muted hover:text-status-error"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="card hover:border-status-info/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-text-muted" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{day.dayLabel}</p>
            <p className="text-xs text-text-muted">{day.name || 'ללא שם'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(index)}
            className="btn-icon text-status-info"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="btn-icon text-text-muted hover:text-status-error"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span>{exerciseCount} תרגילים</span>
        <span>{totalSets} סטים</span>
        {day.estimatedDuration && <span>{day.estimatedDuration} דק&apos;</span>}
      </div>
      {day.exercises.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {day.exercises.slice(0, 4).map((ex, i) => (
            <span key={i} className="badge bg-dark-card text-text-secondary text-xs">
              {ex.exerciseNameHe}
            </span>
          ))}
          {day.exercises.length > 4 && (
            <span className="badge bg-dark-card text-text-muted text-xs">
              +{day.exercises.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
