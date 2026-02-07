import type { WeekCompliance } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface WeeklyProgressBarsProps {
  weeks: WeekCompliance[]
}

function getWidthClass(pct: number): string {
  if (pct >= 100) return 'w-full'
  if (pct >= 90) return 'w-11/12'
  if (pct >= 80) return 'w-4/5'
  if (pct >= 66) return 'w-2/3'
  if (pct >= 50) return 'w-1/2'
  if (pct >= 33) return 'w-1/3'
  if (pct >= 25) return 'w-1/4'
  if (pct >= 15) return 'w-[15%]'
  if (pct > 0) return 'w-[8%]'
  return 'w-0'
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-gradient-to-r from-status-success to-green-700'
  if (pct >= 60) return 'bg-gradient-to-r from-accent-orange to-orange-700'
  return 'bg-gradient-to-r from-status-error to-red-700'
}

export function WeeklyProgressBars({ weeks }: WeeklyProgressBarsProps) {
  return (
    <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary mb-3">
        📊 עמידה בתוכנית - 8 שבועות
      </h3>

      <div className="space-y-2.5 mt-2">
        {weeks.map((week, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-[60px] text-xs text-text-secondary flex-shrink-0 text-right">
              {week.label}
            </span>
            <div className="flex-1 h-5 bg-dark-surface rounded-lg overflow-hidden relative">
              <div
                className={`h-full rounded-lg transition-all duration-500 ${getWidthClass(week.percentage)} ${getBarColor(week.percentage)}`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white">
                {week.done}/{week.planned} {week.percentage >= 100 ? '✓' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
