import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { TrainerMessage } from '../../types'
import { MESSAGE_TYPE_LABELS } from '../../types'

interface InboxMessageCardProps {
  message: TrainerMessage
  onRead: (messageId: string) => void
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

export function InboxMessageCard({ message, onRead }: InboxMessageCardProps) {
  const isUnread = !message.isRead
  const isHighPriority = message.priority === 'high'

  const handleClick = () => {
    if (isUnread) {
      onRead(message.id)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`card w-full text-right transition-colors ${
        isUnread ? 'border-r-2 border-r-primary-main bg-primary-main/5' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">
            {message.trainerName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-dark-card text-text-muted">
            {MESSAGE_TYPE_LABELS[message.type] || message.type}
          </span>
          {isHighPriority && (
            <AlertCircle className="w-3.5 h-3.5 text-status-error" />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          {isUnread ? (
            <Clock className="w-3 h-3 text-primary-main" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-status-success" />
          )}
          <span>{formatDate(message.createdAt)}</span>
        </div>
      </div>

      {/* Subject */}
      {message.subject && (
        <h4 className={`text-sm mb-1 ${isUnread ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>
          {message.subject}
        </h4>
      )}

      {/* Body */}
      <p className="text-sm text-text-muted whitespace-pre-line line-clamp-2">
        {message.body}
      </p>
    </button>
  )
}
