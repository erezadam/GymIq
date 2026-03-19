/**
 * Training Analysis Screen
 * Displays AI-powered training analysis results
 * Loads cached analysis first, calls API only for new analysis
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, ArrowRight, Calendar, Download, ChevronRight, Plus } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import {
  getTrainingAnalysis,
  getCachedAnalysis,
  type TrainingAnalysisResult,
  type AnalysisError,
} from '../services/analysisService'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import {
  useMuscleAnalysis,
  MIN_SETS,
  MIN_AVG_REPS,
  type MuscleRow,
  type WeekMode,
} from '../hooks/useMuscleAnalysis'

function WeeklyMuscleSection({ userId, onNavigateToSummary }: { userId: string; onNavigateToSummary: () => void }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedExercises, clearWorkout } = useWorkoutBuilderStore()
  const detailedTableRef = useRef<HTMLHeadingElement>(null)
  const [weekMode, setWeekMode] = useState<WeekMode>('current')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleRow | null>(null)

  const { loading, rows, summaryRows, weekRange } = useMuscleAnalysis(userId, weekMode, customStart, customEnd)

  // Scroll to detailed table when returning from ExerciseLibrary
  useEffect(() => {
    if (searchParams.get('scrollToDetail') === 'true' && !loading && rows.length > 0) {
      const timer = setTimeout(() => {
        detailedTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [searchParams, loading, rows])

  const handleDownloadReport = () => {
    const lines: string[] = []
    lines.push(`ניתוח ביצוע שבועי — ${weekRange.startStr} – ${weekRange.endStr}`)
    lines.push('')

    let currentCategory = ''
    for (const row of rows) {
      if (row.categoryHe !== currentCategory) {
        currentCategory = row.categoryHe
        lines.push(`\n--- ${currentCategory} ---`)
      }
      lines.push(`  ${row.primaryMuscleHe}: ${row.totalSets} סטים, ממוצע ${row.avgReps} חזרות`)
      for (const ex of row.exercises) {
        lines.push(`    • ${ex.name} — ${ex.sets} סטים, ממוצע ${ex.avgReps} חזרות`)
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${weekRange.startStr.replace(/\//g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Exercise detail popup (still a modal overlay)
  if (selectedMuscle) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        onClick={() => setSelectedMuscle(null)}
      >
        <div
          className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-dark-card border border-dark-border"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMuscle(null)}
                className="p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-text-primary">{selectedMuscle.primaryMuscleHe}</h2>
                <p className="text-xs text-text-secondary">{selectedMuscle.totalSets} סטים · ממוצע {selectedMuscle.avgReps} חזרות</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMuscle(null)}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-4">
            {selectedMuscle.exercises.length === 0 ? (
              <p className="text-text-muted text-center py-8">אין תרגילים בתקופה זו</p>
            ) : (
              <div className="space-y-3">
                {selectedMuscle.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-dark-card/60 border border-dark-border">
                    <span className="text-sm text-text-primary font-medium">{ex.name}</span>
                    <div className="text-left">
                      <div className="text-sm text-text-primary">{ex.sets} סטים</div>
                      <div className="text-xs text-text-muted">ממוצע {ex.avgReps} חזרות</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-10 rtl max-w-[600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="חזרה לדשבורד"
          >
            <ArrowRight size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">ניתוח ביצוע שבועי</h1>
            {weekRange.startStr && (
              <p className="text-xs text-text-secondary mt-0.5">
                {weekRange.startStr} – {weekRange.endStr}
              </p>
            )}
          </div>
        </div>
        {rows.length > 0 && (
          <button
            onClick={handleDownloadReport}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-dark-card hover:bg-dark-border transition"
            title="הורד דוח"
          >
            <Download className="w-5 h-5 text-text-secondary" />
          </button>
        )}
      </div>

      {/* Link to AI Summary */}
      <button
        onClick={onNavigateToSummary}
        className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-semibold"
      >
        <span className="text-base">🧠</span>
        סיכום מצב מתאמן
      </button>

      {/* Week Selector */}
      <div className="mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setWeekMode('last')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
              weekMode === 'last'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-text-secondary border border-dark-border'
            }`}
          >
            שבוע אחרון
          </button>
          <button
            onClick={() => setWeekMode('current')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition ${
              weekMode === 'current'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-text-secondary border border-dark-border'
            }`}
          >
            שבוע נוכחי
          </button>
          <button
            onClick={() => setWeekMode('custom')}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
              weekMode === 'custom'
                ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                : 'bg-dark-card text-text-secondary border border-dark-border'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            בין תאריכים
          </button>
        </div>

        {/* Custom Date Range Inputs */}
        {weekMode === 'custom' && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1">מתאריך</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted block mb-1">עד תאריך</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-text-primary text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {weekMode === 'custom' && (!customStart || !customEnd) ? (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted text-sm">
            <Calendar className="w-8 h-8 mb-3 opacity-40" />
            <p>בחר תאריך התחלה וסיום</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Summary Table — aggregated by muscle group */}
            <h3 className="text-sm font-bold text-text-primary mb-2">סיכום לפי קבוצת שרירים</h3>
            <table className="w-full text-sm min-w-[360px] mb-6">
              <thead>
                <tr className="text-text-secondary text-xs border-b border-dark-border">
                  <th className="text-right py-2 pr-2 font-medium">קבוצת שרירים</th>
                  <th className="text-right py-2 font-medium">סטים / דקות</th>
                  <th className="text-center py-2 pl-2 font-medium">חזרות / zone</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr key={row.category} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                    <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                    <td className="py-2.5">
                      {row.isCardio ? (
                        row.totalMinutes && row.totalMinutes > 0 ? (
                          <div className="font-medium text-text-primary">{row.totalMinutes} דק׳</div>
                        ) : (
                          <div className="text-text-muted">—</div>
                        )
                      ) : row.totalSets > 0 ? (
                        <div className={`font-medium ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-text-muted">—</div>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-center">
                      {row.isCardio ? (
                        row.avgZone && row.avgZone > 0 ? (
                          <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : row.avgReps > 0 ? (
                        <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {row.avgReps}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Detailed Table — per sub-muscle */}
            <h3 ref={detailedTableRef} className="text-sm font-bold text-text-primary mb-2">פירוט לפי תת-שריר</h3>
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="text-text-secondary text-xs border-b border-dark-border">
                  <th className="text-right py-2 pr-2 font-medium">שריר</th>
                  <th className="text-right py-2 font-medium">תת-שריר</th>
                  <th className="text-right py-2 font-medium">סטים / דקות</th>
                  <th className="text-center py-2 font-medium">חזרות / zone</th>
                  <th className="w-10 py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.primaryMuscle} className={i % 2 === 0 ? 'bg-dark-card/40' : ''}>
                    <td className="py-2.5 pr-2 text-text-primary font-medium">{row.categoryHe}</td>
                    <td className="py-2.5 text-text-secondary">{row.primaryMuscleHe}</td>
                    <td
                      className={`py-2.5 ${row.totalSets > 0 ? 'cursor-pointer hover:bg-primary/5 rounded-lg transition-colors' : ''}`}
                      onClick={() => row.totalSets > 0 && setSelectedMuscle(row)}
                    >
                      {row.isCardio ? (
                        row.totalMinutes && row.totalMinutes > 0 ? (
                          <div className="font-medium text-text-primary underline decoration-current/30">{row.totalMinutes} דק׳</div>
                        ) : (
                          <div className="text-text-muted">—</div>
                        )
                      ) : row.totalSets > 0 ? (
                        <div className={`font-medium underline decoration-current/30 ${row.setsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {Number.isInteger(row.totalSets) ? row.totalSets : row.totalSets.toFixed(1)}
                        </div>
                      ) : (
                        <div className="text-text-muted">—</div>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {row.isCardio ? (
                        row.avgZone && row.avgZone > 0 ? (
                          <span className="font-medium text-text-primary">zone {row.avgZone}</span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )
                      ) : row.avgReps > 0 ? (
                        <span className={`font-medium ${row.repsGreen ? 'text-status-success' : 'text-status-error'}`}>
                          {row.avgReps}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-center">
                      <button
                        onClick={() => navigate(`/exercises?fromAnalysis=true&muscle=${row.category}&subMuscle=${row.primaryMuscle}`)}
                        className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors mx-auto"
                        title={`הוסף תרגילים ל${row.primaryMuscleHe}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex flex-col gap-1 text-xs text-text-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-success" />
                  עומד ביעד
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-error" />
                  מתחת ליעד
                </span>
              </div>
              <div>יעד: ≥{MIN_SETS} סטים, ≥{MIN_AVG_REPS} חזרות ממוצע</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      {selectedExercises.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[100] bg-background-main border-t border-primary/30"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-[600px] mx-auto flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate('/exercises')}
              className="px-5 py-2.5 rounded-xl bg-primary text-background-main font-bold text-sm"
            >
              סיים בחירה ({selectedExercises.length})
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => clearWorkout()}
                className="text-status-error text-xs hover:underline"
              >
                נקה
              </button>
              <span className="text-text-primary text-sm font-semibold">
                {selectedExercises.length} תרגילים נבחרו
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type ScreenState = 'loading' | 'error' | 'results'
type ViewMode = 'muscles' | 'summary'

export default function TrainingAnalysis() {
  const { user } = useAuthStore()
  const [view, setView] = useState<ViewMode>('muscles')
  const [state, setState] = useState<ScreenState>('loading')
  const [analysis, setAnalysis] = useState<TrainingAnalysisResult | null>(null)
  const [error, setError] = useState<AnalysisError | null>(null)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [weeksAnalyzed, setWeeksAnalyzed] = useState(0)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNewAnalysis = useCallback(async () => {
    if (!user?.uid) return
    try {
      setRefreshing(true)
      setState('loading')
      const response = await getTrainingAnalysis(user.uid)
      setAnalysis(response.result)
      setWorkoutCount(response.workoutCount)
      setWeeksAnalyzed(response.weeksAnalyzed)
      setGeneratedAt(new Date())
      setIsCached(false)
      setState('results')
    } catch (err: any) {
      setError(err as AnalysisError)
      setState('error')
    } finally {
      setRefreshing(false)
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    const loadAnalysis = async () => {
      // Try to load cached analysis first
      const cached = await getCachedAnalysis(user.uid)

      if (cached) {
        setAnalysis(cached.result)
        setWorkoutCount(cached.workoutCount)
        setWeeksAnalyzed(cached.weeksAnalyzed)
        setGeneratedAt(cached.generatedAt)
        setIsCached(true)
        setState('results')
        return
      }

      // No cache — fetch new
      await fetchNewAnalysis()
    }

    loadAnalysis()
  }, [user?.uid, fetchNewAnalysis])

  // Muscles view (default) — show even before AI analysis loads
  if (view === 'muscles' && user?.uid) {
    return (
      <WeeklyMuscleSection
        userId={user.uid}
        onNavigateToSummary={() => {
          setView('summary')
          // Trigger AI analysis load if not yet loaded
          if (state === 'loading' && !analysis && !refreshing) {
            // Already loading via useEffect
          }
        }}
      />
    )
  }

  // Summary view — Loading State
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 rtl">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5 animate-pulse">
          <span className="text-[32px]">🧠</span>
        </div>
        <div className="text-lg font-semibold text-text-primary mb-2">
          {refreshing ? 'יוצר ניתוח חדש...' : 'מנתח את האימונים שלך...'}
        </div>
        <div className="text-sm text-text-secondary text-center">
          הניתוח יכול לקחת עד 30 שניות
        </div>
        <button
          onClick={() => setView('muscles')}
          className="mt-6 px-6 py-2 rounded-lg bg-secondary border border-border text-text-primary text-sm font-semibold cursor-pointer"
        >
          חזרה לניתוח שרירים
        </button>
      </div>
    )
  }

  // Summary view — Error State
  if (state === 'error' && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 rtl">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
          error.type === 'rate_limit' ? 'bg-status-warning/10' : 'bg-status-error/10'
        }`}>
          <span className="text-[32px]">
            {error.type === 'rate_limit' ? '⏰' : error.type === 'not_enough_data' ? '📊' : '⚠️'}
          </span>
        </div>
        <div className="text-lg font-semibold text-text-primary mb-2 text-center">
          {error.type === 'rate_limit' && 'הגעת למגבלה היומית'}
          {error.type === 'not_enough_data' && 'אין מספיק נתונים'}
          {error.type === 'network' && 'בעיית תקשורת'}
          {error.type === 'general' && 'אירעה שגיאה'}
        </div>
        <div className="text-base text-text-secondary text-center mb-8 max-w-[300px] leading-relaxed">
          {error.message}
        </div>
        <button
          onClick={() => setView('muscles')}
          className="px-8 py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
        >
          חזרה לניתוח שרירים
        </button>
      </div>
    )
  }

  // Summary view — Results State
  if (!analysis) return null

  return (
    <div className="p-4 pb-10 rtl max-w-[600px] mx-auto">
      {/* Back Arrow — goes back to muscles view */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setView('muscles')}
          className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="חזרה לניתוח שרירים"
        >
          <ArrowRight size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-primary">סיכום מצב מתאמן</h1>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-primary mb-1 text-center">
        {analysis.title}
      </h1>

      {/* Meta info + date */}
      <div className="text-xs text-text-muted text-center mb-5">
        {workoutCount} אימונים · {weeksAnalyzed} שבועות
        {generatedAt && (
          <span className="block mt-1">
            נכון ל-{generatedAt.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Overview */}
      <div className="text-base text-text-secondary leading-relaxed mb-6">
        {analysis.overview}
      </div>

      {/* Strengths */}
      <SectionCard
        icon="✅"
        iconBgClass="bg-status-success/15"
        title="נקודות חוזק"
        titleColorClass="text-status-success"
        items={analysis.strengths}
        itemIcon="✓"
        itemIconColorClass="text-status-success"
      />

      {/* Weaknesses */}
      <SectionCard
        icon="⚠️"
        iconBgClass="bg-status-warning/15"
        title="נקודות לשיפור"
        titleColorClass="text-status-warning"
        items={analysis.weaknesses}
        itemIcon="!"
        itemIconColorClass="text-status-warning"
      />

      {/* Recommendations */}
      <SectionCard
        icon="💡"
        iconBgClass="bg-status-info/15"
        title="המלצות"
        titleColorClass="text-status-info"
        items={analysis.recommendations}
        itemIcon="→"
        itemIconColorClass="text-status-info"
      />

      {/* Summary */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
        <div className="text-base font-semibold text-primary leading-relaxed text-center">
          {analysis.summary}
        </div>
      </div>

      {/* Request New Analysis (only shown when viewing cached) */}
      {isCached && (
        <button
          onClick={fetchNewAnalysis}
          className="w-full py-3 mb-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-base font-semibold cursor-pointer"
        >
          בקש ניתוח חדש
        </button>
      )}

      {/* Back to Muscles Button */}
      <button
        onClick={() => setView('muscles')}
        className="w-full py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
      >
        חזרה לניתוח שרירים
      </button>
    </div>
  )
}

// Section card component for strengths/weaknesses/recommendations
function SectionCard({
  icon,
  iconBgClass,
  title,
  titleColorClass,
  items,
  itemIcon,
  itemIconColorClass,
}: {
  icon: string
  iconBgClass: string
  title: string
  titleColorClass: string
  items: string[]
  itemIcon: string
  itemIconColorClass: string
}) {
  return (
    <div className="bg-background-card rounded-lg p-4 mb-4 border border-white/5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-sm ${iconBgClass} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <div className={`text-lg font-bold ${titleColorClass}`}>
          {title}
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className={`${itemIconColorClass} font-bold text-sm min-w-[16px] text-center mt-0.5`}>
              {itemIcon}
            </span>
            <span className="text-sm text-text-primary leading-relaxed">
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
