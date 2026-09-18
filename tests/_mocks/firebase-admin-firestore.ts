// Mock for 'firebase-admin/firestore' subpath imports in functions specs.
export const FieldValue = {
  serverTimestamp: () => ({ __sentinel: 'serverTimestamp' }),
  increment: (n: number) => ({ __inc: n }),
}
export const Timestamp = { now: () => ({ toDate: () => new Date(0) }) }
