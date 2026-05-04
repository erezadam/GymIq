import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getSessionLogs, getUserSessions } from '../../services/diagnosticService'
import type { DiagnosticLog, SessionSummary } from '../../types/diagnostic.types'
import { JsonViewer } from './JsonViewer'

function formatDuration(start: Date, end: Date): string {
  const seconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSec = seconds % 60
  if (minutes < 60) return `${minutes}m ${remSec}s`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return `${hours}h ${remMin}m`
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatRelative(start: Date, ts: Date): string {
  const ms = ts.getTime() - start.getTime()
  if (ms < 1000) return `+${ms}ms`
  return `+${(ms / 1000).toFixed(3)}s`
}

export function SessionReplayTab() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  const sessionsQuery = useQuery({
    queryKey: ['diagnostic-sessions'],
    queryFn: getUserSessions,
    staleTime: 30_000,
  })

  const logsQuery = useQuery({
    queryKey: ['diagnostic-session-logs', selectedSessionId],
    queryFn: () => getSessionLogs(selectedSessionId),
    enabled: !!selectedSessionId,
    staleTime: 30_000,
  })

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-dark-surface border border-dark-border p-4">
        <label className="text-sm block">
          <span className="block text-text-muted mb-1">בחר session</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary"
            disabled={sessionsQuery.isLoading || (sessionsQuery.data?.length ?? 0) === 0}
          >
            <option value="">— בחר session —</option>
            {sessionsQuery.data?.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.sessionId.slice(0, 12)}… │ {formatDateTime(s.startTime)} │ ⏱ {formatDuration(s.startTime, s.endTime)} │ {s.eventCount} events
              </option>
            ))}
          </select>
        </label>
      </div>

      {sessionsQuery.isError && (
        <div className="rounded-xl bg-status-error/10 border border-status-error/30 p-4 text-status-error">
          שגיאה בטעינת sessions: {(sessionsQuery.error as Error)?.message}
        </div>
      )}

      {!sessionsQuery.isLoading &&
        !sessionsQuery.isError &&
        (sessionsQuery.data?.length ?? 0) === 0 && (
          <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
            אין sessions. כדי ליצור session חדש — פתח את האפליקציה בחשבון a@gmail.com.
          </div>
        )}

      {!selectedSessionId && (sessionsQuery.data?.length ?? 0) > 0 && (
        <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
          בחר session להצגה.
        </div>
      )}

      {selectedSessionId && logsQuery.isLoading && (
        <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
          טוען לוגים…
        </div>
      )}

      {selectedSessionId && (logsQuery.data?.length ?? 0) > 0 && logsQuery.data && (
        <SessionTimeline logs={logsQuery.data} session={
          sessionsQuery.data?.find((s) => s.sessionId === selectedSessionId)
        } />
      )}
    </div>
  )
}

function SessionTimeline({
  logs,
  session,
}: {
  logs: DiagnosticLog[]
  session: SessionSummary | undefined
}) {
  const start = logs[0]?.timestamp ?? new Date()

  return (
    <div className="rounded-xl bg-dark-surface border border-dark-border p-4 space-y-2">
      {session && (
        <div className="flex items-center justify-between text-sm text-text-muted pb-3 border-b border-dark-border mb-2">
          <span>session {session.sessionId.slice(0, 12)}…</span>
          <span>
            {formatDateTime(session.startTime)} → ⏱ {formatDuration(session.startTime, session.endTime)} ({session.eventCount} events)
          </span>
        </div>
      )}
      <ol className="space-y-1">
        {logs.map((log) => (
          <TimelineRow key={log.id} log={log} sessionStart={start} />
        ))}
      </ol>
    </div>
  )
}

function TimelineRow({
  log,
  sessionStart,
}: {
  log: DiagnosticLog
  sessionStart: Date
}) {
  const [open, setOpen] = useState(false)
  const onBehalf =
    log.workoutOwnerId &&
    log.workoutOwnerId !== log.userId &&
    log.workoutOwnerId !== ''

  return (
    <li className="border border-dark-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-right hover:bg-dark-bg/50 transition-colors"
      >
        <span className="font-mono text-xs text-text-muted w-20 text-left" dir="ltr">
          {formatRelative(sessionStart, log.timestamp)}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 text-xs font-mono whitespace-nowrap">
          {log.eventType}
        </span>
        <span className="font-mono text-xs text-text-muted truncate flex-1">
          {log.workoutId ? `wid: ${log.workoutId.slice(0, 8)}…` : ''}
        </span>
        {onBehalf && (
          <span className="px-2 py-0.5 rounded-md bg-status-warning/20 text-status-warning text-xs whitespace-nowrap">
            🟡 acting on behalf of {log.workoutOwnerId?.slice(0, 8)}…
          </span>
        )}
        {open ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {open && (
        <div className="bg-dark-bg/30 p-3 space-y-2">
          <JsonViewer data={log.payload} maxHeight="max-h-72" />
          {log.stackTrace && (
            <pre
              dir="ltr"
              className="p-3 text-xs font-mono text-text-muted bg-dark-bg border border-dark-border rounded-lg overflow-auto max-h-48 whitespace-pre"
            >
              {log.stackTrace}
            </pre>
          )}
        </div>
      )}
    </li>
  )
}
