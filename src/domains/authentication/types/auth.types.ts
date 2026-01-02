// User profile
export interface UserProfile {
  id: string
  phoneNumber: string
  firstName: string
  lastName: string
  displayName: string

  // Role & permissions
  role: 'user' | 'trainer' | 'admin'

  // Preferences
  language: 'he' | 'en'
  theme: 'light' | 'dark' | 'auto'

  // Physical attributes (optional)
  height?: number // cm
  weight?: number // kg
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'

  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date
}

// Auth state
export interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// DTOs
export interface LoginDto {
  phoneNumber: string
}

export interface RegisterDto {
  phoneNumber: string
  firstName: string
  lastName: string
}
