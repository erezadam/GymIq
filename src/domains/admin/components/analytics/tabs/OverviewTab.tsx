import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeCohorts,
  computeDailyTrend,
  computeOverviewKpis,
  computeTopExercises,
  computeTopTrainers,
  computeTrainerSummaries,
  segmentUsers,
} from '../aggregations'
import { CohortHeatmap } from '../CohortHeatmap'
import { DataTable, type DataTableColumn } from '../DataTable'
import { ExerciseBarChart } from '../ExerciseBarChart'
import { InsightStrip } from '../InsightStrip'
import { KpiCard } from '../KpiCard'
import { LoadingState } from '../LoadingState'
import { EmptyState } from '../EmptyState'
import { StatusBadge, SecondaryBadge } from '../StatusBadge'
import { TrendLineChart } from '../TrendLineChart'
import { UserSegmentBar } from '../UserSegmentBar'
import { useAnalyticsData } from '../useAnalyticsData'
import { useDateRange } from '../useDateRange'
import { buildInsights } from '../insights'
import type { TrainerSummary } from '../analytics.types'

export function OverviewTab() {
  const { range } = useDateRange()
  const { isLoading, isError, error, current, previous, workoutsLast90Days, workoutsExtended } =
    useAnalyticsData(range)
  const navigate = useNavigate()

  const view = useMemo(() => {
    if (!current || !previous) return null
    const kpis = computeOverviewKpis(current, previous)
    const segmentation = segmentUsers(current.users, workoutsLast90Days)
    const dailyTrend = computeDailyTrend(current)
    const topExercises = computeTopExercises(current, previous, 6)
    const trainers = computeTrainerSummaries(current, workoutsLast90Days)
    const topTrainers = computeTopTrainers(trainers, 5)
    const cohorts = computeCohorts(current.users, workoutsExtended, range.to, 6)
    const insights = buildInsights({ dataset: current, trainers, topExercises })
    return { kpis, segmentation, dailyTrend, topExercises, topTrainers, cohorts, insights }
  }, [current, previous, workoutsLast90Days, workoutsExtended, range.to])

  if (isLoading) return <LoadingState rows={5} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? 'נסה שוב מאוחר יותר')}
      />
    )
  }
  if (!view || !current) return <LoadingState rows={5} />

  const noWorkouts = current.workouts.length === 0
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="משתמשים פעילים (WAU)" kpi={view.kpis.wau} />
        <KpiCard label="סה״כ אימונים" kpi={view.kpis.totalWorkouts} />
        <KpiCard
          label="ממוצע לשבוע למשתמש"
          kpi={view.kpis.avgPerUserWeekly}
          hint={`חודשי: ${view.kpis.avgPerUserMonthly.display ?? view.kpis.avgPerUserMonthly.value}`}
        />
        <KpiCard label="שימור 30 יום" kpi={view.kpis.retention30} />
      </div>

      {/* Segmentation strip */}
      <UserSegmentBar segmentation={view.segmentation} />

      {/* Trend */}
      {noWorkouts ? (
        <EmptyState
          title="אין אימונים בטווח הנבחר"
          description="נסה טווח רחב יותר או בדוק שיש משתמשים פעילים."
        />
      ) : (
        <TrendLineChart data={view.dailyTrend} />
      )}

      {/* Top exercises + Cohorts side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExerciseBarChart data={view.topExercises} />
        <CohortHeatmap rows={view.cohorts} />
      </div>

      {/* Top trainers */}
      <TopTrainersTable
        trainers={view.topTrainers}
        onRowClick={(t) => navigate(`/admin/analytics/trainer/${t.trainerId}`)}
      />

      {/* Insights */}
      <InsightStrip insights={view.insights} />
    </div>
  )
}

function TopTrainersTable({
  trainers,
  onRowClick,
}: {
  trainers: TrainerSummary[]
  onRowClick: (t: TrainerSummary) => void
}) {
  const columns: DataTableColumn<TrainerSummary>[] = [
    {
      key: 'name',
      header: 'מאמן',
      mobilePrimary: true,
      render: (t) => (
        <span className="flex items-center gap-2">
          <span>{t.name}</span>
          {t.isAlsoTrainee && <SecondaryBadge label="גם מתאמן" tone="accent" />}
        </span>
      ),
    },
    {
      key: 'traineeCount',
      header: 'מתאמנים',
      align: 'center',
      render: (t) => <span className="tabular-nums">{t.traineeCount}</span>,
    },
    {
      key: 'activePct',
      header: 'פעילים %',
      align: 'center',
      render: (t) => <span className="tabular-nums">{Math.round(t.activeTraineePct)}%</span>,
    },
    {
      key: 'avgWeekly',
      header: 'ממוצע שבועי',
      align: 'center',
      render: (t) => <span className="tabular-nums">{t.avgWeeklyPerTrainee.toFixed(1)}</span>,
    },
    {
      key: 'own',
      header: 'אימוני המאמן (30 יום)',
      align: 'center',
      render: (t) =>
        t.ownWorkoutsLast30d === null ? (
          <span className="text-on-surface-variant">—</span>
        ) : (
          <span className="tabular-nums">{t.ownWorkoutsLast30d}</span>
        ),
    },
    {
      key: 'status',
      header: 'סטטוס',
      align: 'center',
      hideOnMobile: false,
      render: (t) => <StatusBadge active={t.isActive} />,
    },
  ]
  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-on-surface">מאמנים מובילים</h3>
        <span className="text-sm text-on-surface-variant">לחץ על שורה לפירוט</span>
      </div>
      <DataTable
        rows={trainers}
        columns={columns}
        rowKey={(t) => t.trainerId}
        onRowClick={onRowClick}
        emptyText="אין מאמנים"
      />
    </div>
  )
}
