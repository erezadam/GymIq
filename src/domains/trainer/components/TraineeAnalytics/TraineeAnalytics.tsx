import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useTraineeAnalytics } from '../../hooks/useTraineeAnalytics'
import { TotalWorkoutsTab } from './TotalWorkoutsTab'
import { StreakTab } from './StreakTab'
import { WeeklyComplianceTab } from './WeeklyComplianceTab'
import { PRTab } from './PRTab'

type TabId = 'total' | 'streak' | 'weekly' | 'pr'

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'total', icon: '📊', label: 'סה"כ אימונים' },
  { id: 'streak', icon: '🔥', label: 'רצף ימים' },
  { id: 'weekly', icon: '📅', label: 'השבוע' },
  { id: 'pr', icon: '🏆', label: 'PR' },
]

export default function TraineeAnalytics() {
  const { id: traineeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') as TabId) || 'total'
  const data = useTraineeAnalytics(traineeId)

  const setTab = (tab: TabId) => {
    setSearchParams({ tab })
  }

  if (data.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => navigate(`/trainer/trainee/${traineeId}`)}
          className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition"
        >
          <ArrowRight className="w-5 h-5" />
          <span className="text-sm">חזרה</span>
        </button>
        <div>
          <h1 className="text-lg font-bold text-text-primary">ניתוח ביצועים</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto sticky top-0 z-10 bg-dark-bg border-b border-dark-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-primary-main to-primary-main/80 text-dark-bg font-semibold'
                : 'bg-dark-card/80 border border-dark-border text-text-secondary hover:text-text-primary hover:bg-dark-card'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 animate-fade-in">
        {activeTab === 'total' && <TotalWorkoutsTab data={data} />}
        {activeTab === 'streak' && <StreakTab data={data} />}
        {activeTab === 'weekly' && <WeeklyComplianceTab data={data} />}
        {activeTab === 'pr' && <PRTab data={data} />}
      </div>
    </div>
  )
}
