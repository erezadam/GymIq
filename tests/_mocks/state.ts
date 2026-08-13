// Shared mutable state for the aliased firebase-admin / firebase-functions
// mocks used by the sendWelcomeEmail behavioral test.
export const mockState = {
  users: new Map<string, any>(),
  authUsers: new Map<string, { email: string }>(),
  resetLinkCalls: [] as string[],
  reset() {
    this.users.clear()
    this.authUsers.clear()
    this.resetLinkCalls = []
  },
}
