import { useReleaseNotes } from '../hooks/useReleaseNotes'
import { MarkdownContent } from './MarkdownContent'
import type { ReleaseNote } from '../types/releaseNote.types'

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
 * Full history screen for release notes. Mounted at `/whats-new`. Always
 * available, no dismiss logic — this is the canonical archive.
 */
export default function WhatsNewScreen() {
  const { data: notes, isLoading, isError } = useReleaseNotes()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <header className="flex items-center gap-3">
        <span className="text-4xl leading-none">🎁</span>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">מה חדש</h1>
          <p className="text-sm text-on-surface-variant">כל העדכונים והחידושים באפליקציה</p>
        </div>
      </header>

      {isLoading && (
        <div className="text-center py-12 text-on-surface-variant">טוען…</div>
      )}

      {isError && (
        <div className="text-center py-12 text-status-error">
          שגיאה בטעינת העדכונים. נסה לרענן.
        </div>
      )}

      {!isLoading && !isError && (!notes || notes.length === 0) && (
        <div className="text-center py-12 text-on-surface-variant">
          אין עדיין עדכונים לצפייה.
        </div>
      )}

      <div className="space-y-5">
        {notes?.map((note) => (
          <article
            key={note.id}
            className="bg-surface-container rounded-2xl p-5 space-y-3 shadow-sm"
          >
            <header className="flex items-start gap-3">
              <span className="text-3xl leading-none shrink-0" aria-hidden="true">
                {note.iconEmoji || '🎁'}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-on-surface break-words">
                  {note.titleHe}
                </h2>
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
    </div>
  )
}
