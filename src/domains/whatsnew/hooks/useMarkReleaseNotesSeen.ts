import { useMutation } from '@tanstack/react-query'
import { markReleaseNotesAsSeen } from '@/lib/firebase'
import { useAuthStore } from '@/domains/authentication/store'
import type { ReleaseNote } from '../types/releaseNote.types'

const toMillis = (value: unknown): number | null => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

/**
 * Marks all currently-visible release notes as seen by the current user.
 *
 * The optimistic update uses `max(unseenNotes.publishedAt) + 1ms` rather than
 * `Date.now()` so the UI state is derived from server times (the notes'
 * publishedAt is already a server timestamp). This avoids the client-clock-
 * skew race where a user whose local clock lags the server could see the
 * badge flash back after dismissal. The Firestore write uses serverTimestamp
 * (will be strictly later than our optimistic value), which becomes the
 * source of truth on next refetch.
 */
export function useMarkReleaseNotesSeen() {
  const updateLastSeen = useAuthStore((s) => s.updateLastSeenReleaseNotes)

  return useMutation({
    mutationFn: async (args: { uid: string; unseenNotes: ReleaseNote[] }) => {
      await markReleaseNotesAsSeen(args.uid)
      return args
    },
    onMutate: async ({ unseenNotes }) => {
      const prev = useAuthStore.getState().user?.lastSeenReleaseNotesAt ?? null
      const maxMs = unseenNotes
        .map((n) => toMillis(n.publishedAt))
        .filter((ms): ms is number => ms !== null)
        .reduce((acc, ms) => Math.max(acc, ms), 0)
      if (maxMs > 0) {
        updateLastSeen(new Date(maxMs + 1))
      }
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev instanceof Date) {
        updateLastSeen(context.prev)
      }
    },
  })
}
