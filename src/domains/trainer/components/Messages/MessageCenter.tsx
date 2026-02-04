import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { useTrainerMessages } from '../../hooks/useTrainerMessages'
import { trainerService } from '../../services/trainerService'
import type { TrainerRelationship } from '../../types'
import { MessageComposer } from './MessageComposer'
import { MessageList } from './MessageList'
import { useEffect } from 'react'

export default function MessageCenter() {
  const { user } = useAuthStore()
  const { messages, isLoading, refreshMessages } = useTrainerMessages()
  const [showComposer, setShowComposer] = useState(false)
  const [trainees, setTrainees] = useState<TrainerRelationship[]>([])

  useEffect(() => {
    if (!user?.uid) return
    trainerService.getTrainerTrainees(user.uid).then(setTrainees).catch(console.error)
  }, [user?.uid])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">הודעות</h1>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>הודעה חדשה</span>
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <MessageComposer
          trainees={trainees}
          onSent={() => {
            setShowComposer(false)
            refreshMessages()
          }}
          onClose={() => setShowComposer(false)}
        />
      )}

      {/* Message list */}
      <MessageList messages={messages} isLoading={isLoading} />
    </div>
  )
}
