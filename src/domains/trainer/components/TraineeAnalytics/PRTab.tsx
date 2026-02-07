import { StatCard } from './components/StatCard'
import { PRCard } from './components/PRCard'
import { AIInsights } from './components/AIInsights'
import type { AnalyticsData } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface PRTabProps {
  data: AnalyticsData
}

export function PRTab({ data }: PRTabProps) {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          value={data.prsThisMonth}
          label="שיאים החודש"
          variant="success"
          trend={data.prsThisMonth > 0 ? `↑ ${data.prsThisMonth} שיפורים` : undefined}
          trendDirection="up"
        />
        <StatCard
          value={data.totalPRs}
          label="סה״כ שיאים"
          variant="highlight"
        />
        <StatCard
          value={data.improvingCount}
          label="תרגילים מתקדמים"
          trend={data.improvingCount > 0 ? 'במגמת עלייה' : undefined}
          trendDirection="neutral"
        />
        <StatCard
          value={data.stuckCount}
          label='תרגילים "תקועים"'
          variant={data.stuckCount > 0 ? 'warning' : 'default'}
          trend={data.stuckCount > 0 ? '4+ שבועות ללא שיפור' : undefined}
          trendDirection="down"
        />
      </div>

      {/* Recent PRs */}
      {data.recentPRs.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-text-secondary mb-2.5 flex items-center gap-1.5">
            <span className="w-[3px] h-3.5 bg-primary-main rounded-full" />
            🎉 שיאים אחרונים
          </div>
          <div className="space-y-2.5">
            {data.recentPRs.slice(0, 5).map(record => (
              <PRCard key={record.exerciseId} record={record} variant="recent" />
            ))}
          </div>
        </div>
      )}

      {/* Stuck Exercises */}
      {data.stuckExercises.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-text-secondary mb-2.5 flex items-center gap-1.5 mt-5">
            <span className="w-[3px] h-3.5 bg-primary-main rounded-full" />
            ⚠️ תרגילים "תקועים"
          </div>
          <div className="space-y-2.5">
            {data.stuckExercises.map(record => (
              <PRCard key={record.exerciseId} record={record} variant="stuck" />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.recentPRs.length === 0 && data.stuckExercises.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-text-muted text-sm">אין עדיין מספיק נתונים להצגת שיאים</p>
        </div>
      )}

      {/* AI Insights */}
      <AIInsights insights={data.prInsights} />
    </div>
  )
}
