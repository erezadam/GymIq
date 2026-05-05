import { useState } from 'react'
import { Search, ScrollText, Activity, X } from 'lucide-react'
import { trainerService } from '@/domains/trainer/services/trainerService'
import { LogsTimelineTab } from './diagnostic/LogsTimelineTab'
import { WorkoutInspectorTab } from './diagnostic/WorkoutInspectorTab'
import { SessionReplayTab } from './diagnostic/SessionReplayTab'

type TabKey = 'logs' | 'workouts' | 'replay'

const TABS: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: 'logs', label: 'Logs Timeline', icon: ScrollText },
  { key: 'workouts', label: 'Workout Inspector', icon: Search },
  { key: 'replay', label: 'Session Replay', icon: Activity },
]

interface SelectedSubject {
  email: string
  uid: string
}

export default function DiagnosticConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>('logs')
  const [emailInput, setEmailInput] = useState('')
  const [selected, setSelected] = useState<SelectedSubject | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isLooking, setIsLooking] = useState(false)

  const trimmedEmail = emailInput.trim().toLowerCase()
  const canSearch = trimmedEmail.length > 0 && !isLooking

  async function performLookup() {
    if (!canSearch) return
    setIsLooking(true)
    setLookupError(null)
    try {
      // Uses the duplicate-aware sibling helper, not the limit(1) findUserByEmail —
      // we explicitly need to detect the multi-result case to refuse auto-selection.
      const matches = await trainerService.findAllUsersByEmail(trimmedEmail)
      if (matches.length === 0) {
        setLookupError('לא נמצא משתמש עם email זה')
        setSelected(null)
      } else if (matches.length === 1) {
        setSelected({ email: trimmedEmail, uid: matches[0].uid })
      } else {
        const uids = matches.map((m) => m.uid).join(', ')
        setLookupError(`נמצאו ${matches.length} רשומות עם email זה. UIDs: ${uids}`)
        setSelected(null)
      }
    } catch (err) {
      setLookupError(`שגיאה בחיפוש: ${(err as Error).message}`)
      setSelected(null)
    } finally {
      setIsLooking(false)
    }
  }

  function clearSelection() {
    setSelected(null)
    setLookupError(null)
    setEmailInput('')
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Diagnostic Console</h1>
        <div className="rounded-xl bg-status-warning/10 border border-status-warning/30 p-4 text-sm text-text-primary">
          <div className="font-medium mb-1">
            🔍 Diagnostic Console — הקלד email לחיפוש משתמש.
          </div>
          <div className="text-text-muted text-xs">
            ניתן לכבות רישום לוגים גלובלית דרך{' '}
            <code className="font-mono">settings/app.diagnosticLogsEnabled = false</code>{' '}
            ב-Firestore Console.
          </div>
        </div>
      </header>

      <form
        className="rounded-xl bg-dark-surface border border-dark-border p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void performLookup()
        }}
      >
        <label className="text-sm block">
          <span className="block text-text-muted mb-1">Email לחיפוש</span>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="הכנס email של המשתמש לחקירה"
              className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-text-primary"
              dir="ltr"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!canSearch}
              className="px-4 py-2 text-sm bg-primary-500/20 border border-primary-400 text-primary-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLooking ? 'מחפש…' : 'חפש'}
            </button>
          </div>
        </label>

        {lookupError && (
          <div className="rounded-lg bg-status-error/10 border border-status-error/30 p-3 text-sm text-status-error">
            {lookupError}
          </div>
        )}

        {selected && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-primary-500/10 border border-primary-400/30 p-3">
            <div className="text-sm text-text-primary min-w-0 flex-1">
              <span className="text-text-muted">נחקר כעת: </span>
              <span className="font-mono break-all">{selected.email}</span>
              <span className="text-text-muted"> · UID: </span>
              <span className="font-mono text-xs break-all">{selected.uid}</span>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-dark-bg transition-colors flex-shrink-0"
              aria-label="נקה בחירה"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </form>

      <nav className="flex flex-wrap gap-1 border-b border-dark-border">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors ${
                active
                  ? 'bg-dark-surface text-primary-300 border-b-2 border-primary-400'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </nav>

      <section>
        {activeTab === 'logs' && <LogsTimelineTab userId={selected?.uid ?? null} />}
        {activeTab === 'workouts' && (
          <WorkoutInspectorTab userId={selected?.uid ?? null} />
        )}
        {activeTab === 'replay' && <SessionReplayTab userId={selected?.uid ?? null} />}
      </section>
    </div>
  )
}

