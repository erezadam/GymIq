import { useState } from 'react'
import { Search, ScrollText, Activity } from 'lucide-react'
import { DEBUG_USER_UID } from '../services/diagnosticService'
import { LogsTimelineTab } from './diagnostic/LogsTimelineTab'
import { WorkoutInspectorTab } from './diagnostic/WorkoutInspectorTab'
import { SessionReplayTab } from './diagnostic/SessionReplayTab'

type TabKey = 'logs' | 'workouts' | 'replay'

const TABS: { key: TabKey; label: string; icon: typeof Search }[] = [
  { key: 'logs', label: 'Logs Timeline', icon: ScrollText },
  { key: 'workouts', label: 'Workout Inspector', icon: Search },
  { key: 'replay', label: 'Session Replay', icon: Activity },
]

export default function DiagnosticConsole() {
  const [activeTab, setActiveTab] = useState<TabKey>('logs')

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Diagnostic Console</h1>
        <div className="rounded-xl bg-status-warning/10 border border-status-warning/30 p-4 text-sm text-text-primary">
          <div className="font-medium mb-1">🔍 Diagnostic logs פעילים רק עבור UID</div>
          <div className="font-mono text-xs text-text-muted break-all">{DEBUG_USER_UID}</div>
          <div className="mt-2 text-text-muted text-xs">
            מוגדר ב-<code className="font-mono">DEBUG_USER_UID</code> בקובץ{' '}
            <code className="font-mono">src/lib/firebase/diagnosticLogs.ts</code>. לשינוי המשתמש —
            עריכה של הקבוע הזה ו-deploy.
          </div>
        </div>
      </header>

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
        {activeTab === 'logs' && <LogsTimelineTab />}
        {activeTab === 'workouts' && <WorkoutInspectorTab />}
        {activeTab === 'replay' && <SessionReplayTab />}
      </section>
    </div>
  )
}
