import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, ChevronRight, ChevronDown, Dumbbell } from 'lucide-react'
import { getPersonalRecords, getExerciseHistory, PersonalRecord, ExerciseHistoryEntry } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import { getExerciseImageUrl } from '@/domains/exercises/utils/getExerciseImageUrl'

// Format date for display - D/M format only
function formatDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`
}

// Check improvement types
function getImprovementType(record: PersonalRecord): { weight: boolean; reps: boolean } {
  const weightImproved = record.previousWeight !== undefined && record.bestWeight > record.previousWeight
  const repsImproved = record.previousReps !== undefined && record.bestReps > record.previousReps
  return { weight: weightImproved, reps: repsImproved }
}

type SortMode = 'date' | 'improvement'

export default function PersonalRecords() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const loadingExerciseRef = useRef<string | null>(null) // Track which exercise is being loaded

  useEffect(() => {
    loadRecords()
  }, [user])

  const loadRecords = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      const data = await getPersonalRecords(user.uid)
      setRecords(data)
    } catch (error) {
      console.error('Failed to load personal records:', error)
    } finally {
      setLoading(false)
    }
  }

  // Toggle exercise expansion and load history
  const toggleExerciseHistory = async (exerciseId: string) => {
    if (expandedExercise === exerciseId) {
      // Collapse
      setExpandedExercise(null)
      setExerciseHistory([])
      loadingExerciseRef.current = null
      return
    }

    // Expand and load history
    setExpandedExercise(exerciseId)
    setHistoryLoading(true)
    setExerciseHistory([]) // Clear previous history immediately
    loadingExerciseRef.current = exerciseId // Track which exercise we're loading

    try {
      if (user?.uid) {
        const history = await getExerciseHistory(user.uid, exerciseId)
        // Only update if this is still the exercise we're loading (prevent race condition)
        if (loadingExerciseRef.current === exerciseId) {
          setExerciseHistory(history)
        }
      }
    } catch (error) {
      console.error('Failed to load exercise history:', error)
      if (loadingExerciseRef.current === exerciseId) {
        setExerciseHistory([])
      }
    } finally {
      if (loadingExerciseRef.current === exerciseId) {
        setHistoryLoading(false)
      }
    }
  }

  // Format date for history display - D/M/YY format
  const formatHistoryDate = (date: Date): string => {
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear().toString().slice(-2)
    return `${day}/${month}/${year}`
  }

  // Sort records based on selected mode
  const sortedRecords = useMemo(() => {
    const sorted = [...records]
    if (sortMode === 'date') {
      // Sort by most recent workout date (descending)
      sorted.sort((a, b) => b.bestDate.getTime() - a.bestDate.getTime())
    } else if (sortMode === 'improvement') {
      // Sort by improvement size (descending) - exercises with improvement first
      sorted.sort((a, b) => {
        const improvementA = a.hasImproved && a.previousWeight ? a.bestWeight - a.previousWeight : 0
        const improvementB = b.hasImproved && b.previousWeight ? b.bestWeight - b.previousWeight : 0
        return improvementB - improvementA
      })
    }
    return sorted
  }, [records, sortMode])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-text-secondary hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
          <span className="text-sm">חזור</span>
        </button>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Personal Records
        </h1>
      </div>

      {/* Stats + Sort Buttons - Combined Row */}
      {records.length > 0 && (
        <div className="flex items-center justify-between bg-background-card border border-border-default rounded-lg px-3 py-2">
          {/* Stats on the right */}
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{records.length}</span>
            <span>תרגילים</span>
            <span className="text-text-muted mx-1">|</span>
            <span className="font-semibold text-text-primary">{records.filter(r => r.hasImproved).length}</span>
            <span>שיפורים</span>
          </div>

          {/* Sort buttons on the left */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setSortMode('date')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                sortMode === 'date'
                  ? 'bg-primary-main text-background-main'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              תאריך
            </button>
            <button
              onClick={() => setSortMode('improvement')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                sortMode === 'improvement'
                  ? 'bg-primary-main text-background-main'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              שיפור
            </button>
          </div>
        </div>
      )}

      {/* Records List */}
      {records.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">עדיין אין שיאים</h3>
          <p className="text-text-muted mb-6">התחל להתאמן כדי לראות את השיאים שלך!</p>
          <button
            onClick={() => navigate('/exercises')}
            className="btn-neon inline-flex items-center gap-2"
          >
            התחל אימון
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRecords.map((record) => {
            const isExpanded = expandedExercise === record.exerciseId
            return (
              <div
                key={record.exerciseId}
                className={`bg-background-card border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? 'border-primary-main' : 'border-border-default hover:border-border-light'
                }`}
              >
                {/* Clickable Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExerciseHistory(record.exerciseId)}
                >
                  <div className="flex items-center gap-3">
                    {/* Exercise Image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-background-elevated">
                      <img
                        src={getExerciseImageUrl({ imageUrl: record.imageUrl })}
                        alt={record.exerciseNameHe}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.onerror = null
                          target.src = '/images/exercise-placeholder.png'
                        }}
                      />
                    </div>

                    {/* Exercise Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">
                          {record.exerciseNameHe || record.exerciseName}
                        </h3>
                        {/* Improvement Arrows */}
                        {(() => {
                          const improvement = getImprovementType(record)
                          if (!improvement.weight && !improvement.reps) return null
                          return (
                            <div className="flex items-center gap-1.5">
                              {improvement.weight && (
                                <div className="flex items-center gap-1">
                                  <div className="arrow-up-weight" />
                                  <span className="text-[#00ff88] text-xs font-medium">משקל</span>
                                </div>
                              )}
                              {improvement.reps && (
                                <div className="flex items-center gap-1">
                                  <div className="arrow-up-reps" />
                                  <span className="text-[#ffaa00] text-xs font-medium">חזרות</span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {record.workoutCount} אימונים
                      </p>
                    </div>

                    {/* Best Record */}
                    <div className="text-left flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-primary-main">
                          {record.bestWeight}
                        </span>
                        <span className="text-sm text-text-secondary">ק"ג</span>
                      </div>
                      <div className="flex items-center gap-1 text-text-muted text-xs">
                        <span>{record.bestReps} חזרות</span>
                      </div>
                    </div>

                    {/* Expand/Collapse Indicator */}
                    <ChevronDown
                      className={`w-5 h-5 text-text-muted transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {/* Date and Comparison */}
                  <div className="mt-3 pt-3 border-t border-border-default flex items-center justify-between text-xs">
                    <span className="text-text-muted">{formatDate(record.bestDate)}</span>

                    {record.previousWeight !== undefined && (
                      <div className="text-text-muted">
                        {(() => {
                          const improvement = getImprovementType(record)
                          const parts = []
                          if (improvement.weight) {
                            parts.push(`+${record.bestWeight - (record.previousWeight || 0)} ק"ג`)
                          }
                          if (improvement.reps && record.previousReps !== undefined) {
                            parts.push(`+${record.bestReps - record.previousReps} חזרות`)
                          }
                          if (parts.length > 0) {
                            return <span className="text-[#00ff88]">{parts.join(' | ')}</span>
                          }
                          return <span>קודם: {record.previousWeight} ק"ג</span>
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded History Section */}
                {isExpanded && (
                  <div className="border-t border-border-default bg-background-elevated">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="spinner-small"></div>
                      </div>
                    ) : exerciseHistory.length === 0 ? (
                      <div className="text-center py-4 text-text-muted text-sm">
                        אין היסטוריה
                      </div>
                    ) : (
                      <div className="p-3">
                        {/* History Table Header */}
                        <div className="grid grid-cols-3 gap-2 text-xs text-text-muted mb-2 px-2">
                          <span>תאריך</span>
                          <span className="text-center">חזרות</span>
                          <span className="text-left">משקל</span>
                        </div>
                        {/* History Rows */}
                        <div className="space-y-1.5">
                          {exerciseHistory.map((entry, index) => (
                            <div
                              key={index}
                              className={`grid grid-cols-3 gap-2 text-sm px-2 py-1.5 rounded ${
                                entry.isOverallBest
                                  ? 'bg-primary-main/10 border border-primary-main/30'
                                  : ''
                              }`}
                            >
                              <span className="text-text-secondary">
                                {formatHistoryDate(entry.date)}
                              </span>
                              <span className="text-center text-white">
                                {entry.bestReps}
                              </span>
                              <span className="text-left flex items-center gap-1">
                                <span className={entry.isOverallBest ? 'text-primary-main font-semibold' : 'text-white'}>
                                  {entry.bestWeight}
                                </span>
                                <span className="text-text-muted text-xs">ק"ג</span>
                                {entry.isOverallBest && (
                                  <Trophy className="w-3.5 h-3.5 text-yellow-400 mr-1" />
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
