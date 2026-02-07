import { StatCard } from './components/StatCard'
import { WeeklyProgressBars } from './components/WeeklyProgressBars'
import { SkipAnalysis } from './components/SkipAnalysis'
import { AIInsights } from './components/AIInsights'
import type { AnalyticsData } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface WeeklyComplianceTabProps {
  data: AnalyticsData
}

export function WeeklyComplianceTab({ data }: WeeklyComplianceTabProps) {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          value={`${data.thisWeekDone}/${data.thisWeekPlanned}`}
          label="השבוע הנוכחי"
          variant={data.thisWeekDone >= data.thisWeekPlanned ? 'success' : 'default'}
          trend={data.thisWeekDone >= data.thisWeekPlanned ? '✓ הושלם!' : undefined}
          trendDirection="up"
        />
        <StatCard
          value={`${data.avgCompliance}%`}
          label="ממוצע עמידה"
          trend={data.avgCompliance >= 80 ? '↑ מעולה' : data.avgCompliance >= 60 ? 'סביר' : '↓ צריך שיפור'}
          trendDirection={data.avgCompliance >= 80 ? 'up' : data.avgCompliance >= 60 ? 'neutral' : 'down'}
        />
        <StatCard
          value={data.perfectWeeksStreak}
          label="שבועות מושלמים"
          variant="highlight"
          trend={data.perfectWeeksStreak >= 2 ? 'רצופים 🔥' : undefined}
          trendDirection="neutral"
        />
        <StatCard
          value={data.mostSkippedDay || '-'}
          label="אימון מדולג"
          variant={data.mostSkippedDay ? 'warning' : 'default'}
          trend={data.mostSkippedDay ? 'הכי הרבה דילוגים' : undefined}
          trendDirection="down"
        />
      </div>

      {/* Weekly Progress Bars */}
      <WeeklyProgressBars weeks={data.weeklyCompliance} />

      {/* Skip Analysis */}
      <SkipAnalysis items={data.skipAnalysis} />

      {/* AI Insights */}
      <AIInsights insights={data.complianceInsights} />
    </div>
  )
}
