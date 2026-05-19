import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getDiagnosticLogs } from '../../services/diagnosticService'
import type { DiagnosticLog } from '../../types/diagnostic.types'
import { JsonViewer } from './JsonViewer'

const PAGE_SIZE = 200
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Loose shape for WORKOUT_INIT_TIMING payloads. Defined locally here (rather
// than importing from useActiveWorkout) to keep the admin domain decoupled
// from the workouts domain. Field shape mirrors what initWorkout writes; if
// the writer changes, only this file and one runtime guard need updating.
type ValidatePhase = 'init' | 'autosave'
interface TimingPayload {
  pathTaken: string
  totalMs: number
  gateConditions: {
    hasUser: boolean
    selectedExercisesCount: number
    isContinuingFromHistory: boolean
    hasTargetUserId: boolean
    hasPlannedWorkoutDocId: boolean
  }
  localStorageState: Record<string, unknown>
  durations: Record<string, number>
  // Validate section is split into two phase-tagged totals. Both can be
  // present in a single hydration cycle (continueFromHistory triggers init
  // AND autosave validations) — the UI surfaces them as two adjacent
  // columns so an analyst sees at a glance which phase was slow.
  validate?: {
    attempts: number
    attemptDurationsMs: number[]
    attemptResults: { valid: boolean; reason: string | null; phase?: ValidatePhase }[]
    initPhaseTotalMs?: number
    autosavePhaseTotalMs?: number
  }
  exerciseCount?: number
  networkType: string
  online: boolean
  outcome: string
}

function isTimingPayload(p: unknown): p is TimingPayload {
  if (!p || typeof p !== 'object') return false
  const o = p as Record<string, unknown>
  return (
    typeof o.pathTaken === 'string' &&
    typeof o.totalMs === 'number' &&
    typeof o.gateConditions === 'object' &&
    typeof o.durations === 'object'
  )
}

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function durationColorClass(ms: number): string {
  if (ms < 500) return 'text-status-success'
  if (ms < 2000) return 'text-status-warning'
  return 'text-status-error'
}

interface Props {
  userId: string | null
}

export function InitTimingTab({ userId }: Props) {
  // Default window: last 7 days, large page size, server-side filter to
  // WORKOUT_INIT_TIMING. Client-side sort applies after fetch.
  const filters = useMemo(() => {
    const now = new Date()
    return {
      dateFrom: new Date(now.getTime() - SEVEN_DAYS_MS),
      dateTo: now,
      eventTypes: ['WORKOUT_INIT_TIMING'] as const,
      pageSize: PAGE_SIZE,
    }
  }, [])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['diagnostic-init-timing', userId],
    // Cast away `readonly` for the service's filter type — eventTypes is just
    // a string union enum at the storage layer.
    queryFn: () => getDiagnosticLogs(userId!, { ...filters, eventTypes: [...filters.eventTypes] }),
    enabled: !!userId,
    staleTime: 30_000,
  })

  const sortedRows = useMemo(() => {
    if (!data?.logs) return []
    // Filter to only valid timing payloads (defensive — older events written
    // before this PR landed might lack required fields, though
    // server-side eventTypes filter should prevent that).
    const valid = data.logs.filter((log): log is DiagnosticLog & { payload: TimingPayload } =>
      isTimingPayload(log.payload),
    )
    // Default sort: totalMs descending — slowest hydrations float to the top
    // so a regression is immediately visible. Tie-break by timestamp desc.
    return [...valid].sort((a, b) => {
      if (b.payload.totalMs !== a.payload.totalMs) {
        return b.payload.totalMs - a.payload.totalMs
      }
      return b.timestamp.getTime() - a.timestamp.getTime()
    })
  }, [data?.logs])

  if (!userId) {
    return (
      <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
        בחר משתמש לתחילת חקירה.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
        טוען…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-status-error/10 border border-status-error/30 p-4 text-status-error">
        שגיאה בטעינת אירועי timing: {(error as Error)?.message}
      </div>
    )
  }

  if (sortedRows.length === 0) {
    return (
      <div className="rounded-xl bg-dark-surface border border-dark-border p-8 text-center text-text-muted">
        אין אירועי <code className="font-mono">WORKOUT_INIT_TIMING</code> ב-7 הימים האחרונים למשתמש זה.
        <br />
        <span className="text-xs">
          (אירועים נוצרים בכל פעם שהמשתמש פותח את מסך האימון. ייתכן שה-deploy עם ה-instrumentation עוד לא הגיע לפרודקשן.)
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted">
        מיון לפי משך כולל יורד · 7 ימים אחרונים · {sortedRows.length} אירועי hydration
      </div>
      <div className="rounded-xl bg-dark-surface border border-dark-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dark-bg text-text-muted text-xs uppercase">
            <tr>
              <th className="text-right p-3">זמן</th>
              <th className="text-right p-3">מסלול</th>
              <th className="text-right p-3">משך כולל</th>
              <th className="text-right p-3">תרגילים</th>
              {/* Two adjacent validate columns — see PR #128 finding 3.
                  A "המשך אימון" cycle can trigger BOTH; surfacing them
                  side-by-side makes the "which phase was slow" decision
                  visible at a glance. */}
              <th className="text-right p-3">init validate</th>
              <th className="text-right p-3">autosave validate</th>
              <th className="text-right p-3">רשת</th>
              <th className="text-right p-3">בלוקים</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((log) => (
              <TimingRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ValidatePhaseCell({
  totalMs,
  attempts,
}: {
  totalMs: number | undefined
  attempts: { durationMs: number }[]
}) {
  if (totalMs === undefined && attempts.length === 0) {
    return <span className="text-text-muted">—</span>
  }
  return (
    <div className="flex flex-col gap-0.5 font-mono text-xs">
      {totalMs !== undefined && (
        <span className={`font-semibold ${durationColorClass(totalMs)}`}>
          {formatMs(totalMs)}
        </span>
      )}
      {attempts.length > 0 && (
        <span className="text-text-muted">
          {attempts.length}× ({attempts.map((a) => formatMs(a.durationMs)).join(', ')})
        </span>
      )}
    </div>
  )
}

function TimingRow({
  log,
}: {
  log: DiagnosticLog & { payload: TimingPayload }
}) {
  const [expanded, setExpanded] = useState(false)
  const p = log.payload
  const blockEntries = Object.entries(p.durations)
  const validateInfo = p.validate
  // Split attempts by phase so each adjacent column shows only its own
  // per-attempt list — matches the split of initPhaseTotalMs /
  // autosavePhaseTotalMs the writer emits.
  const initAttempts =
    validateInfo?.attemptResults
      .map((r, i) => ({
        phase: r.phase,
        durationMs: validateInfo.attemptDurationsMs[i] ?? 0,
      }))
      .filter((a) => a.phase === 'init') ?? []
  const autosaveAttempts =
    validateInfo?.attemptResults
      .map((r, i) => ({
        phase: r.phase,
        durationMs: validateInfo.attemptDurationsMs[i] ?? 0,
      }))
      .filter((a) => a.phase === 'autosave') ?? []

  return (
    <>
      <tr className="border-t border-dark-border hover:bg-dark-bg/50 align-top">
        <td className="p-3 text-text-muted whitespace-nowrap font-mono text-xs">
          {formatTime(log.timestamp)}
        </td>
        <td className="p-3">
          <span className="px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 text-xs font-mono whitespace-nowrap">
            {p.pathTaken}
          </span>
        </td>
        <td className={`p-3 font-mono text-sm font-semibold ${durationColorClass(p.totalMs)}`}>
          {formatMs(p.totalMs)}
        </td>
        <td className="p-3 font-mono text-xs text-text-muted">
          {p.exerciseCount ?? '—'}
        </td>
        <td className="p-3">
          <ValidatePhaseCell
            totalMs={validateInfo?.initPhaseTotalMs}
            attempts={initAttempts}
          />
        </td>
        <td className="p-3">
          <ValidatePhaseCell
            totalMs={validateInfo?.autosavePhaseTotalMs}
            attempts={autosaveAttempts}
          />
        </td>
        <td className="p-3 font-mono text-xs text-text-muted whitespace-nowrap">
          {p.networkType}
          {!p.online && <span className="ml-1 text-status-error">offline</span>}
        </td>
        <td className="p-3 font-mono text-xs text-text-muted">
          {blockEntries.length === 0 ? (
            <span>—</span>
          ) : (
            <div className="flex flex-col gap-0.5 min-w-[200px]">
              {blockEntries
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([name, ms]) => (
                  <div key={name} className="flex gap-2 justify-between">
                    <span className="truncate" title={name}>
                      {name.split('.').pop()}
                    </span>
                    <span className={durationColorClass(ms)}>{formatMs(ms)}</span>
                  </div>
                ))}
              {blockEntries.length > 4 && (
                <span className="text-xs">+{blockEntries.length - 4} more</span>
              )}
            </div>
          )}
        </td>
        <td className="p-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-primary-300 hover:text-primary-200"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            פרטים
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-dark-bg/30">
          <td colSpan={9} className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">gate conditions</div>
                <JsonViewer data={p.gateConditions} maxHeight="max-h-48" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">localStorage state</div>
                <JsonViewer data={p.localStorageState} maxHeight="max-h-48" />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase mb-1">durations</div>
                <JsonViewer data={p.durations} maxHeight="max-h-72" />
              </div>
              {validateInfo && (
                <div>
                  <div className="text-xs text-text-muted uppercase mb-1">validate retries</div>
                  <JsonViewer data={validateInfo} maxHeight="max-h-72" />
                </div>
              )}
              <div className="md:col-span-2">
                <div className="text-xs text-text-muted uppercase mb-1">full payload</div>
                <JsonViewer data={p} maxHeight="max-h-72" />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
