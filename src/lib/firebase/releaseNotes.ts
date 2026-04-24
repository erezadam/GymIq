import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getCountFromServer,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from './config'
import type {
  ReleaseNote,
  ReleaseNoteStatus,
  CreateReleaseNoteInput,
  UpdateReleaseNoteInput,
} from '../../domains/whatsnew/types/releaseNote.types'

const COLLECTION_NAME = 'releaseNotes'

const fromDoc = (snap: QueryDocumentSnapshot<DocumentData>): ReleaseNote => {
  const data = snap.data()
  return {
    id: snap.id,
    version: data.version,
    changelogHash: data.changelogHash,
    titleHe: data.titleHe,
    bodyHe: data.bodyHe,
    iconEmoji: data.iconEmoji ?? '🎁',
    status: data.status,
    publishedAt: data.publishedAt ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    audience: data.audience ?? 'all',
    order: typeof data.order === 'number' ? data.order : 0,
  }
}

/** כל ה-notes שפורסמו, ממוינים מהחדש לישן. שימוש עבור Modal ו-Screen של המשתמש */
export const getPublishedReleaseNotes = async (): Promise<ReleaseNote[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(fromDoc)
}

/** כל ה-notes (admin only). אופציונלי: סינון לפי סטטוס */
export const getAllReleaseNotes = async (
  statusFilter?: ReleaseNoteStatus
): Promise<ReleaseNote[]> => {
  const baseRef = collection(db, COLLECTION_NAME)
  const q = statusFilter
    ? query(
        baseRef,
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc')
      )
    : query(baseRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(fromDoc)
}

/** מספר ה-drafts (admin only). שימוש עבור Badge ב-Admin Dashboard */
export const getDraftsCount = async (): Promise<number> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('status', '==', 'draft')
  )
  const snap = await getCountFromServer(q)
  return snap.data().count
}

/** בודק אם קיים note עם hash נתון (מונע כפילויות בסקריפט סנכרון עתידי) */
export const checkExistsByHash = async (hash: string): Promise<boolean> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('changelogHash', '==', hash),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

/** יוצר note חדש. status ברירת מחדל 'draft', publishedAt תמיד null ביצירה */
export const createReleaseNote = async (
  input: CreateReleaseNoteInput
): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    version: input.version,
    changelogHash: input.changelogHash,
    titleHe: input.titleHe,
    bodyHe: input.bodyHe,
    iconEmoji: input.iconEmoji ?? '🎁',
    status: input.status ?? 'draft',
    publishedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    audience: input.audience ?? 'all',
    order: input.order ?? 0,
  })
  return docRef.id
}

/** מעדכן note קיים + חותמת updatedAt */
export const updateReleaseNote = async (
  id: string,
  updates: UpdateReleaseNoteInput
): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id)
  // Firestore rejects undefined values. Strip them before sending — matches
  // the pattern from auth.ts:updateUserProfile. With updateDoc(), omitted
  // keys preserve their existing value in the document.
  const clean = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  )
  await updateDoc(ref, {
    ...clean,
    updatedAt: serverTimestamp(),
  })
}

/** מפרסם note: status='published' + publishedAt=now */
export const publishReleaseNote = async (id: string): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id)
  await updateDoc(ref, {
    status: 'published',
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** מעביר note לארכיון. publishedAt נשמר (היסטוריה) */
export const archiveReleaseNote = async (id: string): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id)
  await updateDoc(ref, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  })
}

/** מחיקה מלאה של note מה-collection */
export const deleteReleaseNote = async (id: string): Promise<void> => {
  const ref = doc(db, COLLECTION_NAME, id)
  await deleteDoc(ref)
}

/** קריאה של note בודד לפי id (שימושי ל-Admin UI בעתיד) */
export const getReleaseNoteById = async (
  id: string
): Promise<ReleaseNote | null> => {
  const ref = doc(db, COLLECTION_NAME, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return fromDoc(snap as QueryDocumentSnapshot<DocumentData>)
}
