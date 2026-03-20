import { Eye, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/domains/authentication/store'

const ROLE_LABELS: Record<string, string> = {
  user: 'משתמש',
  trainer: 'מאמן',
  admin: 'מנהל',
}

export function ImpersonationBanner() {
  const { impersonatedUser, stopImpersonation } = useAuthStore()
  const navigate = useNavigate()

  if (!impersonatedUser) return null

  const displayName =
    impersonatedUser.displayName ||
    `${impersonatedUser.firstName} ${impersonatedUser.lastName}`.trim() ||
    impersonatedUser.email

  const roleLabel = ROLE_LABELS[impersonatedUser.role] || impersonatedUser.role

  const handleExit = () => {
    stopImpersonation()
    navigate('/admin/users')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-black">
      <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4" />
          <span>
            צופה כמשתמש: {displayName} ({roleLabel})
          </span>
          <span className="text-amber-800 text-xs">— מצב קריאה בלבד</span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[44px] justify-center"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">חזור לממשק ניהול</span>
        </button>
      </div>
    </div>
  )
}
