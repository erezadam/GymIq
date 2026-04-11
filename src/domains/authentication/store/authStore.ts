import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  registerUser,
  loginUser,
  logoutUser,
  onAuthChange,
  resetPassword,
  type AppUser,
} from '@/lib/firebase'

interface AuthStore {
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Impersonation (admin-only, session-only)
  impersonatedUser: AppUser | null
  startImpersonation: (targetUser: AppUser) => void
  stopImpersonation: () => void

  // Actions
  initialize: () => () => void
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterDto) => Promise<void>
  logout: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  clearError: () => void
}

interface RegisterDto {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber?: string
  city?: string
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
      impersonatedUser: null,

      startImpersonation: (targetUser: AppUser) => {
        const state = useAuthStore.getState()
        if (state.user?.role !== 'admin') return
        set({ impersonatedUser: targetUser })
      },

      stopImpersonation: () => {
        set({ impersonatedUser: null })
      },

      // Initialize auth state listener
      initialize: () => {
        set({ isLoading: true })

        // Return the unsubscribe function
        const unsubscribe = onAuthChange((user) => {
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            isInitialized: true,
          })
        })

        return unsubscribe
      },

      // Login with email/password
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const user = await loginUser(email, password)
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          const errorMessage = getFirebaseErrorMessage(error.code)
          set({ error: errorMessage, isLoading: false })
          throw new Error(errorMessage)
        }
      },

      // Register new user
      register: async (data: RegisterDto) => {
        set({ isLoading: true, error: null })
        try {
          const user = await registerUser(
            data.email,
            data.password,
            data.firstName,
            data.lastName,
            data.phoneNumber,
            data.city
          )
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          console.error('Registration error in store:', error)
          // Handle both Firebase errors (with code) and custom errors (with message)
          const errorMessage = error.code
            ? getFirebaseErrorMessage(error.code)
            : error.message || 'שגיאה לא צפויה בהרשמה'
          set({ error: errorMessage, isLoading: false })
          throw new Error(errorMessage)
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true, impersonatedUser: null })
        try {
          await logoutUser()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // Reset password
      sendPasswordReset: async (email: string) => {
        set({ isLoading: true, error: null })
        try {
          await resetPassword(email)
          set({ isLoading: false })
        } catch (error: any) {
          const errorMessage = getFirebaseErrorMessage(error.code)
          set({ error: errorMessage, isLoading: false })
          throw new Error(errorMessage)
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'gymiq-auth',
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Firebase error messages in Hebrew
function getFirebaseErrorMessage(code: string): string {
  console.error('Firebase error code:', code)

  const messages: Record<string, string> = {
    // Auth errors
    'auth/email-already-in-use': '📧 כתובת האימייל כבר רשומה במערכת',
    'auth/invalid-email': '📧 כתובת אימייל לא תקינה',
    'auth/operation-not-allowed': '🚫 הרשמה באימייל לא מופעלת. פנה למנהל',
    'auth/weak-password': '🔒 הסיסמה חלשה מדי - נדרשים לפחות 6 תווים',
    'auth/user-disabled': '🚫 החשבון הושבת. פנה למנהל',
    'auth/user-not-found': '❓ משתמש לא נמצא במערכת',
    'auth/wrong-password': '🔒 סיסמה שגויה',
    'auth/invalid-credential': '🔒 אימייל או סיסמה שגויים',
    'auth/too-many-requests': '⏳ יותר מדי ניסיונות. המתן מספר דקות',
    'auth/network-request-failed': '🌐 בעיית חיבור לאינטרנט',
    // Firestore errors
    'permission-denied': '🔐 אין הרשאה. בדוק את Security Rules',
    'unavailable': '🌐 השרת לא זמין. נסה שוב',
  }

  return messages[code] || `שגיאה לא צפויה: ${code || 'unknown'}`
}
