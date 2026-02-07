import type { DayPattern } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface PatternChartProps {
  patterns: DayPattern[]
}

function getPercentColor(pct: number): string {
  if (pct >= 70) return 'text-status-success'
  if (pct >= 40) return 'text-text-secondary'
  return 'text-status-error'
}

// Map percentage to Tailwind height class (from 0% to 100% of 60px parent)
function getHeightClass(pct: number): string {
  if (pct >= 95) return 'h-full'
  if (pct >= 85) return 'h-5/6'
  if (pct >= 75) return 'h-3/4'
  if (pct >= 60) return 'h-3/5'
  if (pct >= 50) return 'h-1/2'
  if (pct >= 40) return 'h-2/5'
  if (pct >= 30) return 'h-[30%]'
  if (pct >= 20) return 'h-1/5'
  if (pct >= 10) return 'h-[10%]'
  if (pct > 0) return 'h-[5%]'
  return 'h-0'
}

export function PatternChart({ patterns }: PatternChartProps) {
  return (
    <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary mb-3">
        📊 באילו ימים מתאמן?
      </h3>

      <div className="grid grid-cols-7 gap-1.5">
        {patterns.map(pattern => (
          <div key={pattern.dayName} className="text-center">
            <div className="text-[11px] text-text-muted mb-1.5">{pattern.dayName}</div>
            <div className="h-[60px] bg-dark-surface rounded-md relative overflow-hidden flex items-end">
              <div
                className={`w-full bg-gradient-to-t from-primary-main to-primary-main/70 rounded-md transition-all duration-500 ${getHeightClass(pattern.percentage)}`}
              />
            </div>
            <div className={`text-[10px] mt-1 font-medium ${getPercentColor(pattern.percentage)}`}>
              {pattern.percentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
