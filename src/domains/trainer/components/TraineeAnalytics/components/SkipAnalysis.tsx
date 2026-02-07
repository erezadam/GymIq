import type { SkipInfo } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface SkipAnalysisProps {
  items: SkipInfo[]
}

const BADGE_COLORS = [
  'bg-gradient-to-br from-status-success to-green-700',
  'bg-gradient-to-br from-blue-500 to-blue-700',
  'bg-gradient-to-br from-accent-orange to-orange-700',
  'bg-gradient-to-br from-accent-purple to-purple-700',
  'bg-gradient-to-br from-yellow-500 to-yellow-700',
]

function getPercentColor(pct: number): string {
  if (pct >= 80) return 'text-status-success'
  if (pct >= 60) return 'text-accent-orange'
  return 'text-status-error'
}

export function SkipAnalysis({ items }: SkipAnalysisProps) {
  if (items.length === 0) return null

  return (
    <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary mb-3">
        ⚠️ על אילו אימונים מדלג?
      </h3>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.dayLabel} className="flex items-center justify-between p-3 bg-dark-surface rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white ${BADGE_COLORS[i % BADGE_COLORS.length]}`}>
                {item.dayLabel.replace('יום ', '')}
              </div>
              <div>
                <div className="text-[13px] font-medium text-text-primary">{item.dayName}</div>
                <div className="text-[11px] text-text-secondary">
                  בוצע {item.performed} מתוך {item.expected} פעמים
                </div>
              </div>
            </div>
            <span className={`text-sm font-bold ${getPercentColor(item.percentage)}`}>
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
