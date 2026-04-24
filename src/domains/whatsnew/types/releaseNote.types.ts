import type { Timestamp } from 'firebase/firestore'

export type ReleaseNoteStatus = 'draft' | 'published' | 'archived'

export type ReleaseNoteAudience = 'all'

export interface ReleaseNote {
  id: string
  version: string
  changelogHash: string
  titleHe: string
  bodyHe: string
  iconEmoji: string
  status: ReleaseNoteStatus
  publishedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  audience: ReleaseNoteAudience
  order: number
}

export interface CreateReleaseNoteInput {
  version: string
  changelogHash: string
  titleHe: string
  bodyHe: string
  iconEmoji?: string
  status?: ReleaseNoteStatus
  audience?: ReleaseNoteAudience
  order?: number
}

/**
 * Fields updatable via `updateReleaseNote()`.
 *
 * NOTE: `status` is intentionally excluded. Use `publishReleaseNote()` or
 * `archiveReleaseNote()` for status transitions — they handle `publishedAt`
 * atomically. Bypassing them would create inconsistent state (e.g.
 * `status='published'` with `publishedAt=null`) that won't appear in
 * `getPublishedReleaseNotes()` ordering.
 */
export type UpdateReleaseNoteInput = Partial<{
  version: string
  changelogHash: string
  titleHe: string
  bodyHe: string
  iconEmoji: string
  audience: ReleaseNoteAudience
  order: number
}>
