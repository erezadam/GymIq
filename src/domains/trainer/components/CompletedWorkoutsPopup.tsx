import { X, MessageCircle, Dumbbell, Calendar, Clock, Trophy } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { TraineeWorkoutCompletion } from '../services/trainerService'

interface CompletedWorkoutsPopupProps {
  completions: TraineeWorkoutCompletion[]
  onClose: () => void
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דק'`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} שע' ${m} דק'` : `${h} שע'`
}

function buildWhatsAppUrl(completion: TraineeWorkoutCompletion): string {
  const phone = completion.traineePhone?.replace(/[^0-9+]/g, '') || ''
  // Convert Israeli local format to international
  const intlPhone = phone.startsWith('0')
    ? '972' + phone.slice(1)
    : phone.startsWith('+')
      ? phone.slice(1)
      : phone

  const dateStr = formatDate(completion.date)
  const message = `היי ${completion.traineeName} 💪\nראיתי שביצעת את האימון "${completion.workoutName}" בתאריך ${dateStr}. כל הכבוד! 🎉`

  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`
}

export function CompletedWorkoutsPopup({ completions, onClose }: CompletedWorkoutsPopupProps) {
  if (completions.length === 0) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md max-h-[80vh] bg-surface-container rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-success/15 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">אימונים שבוצעו</h2>
              <p className="text-xs text-on-surface-variant">
                {completions.length} {completions.length === 1 ? 'אימון חדש' : 'אימונים חדשים'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
            aria-label="סגירה"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {completions.map((completion) => (
            <div
              key={completion.workoutId}
              className="bg-surface-container-low rounded-2xl p-4 border border-white/5"
            >
              {/* Trainee name + date */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">
                    {completion.traineeName}
                  </p>
                  <p className="text-xs text-primary-main font-medium mt-0.5 truncate">
                    {completion.workoutName}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-on-surface-variant mr-2 shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">{formatDate(completion.date)}</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-3">
                {completion.duration > 0 && (
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">{formatDuration(completion.duration)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    {completion.completedExercises}/{completion.totalExercises} תרגילים
                  </span>
                </div>
                {completion.totalVolume > 0 && (
                  <span className="text-xs text-on-surface-variant">
                    {Math.round(completion.totalVolume)} ק"ג
                  </span>
                )}
              </div>

              {/* WhatsApp button */}
              {completion.traineePhone && (
                <a
                  href={buildWhatsAppUrl(completion)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>שלח הודעת WhatsApp</span>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-primary-main/10 text-primary-main font-medium text-sm hover:bg-primary-main/20 transition-colors"
          >
            הבנתי, תודה
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
