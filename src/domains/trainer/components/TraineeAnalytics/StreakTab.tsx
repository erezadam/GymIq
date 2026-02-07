import { StatCard } from './components/StatCard'
import { HeatmapCalendar } from './components/HeatmapCalendar'
import { PatternChart } from './components/PatternChart'
import { AIInsights } from './components/AIInsights'
import type { AnalyticsData } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface StreakTabProps {
  data: AnalyticsData
}

export function StreakTab({ data }: StreakTabProps) {
  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          value={data.currentStreak}
          label="רצף נוכחי"
          variant="warning"
          trend={data.currentStreak > 0 ? '🔥 ימים רצופים' : undefined}
          trendDirection="neutral"
        />
        <StatCard
          value={data.bestStreak}
          label="שיא אישי"
          variant="highlight"
          trend={data.bestStreakRange}
          trendDirection="neutral"
        />
      </div>

      {/* Heatmap Calendar */}
      <HeatmapCalendar
        data={data.heatmapData}
        month={data.heatmapMonth}
        onMonthChange={data.setHeatmapMonth}
      />

      {/* Day Patterns */}
      <PatternChart patterns={data.dayPatterns} />

      {/* AI Insights */}
      <AIInsights insights={data.streakInsights} />
    </div>
  )
}
