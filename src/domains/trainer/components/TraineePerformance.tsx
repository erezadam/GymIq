import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { getPersonalRecords } from '@/lib/firebase/workoutHistory'
import type { TraineeStats } from '../types'

interface TraineePerformanceProps {
  stats: TraineeStats
  traineeId?: string
  isLoading?: boolean
}

export function TraineePerformance({ stats, traineeId, isLoading }: TraineePerformanceProps) {
  const navigate = useNavigate()
  const [prCount, setPrCount] = useState<number | null>(null)

  useEffect(() => {
    if (traineeId) {
      getPersonalRecords(traineeId)
        .then((records) => setPrCount(records.filter((r) => r.hasImproved).length))
        .catch(() => setPrCount(0))
    }
  }, [traineeId])

  const statCards = [
    {
      label: 'סה"כ אימונים',
      value: stats.totalWorkouts,
      color: 'text-primary-main',
      trend: stats.thisMonthWorkouts > 0 ? `↑ ${stats.thisMonthWorkouts} החודש` : undefined,
      trendColor: 'text-status-success',
      tab: 'total' as const,
    },
    {
      label: 'רצף ימים',
      value: stats.currentStreak,
      color: 'text-accent-orange',
      trend: stats.currentStreak >= 7 ? '🔥 שיא!' : undefined,
      trendColor: 'text-accent-orange',
      tab: 'streak' as const,
    },
    {
      label: 'השבוע',
      value: `${stats.thisWeekWorkouts}/3`,
      color: 'text-accent-purple',
      trend: stats.thisWeekWorkouts >= 3 ? '✓ הושלם!' : undefined,
      trendColor: 'text-status-success',
      tab: 'weekly' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map((card) => (
        <button
          key={card.label}
          onClick={() => traineeId && navigate(`/trainer/trainee/${traineeId}/analytics?tab=${card.tab}`)}
          className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4 text-center cursor-pointer hover:border-primary-main/30 transition-colors"
        >
          <div
            className={`text-3xl font-black ${card.color} mb-1 ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? '-' : card.value}
          </div>
          <p className="text-text-muted text-sm">{card.label}</p>
          {card.trend && <p className={`${card.trendColor} text-xs mt-1`}>{card.trend}</p>}
        </button>
      ))}

      {/* PR Cube - navigates to analytics PR tab */}
      <button
        onClick={() => traineeId && navigate(`/trainer/trainee/${traineeId}/analytics?tab=pr`)}
        className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4 text-center cursor-pointer hover:border-yellow-400/30 transition-colors"
      >
        <div className={`text-3xl font-black text-yellow-400 mb-1 ${isLoading ? 'opacity-50' : ''}`}>
          {isLoading ? '-' : <Trophy className="w-8 h-8 mx-auto text-yellow-400" />}
        </div>
        <p className="text-text-muted text-sm">PR</p>
        {prCount !== null && prCount > 0 && (
          <p className="text-status-success text-xs mt-1">{prCount} שיפורים</p>
        )}
      </button>
    </div>
  )
}
