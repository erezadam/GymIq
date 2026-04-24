import { useMemo } from 'react'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { useReleaseNotes } from './useReleaseNotes'
import type { ReleaseNote } from '../types/releaseNote.types'

type UnseenResult = {
  hasUnseen: boolean
  unseenCount: number
  unseenNotes: ReleaseNote[]
  isReady: boolean
}

const toMillis = (value: unknown): number | null => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

/**
 * Computes which published notes the current user has not yet seen, based on
 * their `lastSeenReleaseNotesAt`. A note is "unseen" if its `publishedAt` is
 * strictly greater than the user's last-seen timestamp (or if the user has no
 * timestamp at all — should not happen after the migration script).
 */
export function useUnseenNotes(): UnseenResult {
  const user = useEffectiveUser()
  const { data: notes, isSuccess } = useReleaseNotes()

  return useMemo(() => {
    if (!user || !isSuccess || !notes) {
      return { hasUnseen: false, unseenCount: 0, unseenNotes: [], isReady: false }
    }

    const lastSeenMs = toMillis(user.lastSeenReleaseNotesAt)

    const unseenNotes = notes.filter((note) => {
      const publishedMs = toMillis(note.publishedAt)
      if (publishedMs === null) return false
      if (lastSeenMs === null) return true
      return publishedMs > lastSeenMs
    })

    return {
      hasUnseen: unseenNotes.length > 0,
      unseenCount: unseenNotes.length,
      unseenNotes,
      isReady: true,
    }
  }, [user, notes, isSuccess])
}
