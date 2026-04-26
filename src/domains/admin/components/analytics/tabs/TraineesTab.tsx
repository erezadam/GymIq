import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { computeTraineeSummaries } from '../aggregations'
import { DataTable, type DataTableColumn } from '../DataTable'
import { LoadingState } from '../LoadingState'
import { EmptyState } from '../EmptyState'
import { StatusBadge } from '../StatusBadge'
import { useAnalyticsData } from '../useAnalyticsData'
import { useDateRange } from '../useDateRange'
import { hebShortDate } from '../dateUtils'
import type { TraineeSummary } from '../analytics.types'

type SortKey = 'name' | 'workoutsThisMonth' | 'avgWeekly' | 'lastActivity' | 'completion'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'

export function TraineesTab() {
  const { range } = useDateRange()
  const { isLoading, isError, current, error } = useAnalyticsData(range)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('lastActivity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [trainerFilter, setTrainerFilter] = useState<string>('all')
  const navigate = useNavigate()

  const trainerOptions = useMemo(() => {
    if (!current) return []
    return current.users
      .filter((u) => u.role === 'trainer')
      .map((u) => ({
        id: u.uid,
        name: u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      }))
  }, [current])

  const trainees = useMemo<TraineeSummary[]>(() => {
    if (!current) return []
    const all = computeTraineeSummaries(current)
    const q = search.trim().toLowerCase()
    const filtered = all.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false
      if (statusFilter === 'active' && !t.isActive) return false
      if (statusFilter === 'inactive' && t.isActive) return false
      if (trainerFilter !== 'all') {
        if (trainerFilter === 'none') {
          if (t.trainerId) return false
        } else if (t.trainerId !== trainerFilter) return false
      }
      return true
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name, 'he') * dir
        case 'workoutsThisMonth':
          return (a.workoutsThisMonth - b.workoutsThisMonth) * dir
        case 'avgWeekly':
          return (a.avgWeekly - b.avgWeekly) * dir
        case 'completion':
          return (a.avgCompletionPct - b.avgCompletionPct) * dir
        case 'lastActivity': {
          const av = a.lastActivityAt?.getTime() ?? 0
          const bv = b.lastActivityAt?.getTime() ?? 0
          return (av - bv) * dir
        }
      }
    })
  }, [current, search, sortKey, sortDir, statusFilter, trainerFilter])

  if (isLoading) return <LoadingState rows={6} />
  if (isError) {
    return (
      <EmptyState
        title="טעינת הנתונים נכשלה"
        description={String((error as { message?: string })?.message ?? '')}
      />
    )
  }

  const columns: DataTableColumn<TraineeSummary>[] = [
    {
      key: 'name',
      header: 'שם',
      mobilePrimary: true,
      render: (t) => t.name,
    },
    {
      key: 'trainer',
      header: 'מאמן',
      render: (t) => (
        <span className="text-on-surface-variant">{t.trainerName ?? 'ללא מאמן'}</span>
      ),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם או אימייל"
            className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-surface-container border border-dark-border text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary-main"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 focus:outline-none focus:border-primary-main"
          aria-label="סינון לפי סטטוס"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעילים</option>
          <option value="inactive">לא פעילים</option>
        </select>
        <select
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2.5 focus:outline-none focus:border-primary-main"
          aria-label="סינון לפי מאמן"
        >
          <option value="all">כל המאמנים</option>
          <option value="none">ללא מאמן</option>
          {trainerOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 text-base text-on-surface-variant">
        <span>מיון:</span>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2 focus:outline-none focus:border-primary-main"
          aria-label="מיון לפי"
        >
          <option value="lastActivity">פעילות אחרונה</option>
          <option value="workoutsThisMonth">אימונים החודש</option>
          <option value="avgWeekly">ממוצע שבועי</option>
          <option value="completion">% השלמה</option>
          <option value="name">שם</option>
        </select>
        <button
          type="button"
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          className="rounded-xl bg-surface-container border border-dark-border text-on-surface px-3 py-2 hover:bg-surface-container-low min-h-[44px]"
        >
          {sortDir === 'asc' ? 'עולה ↑' : 'יורד ↓'}
        </button>
        <span className="ms-auto">{trainees.length} מתאמנים</span>
      </div>

      <DataTable
        rows={trainees}
        columns={columns}
        rowKey={(t) => t.userId}
        onRowClick={(t) => navigate(`/admin/analytics/trainee/${t.userId}`)}
        emptyText="אין מתאמנים תואמים"
      />
    </div>
  )
}
