// Mock for 'firebase-admin/firestore' subpath imports in functions specs.
export const FieldValue = {
  serverTimestamp: () => ({ __sentinel: 'serverTimestamp' }),
  increment: (n: number) => ({ __inc: n }),
}
export const Timestamp = {
  now: () => {
    const ms = Date.now()
    return { toDate: () => new Date(ms), toMillis: () => ms }
  },
}
