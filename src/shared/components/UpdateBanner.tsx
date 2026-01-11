/**
 * UpdateBanner - Shows when a new version is available
 * Fixed banner at top of screen with update button
 */

import { RefreshCw, X } from 'lucide-react'

interface UpdateBannerProps {
  onUpdate: () => void
  onDismiss: () => void
  newVersion?: string | null
}

export function UpdateBanner({ onUpdate, onDismiss, newVersion }: UpdateBannerProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-primary-main text-white px-4 pb-3 pt-[env(safe-area-inset-top,12px)] shadow-lg animate-slide-up"
      style={{ paddingTop: `max(env(safe-area-inset-top, 12px), 12px)` }}
      dir="rtl"
    >
      <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
        {/* Message */}
        <div className="flex-1 text-sm font-medium">
          גרסה חדשה זמינה {newVersion && `(${newVersion})`}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Update button */}
          <button
            onClick={onUpdate}
            className="flex items-center gap-2 px-4 py-2 bg-white text-primary-dark rounded-lg font-medium text-sm min-h-[44px] active:bg-neon-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>עדכן עכשיו</span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white active:text-white transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
