import type { ProgramDay } from '../../types'
import { Moon, Dumbbell } from 'lucide-react'

interface ProgramReviewProps {
  name: string
  traineeName: string
  description: string
  durationWeeks: number | null
  startDate: string
  days: ProgramDay[]
}

export function ProgramReview({
  name,
  traineeName,
  description,
  durationWeeks,
  startDate,
  days,
}: ProgramReviewProps) {
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
      {/* Program summary */}
      <div className="card">
        <h3 className="text-lg font-bold text-text-primary mb-3">{name}</h3>
        {description && (
          <p className="text-sm text-text-secondary mb-3">{description}</p>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-muted">מתאמן:</span>
            <span className="text-text-primary mr-2">{traineeName}</span>
          </div>
          <div>
            <span className="text-text-muted">תאריך התחלה:</span>
            <span className="text-text-primary mr-2">{startDate}</span>
          </div>
          <div>
            <span className="text-text-muted">משך:</span>
            <span className="text-text-primary mr-2">
              {durationWeeks ? `${durationWeeks} שבועות` : 'ללא הגבלה'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="card-stat">
          <p className="text-xl font-bold text-primary-main">{trainingDays}</p>
          <p className="text-xs text-text-muted">ימי אימון</p>
        </div>
        <div className="card-stat">
          <p className="text-xl font-bold text-status-info">{restDays}</p>
          <p className="text-xs text-text-muted">ימי מנוחה</p>
        </div>
        <div className="card-stat">
          <p className="text-xl font-bold text-accent-gold">{totalExercises}</p>
          <p className="text-xs text-text-muted">תרגילים</p>
        </div>
        <div className="card-stat">
          <p className="text-xl font-bold text-accent-orange">{totalSets}</p>
          <p className="text-xs text-text-muted">סטים</p>
        </div>
      </div>

      {/* Days detail */}
      <div className="space-y-3">
        {days.map((day, index) => (
          <div key={index} className="card">
            <div className="flex items-center gap-3 mb-2">
              {day.restDay ? (
                <Moon className="w-5 h-5 text-status-info" />
              ) : (
                <Dumbbell className="w-5 h-5 text-primary-main" />
              )}
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {day.dayLabel}
                </p>
                <p className="text-xs text-text-muted">
                  {day.restDay ? 'יום מנוחה' : day.name || 'ללא שם'}
                </p>
              </div>
            </div>
            {!day.restDay && day.exercises.length > 0 && (
              <div className="space-y-1 mt-2">
                {day.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-1 border-b border-dark-border/50 last:border-0"
                  >
                    <span className="text-text-secondary">
                      {i + 1}. {ex.exerciseNameHe}
                    </span>
                    <span className="text-text-muted text-xs">
                      {ex.targetSets}×{ex.targetReps}
                      {ex.targetWeight ? ` @ ${ex.targetWeight}ק"ג` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
