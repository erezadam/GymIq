import { StatCard } from './components/StatCard'
import { AIInsights } from './components/AIInsights'
import type { AnalyticsData } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface TotalWorkoutsTabProps {
  data: AnalyticsData
}

function getBarHeightClass(count: number, max: number): string {
  if (max === 0) return 'h-0'
  const pct = (count / max) * 100
  if (pct >= 95) return 'h-full'
  if (pct >= 85) return 'h-5/6'
  if (pct >= 75) return 'h-3/4'
  if (pct >= 60) return 'h-3/5'
  if (pct >= 50) return 'h-1/2'
  if (pct >= 40) return 'h-2/5'
  if (pct >= 30) return 'h-[30%]'
  if (pct >= 20) return 'h-1/5'
  if (pct >= 10) return 'h-[10%]'
  if (count > 0) return 'h-[8%]'
  return 'h-0'
}

function getBarColor(count: number, planned: number): string {
  if (count >= planned) return 'from-status-success/80 to-status-success'
  if (count >= planned * 0.66) return 'from-accent-orange/80 to-accent-orange'
  return 'from-status-error/80 to-status-error'
}

function getDistWidthClass(pct: number): string {
  if (pct >= 90) return 'w-11/12'
  if (pct >= 80) return 'w-4/5'
  if (pct >= 70) return 'w-[70%]'
  if (pct >= 60) return 'w-3/5'
  if (pct >= 50) return 'w-1/2'
  if (pct >= 40) return 'w-2/5'
  if (pct >= 30) return 'w-[30%]'
  if (pct >= 20) return 'w-1/5'
  if (pct >= 10) return 'w-[10%]'
  if (pct > 0) return 'w-[5%]'
  return 'w-0'
}

const DIST_COLORS = [
  { bg: 'bg-status-success', dot: 'bg-status-success' },
  { bg: 'bg-blue-500', dot: 'bg-blue-500' },
  { bg: 'bg-accent-orange', dot: 'bg-accent-orange' },
  { bg: 'bg-accent-purple', dot: 'bg-accent-purple' },
  { bg: 'bg-yellow-500', dot: 'bg-yellow-500' },
]

export function TotalWorkoutsTab({ data }: TotalWorkoutsTabProps) {
  const maxWeekly = Math.max(...data.weeklyChart.map(w => w.workouts), 1)

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          value={data.thisMonthWorkouts}
          label="אימונים החודש"
          variant="highlight"
          trend={data.monthCompare > 0 ? `↑ +${data.monthCompare} מהחודש הקודם` : data.monthCompare < 0 ? `↓ ${data.monthCompare} מהחודש הקודם` : undefined}
          trendDirection={data.monthCompare > 0 ? 'up' : data.monthCompare < 0 ? 'down' : 'neutral'}
        />
        <StatCard
          value={data.yearTotal}
          label="סה״כ מתחילת השנה"
        />
        <StatCard
          value={data.weeklyAverage}
          label="ממוצע לשבוע"
          trend={data.weeklyAverage >= 3 ? '↑ עקבי' : undefined}
          trendDirection="up"
        />
        <StatCard
          value={`${data.avgDuration}'`}
          label="זמן ממוצע לאימון"
        />
      </div>

      {/* Weekly bar chart */}
      <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary">
            📈 אימונים לאורך זמן
          </h3>
          {data.monthCompare > 0 && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-md bg-status-success/20 text-status-success">
              ↑ מגמת עלייה
            </span>
          )}
        </div>

        <div className="flex items-end gap-1.5 h-[140px]">
          {data.weeklyChart.map((week, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full">
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-md bg-gradient-to-t ${getBarColor(week.workouts, 3)} ${getBarHeightClass(week.workouts, maxWeekly)} transition-all duration-500`}
                />
              </div>
              <div className="text-[9px] text-text-muted mt-1.5 text-center truncate w-full">
                {week.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workout distribution */}
      {data.workoutDistribution.length > 0 && (
        <div className="bg-dark-card/80 border border-dark-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-text-primary mb-3">
            📋 התפלגות לפי סוג אימון
          </h3>

          <div className="space-y-3">
            {data.workoutDistribution.map((dist, i) => {
              const colors = DIST_COLORS[i % DIST_COLORS.length]
              return (
                <div key={dist.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 w-[120px] flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className="text-[13px] text-text-primary truncate">{dist.label}</span>
                  </div>
                  <div className="flex-1 h-2 bg-dark-surface rounded overflow-hidden">
                    <div className={`h-full rounded ${colors.bg} ${getDistWidthClass(dist.percentage)}`} />
                  </div>
                  <span className="text-sm font-semibold text-text-primary w-10 text-left">{dist.percentage}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <AIInsights insights={data.totalInsights} />
    </div>
  )
}
