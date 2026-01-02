import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, ArrowLeft, Dumbbell, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
})

const registerSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'שם פרטי נדרש'),
  lastName: z.string().min(2, 'שם משפחה נדרש'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type RegisterFormData = z.infer<typeof registerSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register: registerUser, isLoading, error, clearError, user, isAuthenticated } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    }
  }, [isAuthenticated, user, navigate])

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', firstName: '', lastName: '' },
  })

  // Handle login submit
  const handleLogin = async (data: LoginFormData) => {
    clearError()
    try {
      await login(data.email, data.password)
      toast.success('ברוך הבא!')
    } catch {
      // Error is handled in the store
    }
  }

  // Handle registration
  const handleRegister = async (data: RegisterFormData) => {
    clearError()
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      })
      toast.success('ברוך הבא ל-GymIQ!')
    } catch {
      // Error is handled in the store
    }
  }

  // Switch mode
  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    clearError()
    loginForm.reset()
    registerForm.reset()
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-neon mb-4 animate-pulse-glow">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">GymIQ</h1>
          <p className="text-text-secondary mt-2">פלטפורמת הכושר החכמה שלך</p>
        </div>

        {/* Card */}
        <div className="card-neon animate-scale-in">
          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-semibold text-text-primary text-center mb-2">
                כניסה ל-GymIQ
              </h2>
              <p className="text-text-muted text-center mb-8">הזינו את פרטי ההתחברות</p>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    אימייל
                  </label>
                  <div className="relative">
                    <input
                      {...loginForm.register('email')}
                      type="email"
                      dir="ltr"
                      placeholder="your@email.com"
                      className={`input-neon w-full pl-12 text-left ${
                        loginForm.formState.errors.email ? 'border-red-500' : ''
                      }`}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    סיסמה
                  </label>
                  <div className="relative">
                    <input
                      {...loginForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      placeholder="******"
                      className={`input-neon w-full pl-12 pr-12 text-left ${
                        loginForm.formState.errors.password ? 'border-red-500' : ''
                      }`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'התחבר'}
                </button>
              </form>

              <p className="text-text-muted text-sm text-center mt-6">
                אין לך חשבון?{' '}
                <button onClick={switchMode} className="text-neon-cyan hover:underline">
                  הירשם עכשיו
                </button>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={switchMode}
                className="flex items-center gap-2 text-text-muted hover:text-text-primary mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                חזרה להתחברות
              </button>

              <h2 className="text-xl font-semibold text-text-primary text-center mb-2">
                יצירת חשבון חדש
              </h2>
              <p className="text-text-muted text-center mb-8">הצטרף ל-GymIQ</p>

              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      שם פרטי
                    </label>
                    <input
                      {...registerForm.register('firstName')}
                      type="text"
                      placeholder="שם פרטי"
                      className={`input-neon w-full ${
                        registerForm.formState.errors.firstName ? 'border-red-500' : ''
                      }`}
                    />
                    {registerForm.formState.errors.firstName && (
                      <p className="text-red-400 text-xs mt-1">
                        {registerForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      שם משפחה
                    </label>
                    <input
                      {...registerForm.register('lastName')}
                      type="text"
                      placeholder="שם משפחה"
                      className={`input-neon w-full ${
                        registerForm.formState.errors.lastName ? 'border-red-500' : ''
                      }`}
                    />
                    {registerForm.formState.errors.lastName && (
                      <p className="text-red-400 text-xs mt-1">
                        {registerForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    אימייל
                  </label>
                  <div className="relative">
                    <input
                      {...registerForm.register('email')}
                      type="email"
                      dir="ltr"
                      placeholder="your@email.com"
                      className={`input-neon w-full pl-12 text-left ${
                        registerForm.formState.errors.email ? 'border-red-500' : ''
                      }`}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-red-400 text-sm mt-1">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    סיסמה
                  </label>
                  <div className="relative">
                    <input
                      {...registerForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      placeholder="מינימום 6 תווים"
                      className={`input-neon w-full pl-12 pr-12 text-left ${
                        registerForm.formState.errors.password ? 'border-red-500' : ''
                      }`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-red-400 text-sm mt-1">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    אימות סיסמה
                  </label>
                  <div className="relative">
                    <input
                      {...registerForm.register('confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      placeholder="הזן שוב את הסיסמה"
                      className={`input-neon w-full pl-12 text-left ${
                        registerForm.formState.errors.confirmPassword ? 'border-red-500' : ''
                      }`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-neon w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'צור חשבון'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Firebase Setup Notice */}
        <div className="mt-6 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
          <p className="text-yellow-400 text-sm text-center">
            <strong>שים לב:</strong> יש להגדיר את Firebase credentials בקובץ .env
          </p>
        </div>
      </div>
    </div>
  )
}
