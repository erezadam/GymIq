import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { getDiagnosticLogs } from '../../services/diagnosticService'
import {
  DIAGNOSTIC_EVENT_TYPES,
  type DiagnosticEventType,
  type DiagnosticLog,
} from '../../types/diagnostic.types'
import { JsonViewer } from './JsonViewer'

const PAGE_SIZE = 50
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getTime() - ONE_DAY_MS)
  return { from: toLocalDatetimeInput(from), to: toLocalDatetimeInput(now) }
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

interface Props {
  userId: string | null
}

export function LogsTimelineTab({ userId }: Props) {
  const initial = useMemo(defaultDateRange, [])
  const [dateFrom, setDateFrom] = useState(initial.from)
  const [dateTo, setDateTo] = useState(initial.to)
  const [eventTypes, setEventTypes] = useState<DiagnosticEventType[]>([])
  const [sessionId, setSessionId] = useState('')
  const [cursors, setCursors] = useState<Date[]>([])

  const currentCursor = cursors[cursors.length - 1]

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      eventTypes: eventTypes.length > 0 ? eventTypes : undefined,
      sessionId: sessionId.trim() || undefined,
      pageSize: PAGE_SIZE,
      cursor: currentCursor,
    }),
    [dateFrom, dateTo, eventTypes, sessionId, currentCursor],
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['diagnostic-logs', userId, filters],
    queryFn: () => getDiagnosticLogs(userId!, filters),
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

  const toggleEventType = (t: DiagnosticEventType) => {
    setCursors([])
    setEventTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const reset = () => {
    const fresh = defaultDateRange()
    setDateFrom(fresh.from)
    setDateTo(fresh.to)
    setEventTypes([])
    setSessionId('')
    setCursors([])
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
          <span className="block text-sm text-text-muted mb-2">סוגי אירועים</span>
          <div className="flex flex-wrap gap-2">
            {DIAGNOSTIC_EVENT_TYPES.map((t) => {
              const active = eventTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleEventType(t)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-primary-500/20 border-primary-400 text-primary-300'
                      : 'bg-dark-bg border-dark-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        <label className="text-sm block">
          <span className="block text-text-muted mb-1">Session ID (אופציונלי)</span>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={sessionId}
              onChange={(e) => {
                setCursors([])
                setSessionId(e.target.value)
              }}
              placeholder="sess-..."
              className="w-full pr-9 pl-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary"
            />
          </div>
        </label>

        <div className="flex items-center justify-between pt-2 border-t border-dark-border">
          <button
            type="button"
            onClick={reset}
            className="text-sm text-text-muted hover:text-text-primary"
          >
            איפוס פילטרים
          </button>
          <span className="text-sm text-text-muted">
            {isLoading ? 'טוען…' : `${data?.logs.length ?? 0} לוגים בעמוד`}
          </span>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl bg-status-error/10 border border-status-error/30 p-4 text-status-error">
          שגיאה בטעינת לוגים: {(error as Error)?.message}
        </div>
      )}

      {!isLoading && !isError && (data?.logs.length ?? 0) === 0 && (
        <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
          אין לוגים בטווח הזה למשתמש זה.
          <br />
          <span className="text-xs">
            (אם הלוגים אמורים להיות פה ולא — ייתכן שה-kill switch כבוי או שפג זמן retention.)
          </span>
        </div>
      )}

      {(data?.logs.length ?? 0) > 0 && (
        <div className="rounded-xl bg-dark-surface border border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-dark-bg text-text-muted text-xs uppercase">
              <tr>
                <th className="text-right p-3">זמן</th>
                <th className="text-right p-3">event</th>
                <th className="text-right p-3">workoutId</th>
                <th className="text-right p-3">payload / stack</th>
              </tr>
            </thead>
            <tbody>{data?.logs.map((log) => <LogRow key={log.id} log={log} />)}</tbody>
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
            // Use nextCursor from the service (derived from the last RAW doc,
            // pre-filter) — using `data.logs[last]` would break when client-side
            // filters empty the visible page.
            if (data?.nextCursor) setCursors((c) => [...c, data.nextCursor!])
          }}
          disabled={!data?.hasMore || !data?.nextCursor}
          className="px-4 py-2 text-sm bg-dark-surface border border-dark-border rounded-lg text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          הבא ←
        </button>
      </div>
    </div>
  )
}

function LogRow({ log }: { log: DiagnosticLog }) {
  const [expanded, setExpanded] = useState(false)
  const [showStack, setShowStack] = useState(false)

  return (
    <>
      <tr className="border-t border-dark-border hover:bg-dark-bg/50">
        <td className="p-3 text-text-muted whitespace-nowrap font-mono text-xs">
          {formatTime(log.timestamp)}
        </td>
        <td className="p-3">
          <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 text-xs font-mono">
            {log.eventType}
          </span>
        </td>
        <td className="p-3 font-mono text-xs text-text-muted">
          {log.workoutId ? log.workoutId.slice(0, 8) + '…' : '—'}
        </td>
        <td className="p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              payload
            </button>
            {log.stackTrace && (
              <button
                type="button"
                onClick={() => setShowStack((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
              >
                {showStack ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                stack
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-dark-bg/30">
          <td colSpan={4} className="p-3">
            <JsonViewer data={log.payload} maxHeight="max-h-72" />
          </td>
        </tr>
      )}
      {showStack && log.stackTrace && (
        <tr className="bg-dark-bg/30">
          <td colSpan={4} className="p-3">
            <pre
              dir="ltr"
              className="p-3 text-xs font-mono text-text-muted bg-dark-bg border border-dark-border rounded-lg overflow-auto max-h-48 whitespace-pre"
            >
              {log.stackTrace}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}
