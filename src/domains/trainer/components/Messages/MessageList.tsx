import { Mail } from 'lucide-react'
import type { TrainerMessage } from '../../types'
import { MessageCard } from './MessageCard'

interface MessageListProps {
  messages: TrainerMessage[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-dark-card rounded w-1/4 mb-2" />
            <div className="h-4 bg-dark-card rounded w-3/4 mb-1" />
            <div className="h-4 bg-dark-card rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="empty-state">
        <Mail className="w-12 h-12 mx-auto mb-3 text-text-muted" />
        <p className="empty-state-title">אין הודעות</p>
        <p className="empty-state-text">שלח הודעה למתאמן שלך</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <MessageCard key={message.id} message={message} />
      ))}
    </div>
  )
}
