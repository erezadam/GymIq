import { Moon } from 'lucide-react'
import type { ProgramDay } from '../../types'

interface ProgramDayCardProps {
  day: ProgramDay
  index: number
  onEdit: (index: number) => void
  onRemove: (index: number) => void
  onCopy?: (index: number) => void
  onUpdateName?: (index: number, name: string) => void
}

const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const DAY_LETTER_GRADIENTS = [
  'from-primary-main to-teal-600',
  'from-status-info to-blue-600',
  'from-accent-purple to-purple-600',
  'from-accent-orange to-orange-600',
  'from-accent-pink to-pink-600',
  'from-accent-gold to-yellow-600',
  'from-status-success to-green-600',
]

export function ProgramDayCard({
  day,
  index,
  onEdit,
  onRemove,
  onCopy,
  onUpdateName,
}: ProgramDayCardProps) {
  const exerciseCount = day.exercises.length
  const totalSets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0)
  const letter = DAY_LETTERS[index] || String(index + 1)
  const gradient = DAY_LETTER_GRADIENTS[index % DAY_LETTER_GRADIENTS.length]

  if (day.restDay) {
    return (
      <div className="bg-gradient-to-br from-status-info/5 to-status-info/10 border border-status-info/20 rounded-2xl p-5 opacity-70">
        <div className="flex items-center gap-4">
          <div className="cursor-move text-text-muted hover:text-text-primary text-xl">⋮⋮</div>
          <div className="w-14 h-14 rounded-xl bg-status-info/20 flex items-center justify-center">
            <Moon className="w-6 h-6 text-status-info" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-text-primary">{day.dayLabel}</p>
            <p className="text-sm text-text-muted">יום מנוחה</p>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="p-2 hover:bg-status-error/20 text-status-error rounded-lg transition"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-gradient-to-br from-primary-main/10 to-status-info/10 border border-primary-main/20 rounded-2xl p-5 hover:border-primary-main/40 transition cursor-pointer"
      onClick={() => onEdit(index)}
    >
      <div className="flex items-center gap-4">
        {/* Drag handle */}
        <div className="cursor-move text-text-muted hover:text-text-primary text-xl flex-shrink-0">
          ⋮⋮
        </div>

        {/* Day letter icon */}
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-black text-white flex-shrink-0`}
        >
          {letter}
        </div>

        {/* Name & info */}
        <div className="flex-1 min-w-0">
          {onUpdateName ? (
            <input
              type="text"
              value={day.name}
              onChange={(e) => onUpdateName(index, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent text-lg font-bold text-text-primary focus:outline-none border-b border-transparent focus:border-primary-main w-full"
              placeholder="שם האימון..."
            />
          ) : (
            <h4 className="font-bold text-lg text-text-primary truncate">
              {day.name || 'ללא שם'}
            </h4>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-text-muted text-sm">{day.dayLabel}</span>
            <span className="text-dark-border">•</span>
            <span className="text-primary-main text-sm">
              {exerciseCount} תרגילים
            </span>
            {totalSets > 0 && (
              <>
                <span className="text-dark-border">•</span>
                <span className="text-text-muted text-sm">{totalSets} סטים</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {onCopy && (
            <button
              onClick={() => onCopy(index)}
              className="p-2 hover:bg-dark-surface rounded-lg transition text-text-muted hover:text-text-primary"
              title="העתק"
            >
              📋
            </button>
          )}
          <button
            onClick={() => onRemove(index)}
            className="p-2 hover:bg-status-error/20 text-status-error/70 hover:text-status-error rounded-lg transition"
            title="מחק"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Exercise preview tags */}
      {exerciseCount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-1.5">
          {day.exercises.slice(0, 4).map((ex, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-dark-surface/50 text-text-secondary text-xs rounded-lg"
            >
              {ex.exerciseNameHe}
            </span>
          ))}
          {exerciseCount > 4 && (
            <span className="px-2.5 py-1 bg-dark-surface/50 text-text-muted text-xs rounded-lg">
              +{exerciseCount - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
