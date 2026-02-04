import { useState } from 'react'
import { Moon, ChevronDown } from 'lucide-react'
import type { ProgramDay } from '../../types'

interface ProgramReviewProps {
  name: string
  traineeName: string
  description: string
  durationWeeks: number | null
  startDate: string
  days: ProgramDay[]
}

const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const DAY_LETTER_GRADIENTS = [
  'from-primary-main to-teal-600',
  'from-status-info to-blue-600',
  'from-accent-purple to-purple-600',
  'from-accent-orange to-orange-600',
  'from-accent-pink to-pink-600',
  'from-accent-gold to-yellow-600',
  'from-status-success to-green-600',
]

export function ProgramReview({
  name,
  traineeName,
  description,
  durationWeeks,
  startDate,
  days,
}: ProgramReviewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  const toggleDay = (index: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const totalExercises = days.reduce(
    (sum, d) => sum + (d.restDay ? 0 : d.exercises.length),
    0
  )
  const totalSets = days.reduce(
    (sum, d) => sum + d.exercises.reduce((s, e) => s + e.targetSets, 0),
    0
  )
  const trainingDays = days.filter((d) => !d.restDay).length
  const restDays = days.filter((d) => d.restDay).length

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center text-xl sm:text-2xl">
          ✅
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">סיכום ואישור</h2>
          <p className="text-text-muted text-sm">בדוק את התוכנית לפני הפעלה</p>
        </div>
      </div>

      {/* Program summary card */}
      <div className="bg-gradient-to-br from-primary-main/10 to-status-info/10 border border-primary-main/20 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-text-primary truncate">{name}</h3>
            {description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-primary-main">👤</span>
            <div>
              <div className="text-xs text-text-muted">מתאמן</div>
              <div className="text-sm font-medium text-text-primary">{traineeName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary-main">📅</span>
            <div>
              <div className="text-xs text-text-muted">תאריך התחלה</div>
              <div className="text-sm font-medium text-text-primary">{startDate}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary-main">⏱️</span>
            <div>
              <div className="text-xs text-text-muted">משך</div>
              <div className="text-sm font-medium text-text-primary">
                {durationWeeks ? `${durationWeeks} שבועות` : 'ללא הגבלה'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-primary-main mb-1">{trainingDays}</div>
          <p className="text-xs text-text-muted">ימי אימון</p>
        </div>
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-status-info mb-1">{restDays}</div>
          <p className="text-xs text-text-muted">ימי מנוחה</p>
        </div>
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-accent-gold mb-1">{totalExercises}</div>
          <p className="text-xs text-text-muted">תרגילים</p>
        </div>
        <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-3 sm:p-4 text-center">
          <div className="text-2xl sm:text-3xl font-black text-accent-orange mb-1">{totalSets}</div>
          <p className="text-xs text-text-muted">סטים</p>
        </div>
      </div>

      {/* Days detail */}
      <div className="space-y-4">
        {days.map((day, index) => {
          const letter = DAY_LETTERS[index] || String(index + 1)
          const gradient = DAY_LETTER_GRADIENTS[index % DAY_LETTER_GRADIENTS.length]
          const daySets = day.exercises.reduce((sum, e) => sum + e.targetSets, 0)

          const isExpanded = expandedDays.has(index)

          return (
            <div
              key={index}
              className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-5"
            >
              <div
                className={`flex items-center gap-4 ${!day.restDay && day.exercises.length > 0 ? 'cursor-pointer' : ''}`}
                onClick={() => !day.restDay && day.exercises.length > 0 && toggleDay(index)}
              >
                {day.restDay ? (
                  <div className="w-12 h-12 rounded-xl bg-status-info/20 flex items-center justify-center flex-shrink-0">
                    <Moon className="w-6 h-6 text-status-info" />
                  </div>
                ) : (
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl font-black text-white flex-shrink-0`}
                  >
                    {letter}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary truncate">
                    {day.dayLabel}
                  </p>
                  <p className="text-sm text-text-muted">
                    {day.restDay ? 'יום מנוחה' : day.name || 'ללא שם'}
                  </p>
                </div>
                {!day.restDay && (
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-left">
                      <div className="text-lg font-bold text-primary-main">{day.exercises.length}</div>
                      <div className="text-xs text-text-muted">תרגילים</div>
                    </div>
                    {day.exercises.length > 0 && (
                      <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                )}
              </div>

              {/* Exercise list (collapsed by default) */}
              {isExpanded && !day.restDay && day.exercises.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-white/10">
                  {day.exercises.map((ex, i) => {
                    const isSuperset = ex.supersetGroup && day.exercises.some(
                      (other, j) => j !== i && other.supersetGroup === ex.supersetGroup
                    )

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between py-2 px-3 rounded-xl ${
                          isSuperset
                            ? 'bg-accent-purple/10 border border-accent-purple/20'
                            : 'bg-dark-surface/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-text-muted text-sm w-5 flex-shrink-0">
                            {i + 1}.
                          </span>
                          {ex.imageUrl ? (
                            <img
                              src={ex.imageUrl}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-dark-surface flex items-center justify-center text-sm flex-shrink-0">
                              🏋️
                            </div>
                          )}
                          <span className="text-text-secondary text-sm truncate">
                            {ex.exerciseNameHe}
                          </span>
                          {isSuperset && (
                            <span className="text-xs text-accent-purple bg-accent-purple/20 px-1.5 py-0.5 rounded flex-shrink-0">
                              SS
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted text-xs flex-shrink-0 mr-2">
                          {ex.targetSets}×{ex.targetReps}
                          {ex.targetWeight ? ` @ ${ex.targetWeight}ק"ג` : ''}
                        </span>
                      </div>
                    )
                  })}
                  {/* Day totals */}
                  <div className="flex justify-end pt-2 text-xs text-text-muted">
                    סה&quot;כ: {day.exercises.length} תרגילים • {daySets} סטים
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
