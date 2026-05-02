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

// Recursively strip keys whose values are `undefined`. Preserves Date,
// Firestore Timestamp, and primitive values as-is. Arrays are mapped, with
// each object element cleaned recursively.
export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' && item !== null && !isTimestamp(item)
            ? removeUndefined(item)
            : item
        )
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !(value instanceof Date) &&
        !isTimestamp(value)
      ) {
        result[key] = removeUndefined(value)
      } else {
        result[key] = value
      }
    }
  }
  return result as T
}
