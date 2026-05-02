/**
 * Shared utilities for Firestore writes.
 *
 * Iron rule: Firestore's updateDoc()/setDoc()/addDoc() reject any field with
 * value `undefined`. Always pass payloads through `removeUndefined()` before
 * writing if the source object may contain optional fields whose values
 * could be undefined (forms, Partial<T> updates, etc.).
 */

// Check if a value is a Firestore Timestamp (has a toDate method).
export function isTimestamp(value: unknown): boolean {
  return Boolean(value && typeof (value as { toDate?: unknown }).toDate === 'function')
}

// True for "plain" data objects whose properties we should clean recursively.
// False for Date, Firestore Timestamp, FieldValue sentinels (deleteField,
// serverTimestamp, arrayUnion, ...), and any other class instance — these
// are passed through as-is so the Firestore SDK can interpret them.
function isPlainObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

// True if a value is "data-shaped" — a plain object we should walk into.
// Excludes class instances (Date, Timestamp, FieldValue) AND duck-type
// timestamps (plain objects with a `toDate` method) so neither is corrupted.
function shouldRecurse(value: unknown): boolean {
  return isPlainObject(value) && !isTimestamp(value)
}

// Recursively strip keys whose values are `undefined`. Plain data objects
// and arrays are walked; class instances (Date, Timestamp, FieldValue, etc.)
// and duck-type timestamps are preserved verbatim so the Firestore SDK can
// interpret their sentinel behavior (deleteField, serverTimestamp, ...).
export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        shouldRecurse(item) ? removeUndefined(item as Record<string, any>) : item
      )
    } else if (shouldRecurse(value)) {
      result[key] = removeUndefined(value)
    } else {
      result[key] = value
    }
  }
  return result as T
}
