import { useMemo, useState } from 'react'
import { Search, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { computeExerciseUsageTable } from '../aggregations'
import { DataTable, type DataTableColumn } from '../DataTable'
import { LoadingState } from '../LoadingState'
import { EmptyState } from '../EmptyState'
import { useAnalyticsData } from '../useAnalyticsData'
import { useDateRange } from '../useDateRange'
import type { ExerciseUsageRow } from '../analytics.types'

type SortKey = 'name' | 'totalPerformances' | 'uniqueUsers' | 'delta'
type SortDir = 'asc' | 'desc'

export function ExercisesTab() {
  const { range } = useDateRange()
  const { isLoading, isError, current, previous, error } = useAnalyticsData(range)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalPerformances')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const rows = useMemo<ExerciseUsageRow[]>(() => {
    if (!current || !previous) return []
    const all = computeExerciseUsageTable(current, previous)
    const q = search.trim().toLowerCase()
    const filtered = q ? all.filter((e) => e.exerciseName.toLowerCase().includes(q)) : all
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.exerciseName.localeCompare(b.exerciseName, 'he') * dir
        case 'totalPerformances':
          return (a.totalPerformances - b.totalPerformances) * dir
        case 'uniqueUsers':
          return (a.uniqueUsers - b.uniqueUsers) * dir
        case 'delta': {
          const av = a.deltaPct ?? -Infinity
          const bv = b.deltaPct ?? -Infinity
          return (av - bv) * dir
        }
      }
    })
  }, [current, previous, search, sortKey, sortDir])

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? '')}
      />
    )
  }

  const columns: DataTableColumn<ExerciseUsageRow>[] = [
    {
      key: 'name',
      header: 'תרגיל',
      mobilePrimary: true,
      render: (e) => e.exerciseName,
    },
    {
      key: 'total',
      header: 'סה״כ אימונים',
      align: 'center',
      render: (e) => <span className="tabular-nums">{e.totalPerformances}</span>,
    },
    {
      key: 'unique',
      header: 'מתאמנים שונים',
      align: 'center',
      render: (e) => <span className="tabular-nums">{e.uniqueUsers}</span>,
    },
    {
      key: 'delta',
      header: 'מגמה',
      align: 'center',
      render: (e) => <DeltaCell pct={e.deltaPct} />,
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
            placeholder="חיפוש תרגיל"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-surface-container border border-dark-border text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary-main"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 focus:outline-none focus:border-primary-main"
          aria-label="מיון"
        >
          <option value="totalPerformances">לפי סה״כ אימונים</option>
          <option value="uniqueUsers">לפי מתאמנים שונים</option>
          <option value="delta">לפי מגמה</option>
          <option value="name">לפי שם</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 hover:bg-surface-container-low min-h-[44px]"
        >
          {sortDir === 'asc' ? 'עולה ↑' : 'יורד ↓'}
        </button>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(e) => e.exerciseId}
        emptyText="אין נתונים"
      />
    </div>
  )
}

function DeltaCell({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-on-surface-variant">—</span>
  }
  const tone =
    pct > 0.5 ? 'text-status-success' : pct < -0.5 ? 'text-status-error' : 'text-on-surface-variant'
  const Icon = pct > 0.5 ? ArrowUp : pct < -0.5 ? ArrowDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${tone}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {pct > 0 ? '+' : ''}
      {Math.round(pct)}%
    </span>
  )
}
