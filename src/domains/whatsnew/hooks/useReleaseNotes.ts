import { useQuery } from '@tanstack/react-query'
import { getPublishedReleaseNotes } from '@/lib/firebase/releaseNotes'
import type { ReleaseNote } from '../types/releaseNote.types'

export const RELEASE_NOTES_QUERY_KEY = ['releaseNotes', 'published'] as const

/** Loads all published release notes, ordered newest-first. Cached 5 minutes. */
export function useReleaseNotes() {
  return useQuery<ReleaseNote[]>({
    queryKey: RELEASE_NOTES_QUERY_KEY,
    queryFn: getPublishedReleaseNotes,
    staleTime: 5 * 60 * 1000,
  })
}
