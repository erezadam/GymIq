/**
 * Training Analysis Screen
 * Displays AI-powered training analysis results
 * Loads cached analysis first, calls API only for new analysis
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/domains/authentication/store'
import {
  getTrainingAnalysis,
  getCachedAnalysis,
  type TrainingAnalysisResult,
  type AnalysisError,
} from '../services/analysisService'

type ScreenState = 'loading' | 'error' | 'results'

export default function TrainingAnalysis() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
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

  // Loading State
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
      </div>
    )
  }

  // Error State
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
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
        >
          חזרה לדף הבית
        </button>
      </div>
    )
  }

  // Results State
  if (!analysis) return null

  return (
    <div className="p-4 pb-10 rtl max-w-[600px] mx-auto">
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

      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="w-full py-3 rounded-lg bg-secondary border border-border text-text-primary text-base font-semibold cursor-pointer"
      >
        חזרה לדף הבית
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
