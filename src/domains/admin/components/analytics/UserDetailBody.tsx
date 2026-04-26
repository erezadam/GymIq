/**
 * Personal stats body — KPIs + heatmap + frequency chart + top exercises +
 * recent workouts. Shared between TraineeDetailScreen and TrainerDetailScreen
 * (when the trainer is also a trainee).
 */
import { ActivityHeatmap } from './ActivityHeatmap'
import { ExerciseBarChart } from './ExerciseBarChart'
import { KpiCard } from './KpiCard'
import { MonthlyFrequencyChart } from './MonthlyFrequencyChart'
import { DataTable, type DataTableColumn } from './DataTable'
import { hebShortDate } from './dateUtils'
import type { RecentWorkoutRow, UserDetailStats } from './analytics.types'

interface UserDetailBodyProps {
  stats: UserDetailStats
}

export function UserDetailBody({ stats }: UserDetailBodyProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="סה״כ אימונים" kpi={pseudoKpi(stats.totalWorkouts)} />
        <KpiCard label="החודש" kpi={pseudoKpi(stats.thisMonth)} />
        <KpiCard
          label="ממוצע שבועי"
          kpi={pseudoKpi(stats.avgWeekly, stats.avgWeekly.toFixed(1))}
        />
        <KpiCard
          label="משך ממוצע"
          kpi={pseudoKpi(stats.avgDuration, `${stats.avgDuration} ד׳`)}
        />
        <KpiCard
          label="השלמה ממוצעת"
          kpi={pseudoKpi(stats.avgCompletionPct, `${stats.avgCompletionPct}%`)}
        />
      </div>

      <ActivityHeatmap cells={stats.heatmap} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyFrequencyChart data={stats.monthlyFrequency} />
        <ExerciseBarChart data={stats.topExercises} title="תרגילים מועדפים" />
      </div>

      <RecentWorkoutsTable rows={stats.recentWorkouts} />
    </div>
  )
}

function pseudoKpi(value: number, display?: string) {
  return { value, display, deltaPct: null, trend: 'flat' as const }
}

function RecentWorkoutsTable({ rows }: { rows: RecentWorkoutRow[] }) {
  const columns: DataTableColumn<RecentWorkoutRow>[] = [
    {
      key: 'date',
      header: 'תאריך',
      mobilePrimary: true,
      render: (r) => hebShortDate(r.date),
    },
    {
      key: 'name',
      header: 'אימון',
      render: (r) => r.name,
    },
    {
      key: 'duration',
      header: 'משך',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.duration} ד׳</span>,
    },
    {
      key: 'exerciseCount',
      header: 'תרגילים',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.exerciseCount}</span>,
    },
    {
      key: 'completion',
      header: 'השלמה',
      align: 'center',
      render: (r) => <span className="tabular-nums">{r.completionPct}%</span>,
    },
  ]
  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <h3 className="text-base font-semibold text-on-surface mb-3">אימונים אחרונים</h3>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} emptyText="אין אימונים אחרונים" />
    </div>
  )
}
