import { useUnreadMessages } from '../../hooks/useUnreadMessages'

export function InboxBadge() {
  const { unreadCount } = useUnreadMessages()

  if (unreadCount === 0) return null

  return (
    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-error text-white text-[10px] font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
