import type { ProgramDay } from '../../types'

interface MobileDaySelectorProps {
  days: ProgramDay[]
  selectedIndex: number
  onSelect: (index: number) => void
  onAddDay: () => void
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

export function MobileDaySelector({
  days,
  selectedIndex,
  onSelect,
  onAddDay,
}: MobileDaySelectorProps) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {days.map((day, index) => {
        const letter = DAY_LETTERS[index] || String(index + 1)
        const isSelected = index === selectedIndex
        const gradient = DAY_LETTER_GRADIENTS[index % DAY_LETTER_GRADIENTS.length]

        return (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex items-center gap-2 transition ${
              isSelected
                ? 'bg-gradient-to-br from-primary-main to-status-info text-white'
                : 'bg-dark-surface text-text-secondary'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                isSelected
                  ? 'bg-white/20 text-white'
                  : `bg-gradient-to-br ${gradient} text-white`
              }`}
            >
              {day.restDay ? '🌙' : letter}
            </span>
            <span className="truncate max-w-20">
              {day.name || day.dayLabel}
            </span>
          </button>
        )
      })}

      {/* Add day button */}
      {days.length < 7 && (
        <button
          onClick={onAddDay}
          className="px-4 py-2 bg-dark-surface/50 border border-dashed border-dark-border rounded-xl text-sm text-text-muted whitespace-nowrap hover:border-primary-main/50 transition"
        >
          + יום
        </button>
      )}
    </div>
  )
}
