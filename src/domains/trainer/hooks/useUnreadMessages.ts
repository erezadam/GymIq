import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { messageService } from '../services/messageService'
import { useMessageStore } from '../store/messageStore'

const POLL_INTERVAL = 60_000 // 60 seconds

export function useUnreadMessages() {
  const { user } = useAuthStore()
  const { unreadCount, setUnreadCount } = useMessageStore()
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user?.uid || !user.trainerId) return

    const fetchUnread = async () => {
      try {
        const count = await messageService.getUnreadCount(user.uid)
        setUnreadCount(count)
      } catch (error) {
        console.error('Error fetching unread messages:', error)
      }
    }

    // Initial fetch
    fetchUnread()

    // Poll every 60 seconds
    intervalRef.current = window.setInterval(fetchUnread, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user?.uid, user?.trainerId, setUnreadCount])

  return { unreadCount }
}
