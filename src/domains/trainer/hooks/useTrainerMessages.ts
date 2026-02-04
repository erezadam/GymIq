import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { messageService } from '../services/messageService'
import type { TrainerMessage } from '../types'

export function useTrainerMessages(traineeId?: string) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<TrainerMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    setError(null)

    try {
      const msgs = traineeId
        ? await messageService.getTrainerMessagesToTrainee(user.uid, traineeId)
        : await messageService.getTrainerMessages(user.uid)
      setMessages(msgs)
    } catch (err: any) {
      console.error('Error loading messages:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid, traineeId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const sendMessage = async (
    data: Omit<TrainerMessage, 'id' | 'isRead' | 'readAt' | 'createdAt' | 'replies'>
  ) => {
    await messageService.sendMessage(data)
    await loadMessages()
  }

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages: loadMessages,
  }
}
