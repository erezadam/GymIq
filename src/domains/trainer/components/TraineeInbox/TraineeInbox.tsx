import { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { messageService } from '../../services/messageService'
import { useMessageStore } from '../../store/messageStore'
import type { TrainerMessage } from '../../types'
import { InboxMessageCard } from './InboxMessageCard'

export default function TraineeInbox() {
  const { user } = useAuthStore()
  const { setUnreadCount } = useMessageStore()
  const [messages, setMessages] = useState<TrainerMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) return

    setIsLoading(true)
    messageService
      .getTraineeMessages(user.uid)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [user?.uid])

  const handleRead = async (messageId: string) => {
    try {
      await messageService.markAsRead(messageId)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isRead: true, readAt: new Date() } : m
        )
      )
      // Update unread count (subtract 1 from current since we just marked one as read)
      const newUnread = messages.filter(
        (m) => !m.isRead
      ).length - 1
      setUnreadCount(Math.max(0, newUnread))

      // Toggle expansion
      setExpandedId(expandedId === messageId ? null : messageId)
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">הודעות</h1>
        <p className="text-sm text-text-muted mt-1">
          {messages.filter((m) => !m.isRead).length > 0
            ? `${messages.filter((m) => !m.isRead).length} הודעות שלא נקראו`
            : 'כל ההודעות נקראו'}
        </p>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="empty-state">
          <Mail className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <p className="empty-state-title">אין הודעות</p>
          <p className="empty-state-text">הודעות מהמאמן שלך יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id}>
              <InboxMessageCard message={message} onRead={handleRead} />
              {/* Expanded content */}
              {expandedId === message.id && (
                <div className="mt-1 mr-4 p-4 bg-dark-card rounded-xl text-sm text-text-secondary whitespace-pre-line">
                  {message.body}
                  {message.referenceName && (
                    <div className="mt-3 pt-2 border-t border-dark-border/50 text-xs text-text-muted">
                      קשור ל: {message.referenceName}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
