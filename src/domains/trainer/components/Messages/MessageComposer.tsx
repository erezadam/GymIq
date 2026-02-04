import { useState } from 'react'
import { Send, Loader2, X } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { messageService } from '../../services/messageService'
import type { MessageType, MessagePriority, TrainerRelationship } from '../../types'
import { MESSAGE_TYPE_LABELS } from '../../types'

interface MessageComposerProps {
  trainees: TrainerRelationship[]
  preselectedTraineeId?: string
  onSent?: () => void
  onClose?: () => void
}

export function MessageComposer({
  trainees,
  preselectedTraineeId,
  onSent,
  onClose,
}: MessageComposerProps) {
  const { user } = useAuthStore()
  const [traineeId, setTraineeId] = useState(preselectedTraineeId || '')
  const [type, setType] = useState<MessageType>('general')
  const [priority, setPriority] = useState<MessagePriority>('normal')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSend = traineeId && body.trim().length > 0

  const handleSend = async () => {
    if (!canSend || !user?.uid) return
    setIsSending(true)
    setError(null)

    try {
      await messageService.sendMessage({
        trainerId: user.uid,
        traineeId,
        trainerName: user.displayName || user.firstName || 'מאמן',
        type,
        priority,
        subject: subject.trim() || undefined,
        body: body.trim(),
      })

      setBody('')
      setSubject('')
      onSent?.()
    } catch (err: any) {
      console.error('Error sending message:', err)
      setError(err.message || 'שגיאה בשליחת ההודעה')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">הודעה חדשה</h3>
        {onClose && (
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Trainee select */}
      {!preselectedTraineeId && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            מתאמן *
          </label>
          <select
            value={traineeId}
            onChange={(e) => setTraineeId(e.target.value)}
            className="input-primary"
          >
            <option value="">בחר מתאמן</option>
            {trainees.map((t) => (
              <option key={t.traineeId} value={t.traineeId}>
                {t.traineeName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Type and priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            סוג
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MessageType)}
            className="input-primary text-sm"
          >
            {Object.entries(MESSAGE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            עדיפות
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as MessagePriority)}
            className="input-primary text-sm"
          >
            <option value="normal">רגיל</option>
            <option value="high">דחוף</option>
          </select>
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          נושא
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-primary text-sm"
          placeholder="נושא ההודעה (אופציונלי)"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          תוכן ההודעה *
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="input-primary min-h-[100px] resize-none text-sm"
          placeholder="כתוב את ההודעה כאן..."
          rows={4}
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend || isSending}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        <span>{isSending ? 'שולח...' : 'שלח הודעה'}</span>
      </button>
    </div>
  )
}
