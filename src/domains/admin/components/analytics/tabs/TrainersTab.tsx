import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { computeTrainerSummaries } from '../aggregations'
import { DataTable, type DataTableColumn } from '../DataTable'
import { LoadingState } from '../LoadingState'
import { EmptyState } from '../EmptyState'
import { StatusBadge, SecondaryBadge } from '../StatusBadge'
import { useAnalyticsData } from '../useAnalyticsData'
import { useDateRange } from '../useDateRange'
import type { TrainerSummary } from '../analytics.types'

type SortKey = 'name' | 'traineeCount' | 'activePct' | 'avgWeekly'
type SortDir = 'asc' | 'desc'

export function TrainersTab() {
  const { range } = useDateRange()
  const { isLoading, isError, current, workoutsLast90Days, error } = useAnalyticsData(range)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('traineeCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const navigate = useNavigate()

  const trainers = useMemo<TrainerSummary[]>(() => {
    if (!current) return []
    const all = computeTrainerSummaries(current, workoutsLast90Days)
    const q = search.trim().toLowerCase()
    const filtered = q
      ? all.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
      : all
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name, 'he') * dir
        case 'traineeCount':
          return (a.traineeCount - b.traineeCount) * dir
        case 'activePct':
          return (a.activeTraineePct - b.activeTraineePct) * dir
        case 'avgWeekly':
          return (a.avgWeeklyPerTrainee - b.avgWeeklyPerTrainee) * dir
      }
    })
  }, [current, workoutsLast90Days, search, sortKey, sortDir])

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? '')}
      />
    )
  }

  const columns: DataTableColumn<TrainerSummary>[] = [
    {
      key: 'name',
      header: 'שם',
      mobilePrimary: true,
      render: (t) => (
        <span className="flex items-center gap-2 flex-wrap">
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
      key: 'status',
      header: 'סטטוס',
      align: 'center',
      render: (t) => <StatusBadge active={t.isActive} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או אימייל"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-surface-container border border-dark-border text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary-main"
          />
        </div>
        <SortControls
          sortKey={sortKey}
          sortDir={sortDir}
          onChange={(k, d) => {
            setSortKey(k)
            setSortDir(d)
          }}
        />
      </div>
      <DataTable
        rows={trainers}
        columns={columns}
        rowKey={(t) => t.trainerId}
        onRowClick={(t) => navigate(`/admin/analytics/trainer/${t.trainerId}`)}
        emptyText="אין מאמנים שתואמים את החיפוש"
      />
    </div>
  )
}

function SortControls({
  sortKey,
  sortDir,
  onChange,
}: {
  sortKey: SortKey
  sortDir: SortDir
  onChange: (k: SortKey, d: SortDir) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={sortKey}
        onChange={(e) => onChange(e.target.value as SortKey, sortDir)}
        className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 focus:outline-none focus:border-primary-main"
        aria-label="מיון לפי"
      >
        <option value="traineeCount">לפי מספר מתאמנים</option>
        <option value="activePct">לפי פעילים %</option>
        <option value="avgWeekly">לפי ממוצע שבועי</option>
        <option value="name">לפי שם</option>
      </select>
      <button
        type="button"
        onClick={() => onChange(sortKey, sortDir === 'asc' ? 'desc' : 'asc')}
        className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 hover:bg-surface-container-low min-h-[44px]"
        aria-label={`כיוון מיון: ${sortDir === 'asc' ? 'עולה' : 'יורד'}`}
      >
        {sortDir === 'asc' ? 'עולה ↑' : 'יורד ↓'}
      </button>
    </div>
  )
}
