import { mockState } from './state'

export const firestore: any = () => ({
  collection: (col: string) => ({
    doc: (id: string) => ({
      id,
      async get() {
        const data = col === 'users' ? mockState.users.get(id) : undefined
        return { exists: col === 'users' ? mockState.users.has(id) : false, data: () => data }
      },
    }),
  }),
  async runTransaction(cb: any) {
    return cb({
      get: async () => ({ exists: false, data: () => undefined }),
      set: () => {},
    })
  },
})
firestore.FieldValue = { increment: () => 1, serverTimestamp: () => 'ts' }

export const auth = () => ({
  async getUser(uid: string) {
    if (!mockState.authUsers.has(uid)) throw new Error('no such user')
    return { email: mockState.authUsers.get(uid)!.email }
  },
  async generatePasswordResetLink(email: string) {
    mockState.resetLinkCalls.push(email)
    return `https://reset/${email}`
  },
})

export default { firestore, auth }
