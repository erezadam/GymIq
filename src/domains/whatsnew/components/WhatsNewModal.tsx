import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { useAuthStore } from '@/domains/authentication/store'
import { useUnseenNotes } from '../hooks/useUnseenNotes'
import { useMarkReleaseNotesSeen } from '../hooks/useMarkReleaseNotesSeen'
import { MarkdownContent } from './MarkdownContent'
import type { ReleaseNote } from '../types/releaseNote.types'

const AUTO_OPEN_DELAY_MS = 1000

const BLOCKED_PATHS = ['/workout/session', '/login']

const formatNoteDate = (note: ReleaseNote): string => {
  const value = note.publishedAt
  if (!value) return ''
  const date =
    value instanceof Date
      ? value
      : typeof value === 'object' && value !== null && 'toDate' in value
        ? (value as { toDate: () => Date }).toDate()
        : null
  if (!date) return ''
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Auto-popup modal for new release notes.
 *
 * Opens at most once per app session, and only when ALL hold:
 * - The user is authenticated
 * - `useUnseenNotes` reports unseen notes
 * - Current path is not `/workout/session` or `/login`
 * - At least `AUTO_OPEN_DELAY_MS` has passed since mount (avoids flicker during bootstrap)
 *
 * When dismissed, calls `markReleaseNotesAsSeen(uid)` (server write) plus
 * optimistic store update. The `shownRef` ensures it does not reopen in the
 * same session even if admin publishes a new note while the user is online —
 * badge still updates to indicate new content.
 */
export function WhatsNewModal() {
  const location = useLocation()
  const user = useEffectiveUser()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { hasUnseen, unseenNotes, isReady } = useUnseenNotes()
  const { mutate: markSeen } = useMarkReleaseNotesSeen()

  const [open, setOpen] = useState(false)
  const [readyToAutoOpen, setReadyToAutoOpen] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setReadyToAutoOpen(true), AUTO_OPEN_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (shownRef.current) return
    if (!readyToAutoOpen) return
    if (!isAuthenticated || !user || !isReady) return
    if (!hasUnseen) return
    if (BLOCKED_PATHS.some((p) => location.pathname.startsWith(p))) return

    shownRef.current = true
    setOpen(true)
  }, [readyToAutoOpen, isAuthenticated, user, isReady, hasUnseen, location.pathname])

  const handleClose = () => {
    setOpen(false)
    if (user && unseenNotes.length > 0) {
      markSeen({ uid: user.uid, unseenNotes })
    }
  }

  if (!open || unseenNotes.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatsnew-modal-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-surface-container rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">🎁</span>
            <h2 id="whatsnew-modal-title" className="text-lg font-bold text-on-surface">
              מה חדש
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-on-surface-variant hover:bg-white/5 transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {unseenNotes.map((note) => (
            <article key={note.id} className="space-y-2">
              <header className="flex items-start gap-3">
                <span className="text-2xl leading-none shrink-0" aria-hidden="true">
                  {note.iconEmoji || '🎁'}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-on-surface break-words">
                    {note.titleHe}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-on-surface-variant">
                    <span>{formatNoteDate(note)}</span>
                    {note.version && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span dir="ltr">v{note.version}</span>
                      </>
                    )}
                  </div>
                </div>
              </header>
              <MarkdownContent content={note.bodyHe} />
            </article>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleClose}
            className="w-full h-12 rounded-2xl bg-primary-main text-on-primary font-semibold hover:bg-primary-main/90 transition-colors"
          >
            הבנתי, תודה!
          </button>
        </div>
      </div>
    </div>
  )
}
