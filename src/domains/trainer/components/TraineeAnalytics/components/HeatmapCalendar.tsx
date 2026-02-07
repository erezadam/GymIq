import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeatmapDay } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface HeatmapCalendarProps {
  data: HeatmapDay[]
  month: Date
  onMonthChange: (month: Date) => void
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

const DAY_LABELS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]

const levelClasses: Record<number, string> = {
  0: 'bg-dark-surface',
  1: 'bg-primary-main/25',
  2: 'bg-primary-main/50',
  3: 'bg-primary-main/75',
  4: 'bg-primary-main',
}

export function HeatmapCalendar({ data, month, onMonthChange }: HeatmapCalendarProps) {
  const prevMonth = () => {
    const d = new Date(month)
    d.setMonth(d.getMonth() - 1)
    onMonthChange(d)
  }

  const nextMonth = () => {
    const d = new Date(month)
    d.setMonth(d.getMonth() + 1)
    onMonthChange(d)
  }

  const monthLabel = `${HEBREW_MONTHS[month.getMonth()]} ${month.getFullYear()}`

  return (
    <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary">
          📅 לוח אימונים
        </h3>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center hover:border-primary-main/30 transition">
          <ChevronRight className="w-4 h-4 text-text-primary" />
        </button>
        <span className="text-sm font-semibold min-w-[120px] text-center">{monthLabel}</span>
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center hover:border-primary-main/30 transition">
          <ChevronLeft className="w-4 h-4 text-text-primary" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center text-[10px] text-text-muted pb-1">{label}</div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-7 gap-1">
        {data.map((day, i) => (
          <div
            key={i}
            className={`aspect-square rounded ${levelClasses[day.level]} ${
              day.isToday ? 'ring-2 ring-accent-orange' : ''
            } ${!day.isCurrentMonth ? 'opacity-30' : ''}`}
            title={`${day.date.getDate()}/${day.date.getMonth() + 1}: ${day.count} אימונים`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-text-secondary">
        <span>פחות</span>
        <div className="w-3 h-3 rounded-sm bg-dark-surface" />
        <div className="w-3 h-3 rounded-sm bg-primary-main/25" />
        <div className="w-3 h-3 rounded-sm bg-primary-main/50" />
        <div className="w-3 h-3 rounded-sm bg-primary-main/75" />
        <div className="w-3 h-3 rounded-sm bg-primary-main" />
        <span>יותר</span>
      </div>
    </div>
  )
}
