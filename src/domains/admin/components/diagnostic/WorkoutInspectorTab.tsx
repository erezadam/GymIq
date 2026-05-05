import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getWorkoutsForUser, getWorkoutRaw } from '../../services/diagnosticService'
import type { WorkoutFilters } from '../../types/diagnostic.types'
import type { WorkoutCompletionStatus, WorkoutHistorySummary } from '@/domains/workouts/types'
import { JsonViewer } from './JsonViewer'

const PAGE_SIZE = 50
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const STATUS_OPTIONS: WorkoutCompletionStatus[] = [
  'completed',
  'partial',
  'in_progress',
  'planned',
  'cancelled',
]

function defaultDateRange() {
  const now = new Date()
  return {
    from: toLocalDatetimeInput(new Date(now.getTime() - 7 * ONE_DAY_MS)),
    to: toLocalDatetimeInput(now),
  }
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

interface Props {
  userId: string | null
}

export function WorkoutInspectorTab({ userId }: Props) {
  const initial = useMemo(defaultDateRange, [])
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo, setDateTo] = useState(initial.to)
  const [statuses, setStatuses] = useState<WorkoutCompletionStatus[]>([])
  const [deletedFilter, setDeletedFilter] = useState<WorkoutFilters['deletedFilter']>('either')
  const [cursors, setCursors] = useState<Date[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  // Drop any open workout-detail modal when the investigated user changes —
  // otherwise the modal would briefly fetch a workout doc belonging to the
  // previous subject (the rules allow admin reads, but the UX would show a
  // doc unrelated to the new subject's listing).
  useEffect(() => {
    setSelectedWorkoutId(null)
  }, [userId])

  const filters = useMemo<WorkoutFilters>(
    () => ({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      deletedFilter,
      pageSize: PAGE_SIZE,
      cursor: cursors[cursors.length - 1],
    }),
    [dateFrom, dateTo, statuses, deletedFilter, cursors],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['diagnostic-workouts', userId, filters],
    queryFn: () => getWorkoutsForUser(userId!, filters),
    enabled: !!userId,
    staleTime: 30_000,
  })

  if (!userId) {
    return (
      <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
        בחר משתמש לתחילת חקירה.
      </div>
    )
  }

  const toggleStatus = (s: WorkoutCompletionStatus) => {
    setCursors([])
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-dark-surface border border-dark-border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-text-muted mb-1">מתאריך</span>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => {
                setCursors([])
                setDateFrom(e.target.value)
              }}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary"
            />
          </label>
          <label className="text-sm">
            <span className="block text-text-muted mb-1">עד תאריך</span>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => {
                setCursors([])
                setDateTo(e.target.value)
              }}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary"
            />
          </label>
        </div>

        <div>
          <span className="block text-sm text-text-muted mb-2">סטטוס</span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => {
              const active = statuses.includes(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-primary-500/20 border-primary-400 text-primary-300'
                      : 'bg-dark-bg border-dark-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <span className="block text-sm text-text-muted mb-2">נמחק רכות</span>
          <div className="flex gap-2">
            {(['either', 'yes', 'no'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setCursors([])
                  setDeletedFilter(opt)
                }}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  deletedFilter === opt
                    ? 'bg-primary-500/20 border-primary-400 text-primary-300'
                    : 'bg-dark-bg border-dark-border text-text-muted hover:text-text-primary'
                }`}
              >
                {opt === 'either' ? 'הכל' : opt === 'yes' ? 'רק נמחקים' : 'רק לא-נמחקים'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl bg-status-error/10 border border-status-error/30 p-4 text-status-error">
          שגיאה בטעינת אימונים: {(error as Error)?.message}
        </div>
      )}

      {!isLoading && !isError && (data?.workouts.length ?? 0) === 0 && (
        <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
          אין אימונים תואמים לפילטרים הנוכחיים.
        </div>
      )}

      {(data?.workouts.length ?? 0) > 0 && (
        <div className="rounded-xl bg-dark-surface border border-dark-border overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-dark-bg text-text-muted text-xs uppercase">
              <tr>
                <th className="text-right p-3">id</th>
                <th className="text-right p-3">name</th>
                <th className="text-right p-3">status</th>
                <th className="text-right p-3">date</th>
                <th className="text-right p-3">נמחק</th>
                <th className="text-right p-3">תרגילים</th>
                <th className="text-right p-3">תוכנית</th>
              </tr>
            </thead>
            <tbody>
              {data?.workouts.map((w) => (
                <WorkoutRow
                  key={w.id}
                  workout={w}
                  onClick={() => setSelectedWorkoutId(w.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursors((c) => c.slice(0, -1))}
          disabled={cursors.length === 0}
          className="px-4 py-2 text-sm bg-dark-surface border border-dark-border rounded-lg text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          → קודם
        </button>
        <span className="text-sm text-text-muted">עמוד {cursors.length + 1}</span>
        <button
          type="button"
          onClick={() => {
            if (data?.nextCursor) setCursors((c) => [...c, data.nextCursor!])
          }}
          disabled={!data?.hasMore || !data?.nextCursor}
          className="px-4 py-2 text-sm bg-dark-surface border border-dark-border rounded-lg text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          הבא ←
        </button>
      </div>

      {selectedWorkoutId && (
        <WorkoutDetailModal
          workoutId={selectedWorkoutId}
          onClose={() => setSelectedWorkoutId(null)}
        />
      )}
    </div>
  )
}

function WorkoutRow({
  workout,
  onClick,
}: {
  workout: WorkoutHistorySummary
  onClick: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className="border-t border-dark-border hover:bg-dark-bg/50 cursor-pointer"
    >
      <td className="p-3 font-mono text-xs text-text-muted">{workout.id.slice(0, 8)}…</td>
      <td className="p-3 text-text-primary">{workout.name}</td>
      <td className="p-3">
        <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 text-xs">
          {workout.status}
        </span>
      </td>
      <td className="p-3 text-text-muted whitespace-nowrap">{formatDateTime(workout.date)}</td>
      <td className="p-3">
        {workout.deletedByTrainee ? (
          <span className="text-status-error text-xs">⛔ נמחק</span>
        ) : (
          <span className="text-text-muted text-xs">—</span>
        )}
      </td>
      <td className="p-3 text-text-muted">{workout.totalExercises}</td>
      <td className="p-3 text-text-muted text-xs">{workout.programId ? '✓' : '—'}</td>
    </tr>
  )
}

function WorkoutDetailModal({
  workoutId,
  onClose,
}: {
  workoutId: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['diagnostic-workout-raw', workoutId],
    queryFn: () => getWorkoutRaw(workoutId),
    staleTime: 30_000,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary font-mono">
            workoutHistory/{workoutId.slice(0, 12)}…
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-bg transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && <div className="text-text-muted">טוען…</div>}
          {isError && <div className="text-status-error">שגיאה בטעינת ה-doc.</div>}
          {!isLoading && !isError && data === null && (
            <div className="text-text-muted">ה-doc לא נמצא ב-Firestore.</div>
          )}
          {data && <JsonViewer data={{ id: workoutId, ...data }} maxHeight="max-h-[70vh]" />}
        </div>
      </div>
    </div>
  )
}
