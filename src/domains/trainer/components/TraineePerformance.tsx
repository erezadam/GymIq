import { TrendingUp, Flame, Calendar, Dumbbell } from 'lucide-react'
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
      icon: Dumbbell,
      color: 'text-primary-main',
      bg: 'bg-primary-main/10',
    },
    {
      label: 'השבוע',
      value: stats.thisWeekWorkouts,
      icon: Calendar,
      color: 'text-accent-gold',
      bg: 'bg-accent-gold/10',
    },
    {
      label: 'רצף ימים',
      value: stats.currentStreak,
      icon: Flame,
      color: 'text-accent-orange',
      bg: 'bg-accent-orange/10',
    },
    {
      label: 'נפח כולל (ק"ג)',
      value: stats.totalVolume > 1000
        ? `${(stats.totalVolume / 1000).toFixed(1)}K`
        : stats.totalVolume,
      icon: TrendingUp,
      color: 'text-status-success',
      bg: 'bg-status-success/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {statCards.map((card) => (
        <div key={card.label} className="card flex items-center gap-3 py-3 px-4">
          <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
            <card.icon className={`w-5 h-5 ${card.color}`} />
          </div>
          <div>
            <p className={`text-xl font-bold ${card.color} ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading ? '-' : card.value}
            </p>
            <p className="text-xs text-text-muted">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
