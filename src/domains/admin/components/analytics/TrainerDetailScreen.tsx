import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingState } from './LoadingState'
import { EmptyState } from './EmptyState'
import { KpiCard } from './KpiCard'
import { DataTable, type DataTableColumn } from './DataTable'
import { StatusBadge } from './StatusBadge'
import { UserDetailBody } from './UserDetailBody'
import { UserDetailHeader } from './UserDetailHeader'
import { hebShortDate } from './dateUtils'
import { useDateRange } from './useDateRange'
import { useTrainerDetail } from './useTrainerDetail'
import { DateRangePicker } from './DateRangePicker'
import type { TraineeSummary } from './analytics.types'

export default function TrainerDetailScreen() {
  const params = useParams<{ id: string }>()
  const trainerId = params.id
  const { range, setRangeKey } = useDateRange()
  const navigate = useNavigate()
  const { isLoading, isError, error, trainerStats, trainees, trainerExists } = useTrainerDetail(
    trainerId,
    range,
  )

  const groupKpis = useMemo(() => {
    const total = trainees.length
    const active = trainees.filter((t) => t.isActive).length
    const sumWeekly = trainees.reduce((acc, t) => acc + t.avgWeekly, 0)
    const avgWeekly = total > 0 ? sumWeekly / total : 0
    let mostActive: TraineeSummary | null = null
    let leastActive: TraineeSummary | null = null
    for (const t of trainees) {
      if (!mostActive || t.avgWeekly > mostActive.avgWeekly) mostActive = t
      if (!leastActive || t.avgWeekly < leastActive.avgWeekly) leastActive = t
    }
    return {
      total,
      active,
      activePct: total > 0 ? (active / total) * 100 : 0,
      avgWeekly,
      mostActive,
      leastActive,
    }
  }, [trainees])

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? '')}
      />
    )
  }
  if (!trainerExists || !trainerStats) {
    return (
      <EmptyState
        title="המאמן לא נמצא"
        description="ייתכן שהמשתמש נמחק או שאין לו תפקיד מאמן."
      />
    )
  }

  const traineeColumns: DataTableColumn<TraineeSummary>[] = [
    {
      key: 'name',
      header: 'שם',
      mobilePrimary: true,
      render: (t) => t.name,
    },
    {
      key: 'status',
      header: 'סטטוס',
      align: 'center',
      render: (t) => <StatusBadge active={t.isActive} />,
    },
    {
      key: 'thisMonth',
      header: 'אימונים החודש',
      align: 'center',
      render: (t) => <span className="tabular-nums">{t.workoutsThisMonth}</span>,
    },
    {
      key: 'avgWeekly',
      header: 'ממוצע שבועי',
      align: 'center',
      render: (t) => <span className="tabular-nums">{t.avgWeekly.toFixed(1)}</span>,
    },
    {
      key: 'lastActivity',
      header: 'פעילות אחרונה',
      align: 'center',
      render: (t) =>
        t.lastActivityAt ? (
          <span className="text-on-surface-variant">{hebShortDate(t.lastActivityAt)}</span>
        ) : (
          <span className="text-on-surface-variant">—</span>
        ),
    },
    {
      key: 'completion',
      header: 'השלמה %',
      align: 'center',
      render: (t) => <span className="tabular-nums">{t.avgCompletionPct}%</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <UserDetailHeader stats={trainerStats} modeLabel="תצוגת מאמן" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-on-surface">המתאמנים שלי</h2>
        <DateRangePicker value={range.key} onChange={setRangeKey} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="מתאמנים" kpi={pseudoKpi(groupKpis.total)} />
        <KpiCard label="פעילים %" kpi={pseudoKpi(groupKpis.activePct, `${Math.round(groupKpis.activePct)}%`)} />
        <KpiCard label="ממוצע שבועי" kpi={pseudoKpi(groupKpis.avgWeekly, groupKpis.avgWeekly.toFixed(1))} />
        <KpiCard
          label="הכי פעיל"
          kpi={pseudoKpi(
            groupKpis.mostActive?.avgWeekly ?? 0,
            groupKpis.mostActive?.name ?? '—',
          )}
        />
        <KpiCard
          label="הכי פחות פעיל"
          kpi={pseudoKpi(
            groupKpis.leastActive?.avgWeekly ?? 0,
            groupKpis.leastActive?.name ?? '—',
          )}
        />
      </div>

      <DataTable
        rows={trainees}
        columns={traineeColumns}
        rowKey={(t) => t.userId}
        onRowClick={(t) => navigate(`/admin/analytics/trainee/${t.userId}`)}
        emptyText="אין מתאמנים משויכים"
      />

      {trainerStats.isTrainerAlsoTrainee && (
        <div className="space-y-3 pt-2">
          <h2 className="text-lg font-semibold text-on-surface">האימונים האישיים שלי</h2>
          <UserDetailBody stats={trainerStats} />
        </div>
      )}
    </div>
  )
}

function pseudoKpi(value: number, display?: string) {
  return { value, display, deltaPct: null, trend: 'flat' as const }
}
