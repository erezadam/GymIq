import { create } from 'zustand'
import type { TrainerMessage } from '../types'

interface MessageStoreState {
  unreadCount: number
  messages: TrainerMessage[]
  isLoading: boolean
}

interface MessageStoreActions {
  setUnreadCount: (count: number) => void
  setMessages: (messages: TrainerMessage[]) => void
  markAsRead: (messageId: string) => void
  setIsLoading: (loading: boolean) => void
}

type MessageStore = MessageStoreState & MessageStoreActions

export const useMessageStore = create<MessageStore>((set) => ({
  unreadCount: 0,
  messages: [],
  isLoading: false,

  setUnreadCount: (count) => set({ unreadCount: count }),
  setMessages: (messages) => set({ messages }),
  markAsRead: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isRead: true, readAt: new Date() } : m
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
