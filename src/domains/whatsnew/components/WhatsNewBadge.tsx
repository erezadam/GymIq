import { useNavigate } from 'react-router-dom'
import { useUnseenNotes } from '../hooks/useUnseenNotes'

/**
 * Gift icon (🎁) shown in the app header. Returns `null` entirely when there
 * are no unseen release notes — no dim/grey fallback, per product decision.
 * Clicking navigates to the full What's New screen.
 */
export function WhatsNewBadge() {
  const navigate = useNavigate()
  const { hasUnseen, unseenCount } = useUnseenNotes()

  if (!hasUnseen) return null

  return (
    <button
      type="button"
      onClick={() => navigate('/whats-new')}
      className="relative inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-surface-container transition-colors animate-pulse"
      aria-label={`מה חדש — ${unseenCount} הודעות חדשות`}
    >
      <span className="text-2xl leading-none">🎁</span>
      {unseenCount > 0 && (
        <span className="absolute -top-0.5 -left-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-status-error text-white text-[10px] font-bold">
          {unseenCount > 99 ? '99+' : unseenCount}
        </span>
      )}
    </button>
  )
}
