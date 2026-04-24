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

export type UpdateReleaseNoteInput = Partial<{
  version: string
  changelogHash: string
  titleHe: string
  bodyHe: string
  iconEmoji: string
  status: ReleaseNoteStatus
  audience: ReleaseNoteAudience
  order: number
}>
