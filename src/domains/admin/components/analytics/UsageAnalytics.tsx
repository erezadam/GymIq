import { useSearchParams } from 'react-router-dom'
import { BarChart3, Dumbbell, LineChart, UserCog, Users } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import { useDateRange } from './useDateRange'
import { OverviewTab } from './tabs/OverviewTab'
import { TrainersTab } from './tabs/TrainersTab'
import { TraineesTab } from './tabs/TraineesTab'
import { ExercisesTab } from './tabs/ExercisesTab'

type TabId = 'overview' | 'trainers' | 'trainees' | 'exercises'

const TABS: Array<{ id: TabId; label: string; icon: typeof LineChart }> = [
  { id: 'overview', label: 'סקירה כללית', icon: LineChart },
  { id: 'trainers', label: 'מאמנים', icon: UserCog },
  { id: 'trainees', label: 'מתאמנים', icon: Users },
  { id: 'exercises', label: 'תרגילים', icon: Dumbbell },
]

const VALID = new Set<TabId>(TABS.map((t) => t.id))

export default function UsageAnalytics() {
  const { range, setRangeKey } = useDateRange()
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('tab')
  const activeTab: TabId = raw && VALID.has(raw as TabId) ? (raw as TabId) : 'overview'

  const setTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-main" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface">ניתוח שימוש</h1>
          </div>
          <p className="text-base text-on-surface-variant mt-1">
            תמונת מצב על הפעילות במערכת — משתמשים, מאמנים, אימונים ותרגילים.
          </p>
        </div>
        <DateRangePicker value={range.key} onChange={setRangeKey} />
      </header>

      <div className="border-b border-dark-border">
        <nav
          role="tablist"
          aria-label="טאבים"
          className="flex gap-1 overflow-x-auto -mb-px"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-base font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-primary-main text-primary-main'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div role="tabpanel">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'trainers' && <TrainersTab />}
        {activeTab === 'trainees' && <TraineesTab />}
        {activeTab === 'exercises' && <ExercisesTab />}
      </div>
    </div>
  )
}
