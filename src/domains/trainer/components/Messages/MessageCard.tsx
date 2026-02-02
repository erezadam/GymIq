import { Clock, CheckCircle2 } from 'lucide-react'
import type { TrainerMessage } from '../../types'
import { MESSAGE_TYPE_LABELS } from '../../types'

interface MessageCardProps {
  message: TrainerMessage
}

function formatDate(date: Date | string | { toDate?: () => Date }): string {
  const d = typeof date === 'object' && 'toDate' in date && date.toDate ? date.toDate() : new Date(date as string | Date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דק`
  if (diffHours < 24) return `לפני ${diffHours} שע`
  if (diffDays < 7) return `לפני ${diffDays} ימים`
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

export function MessageCard({ message }: MessageCardProps) {
  const isHighPriority = message.priority === 'high'

  return (
    <div
      className={`card transition-colors ${
        !message.isRead ? 'border-r-2 border-r-primary-main bg-primary-main/5' : ''
      } ${isHighPriority ? 'border-l-2 border-l-status-error' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-dark-card text-text-muted">
            {MESSAGE_TYPE_LABELS[message.type] || message.type}
          </span>
          {isHighPriority && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-status-error/10 text-status-error">
              דחוף
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          {message.isRead ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
          <span>{formatDate(message.createdAt)}</span>
        </div>
      </div>

      {/* Subject */}
      {message.subject && (
        <h4 className="text-sm font-semibold text-text-primary mb-1">
          {message.subject}
        </h4>
      )}

      {/* Body */}
      <p className="text-sm text-text-secondary whitespace-pre-line line-clamp-3">
        {message.body}
      </p>

      {/* Reference */}
      {message.referenceName && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-dark-card text-xs text-text-muted">
          קשור ל: {message.referenceName}
        </div>
      )}
    </div>
  )
}
