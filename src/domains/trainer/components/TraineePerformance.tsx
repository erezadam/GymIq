import type { TraineeStats } from '../types'

interface TraineePerformanceProps {
  stats: TraineeStats
  isLoading?: boolean
}

export function TraineePerformance({ stats, isLoading }: TraineePerformanceProps) {
  const statCards = [
    {
      label: 'סה"כ אימונים',
      value: stats.totalWorkouts,
      color: 'text-primary-main',
      trend: stats.thisMonthWorkouts > 0 ? `↑ ${stats.thisMonthWorkouts} החודש` : undefined,
      trendColor: 'text-status-success',
    },
    {
      label: 'רצף ימים',
      value: stats.currentStreak,
      color: 'text-accent-orange',
      trend: stats.currentStreak >= 7 ? '🔥 שיא!' : undefined,
      trendColor: 'text-accent-orange',
    },
    {
      label: 'נפח כולל (ק"ג)',
      value:
        stats.totalVolume > 1000
          ? `${(stats.totalVolume / 1000).toFixed(0)}K`
          : stats.totalVolume,
      color: 'text-status-info',
      trend: undefined,
      trendColor: 'text-status-success',
    },
    {
      label: 'השבוע',
      value: `${stats.thisWeekWorkouts}/3`,
      color: 'text-accent-purple',
      trend: stats.thisWeekWorkouts >= 3 ? '✓ הושלם!' : undefined,
      trendColor: 'text-status-success',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map((card) => (
        <div
          key={card.label}
          className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4 text-center"
        >
          <div
            className={`text-3xl font-black ${card.color} mb-1 ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? '-' : card.value}
          </div>
          <p className="text-text-muted text-sm">{card.label}</p>
          {card.trend && <p className={`${card.trendColor} text-xs mt-1`}>{card.trend}</p>}
        </div>
      ))}
    </div>
  )
}
