import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Dumbbell,
  History,
  User,
  LogOut,
  Menu,
  X,
  Library,
  TrendingUp,
  Shield
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/domains/authentication/store'

const navigation = [
  { name: 'דשבורד', href: '/dashboard', icon: Home },
  { name: 'ספריה', href: '/exercises', icon: Library },
  { name: 'היסטוריה', href: '/workout/history', icon: History },
  { name: 'התקדמות', href: '/progress', icon: TrendingUp },
  { name: 'פרופיל', href: '/profile', icon: User },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-dark-surface border-b border-dark-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gradient">GymIQ</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-text-muted"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-dark-bg pt-16">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-gradient-primary text-white shadow-neon'
                      : 'text-text-secondary hover:bg-dark-surface'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
            {/* Admin Link */}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-yellow-500 text-black shadow-lg'
                      : 'text-yellow-400 hover:bg-yellow-400/10 border border-yellow-400/30'
                  }`
                }
              >
                <Shield className="w-5 h-5" />
                <span>ממשק ניהול</span>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>התנתקות</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed right-0 top-0 bottom-0 w-64 bg-dark-surface border-l border-dark-border flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-neon">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">GymIQ</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
          {/* Admin Link */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-yellow-500 text-black font-semibold shadow-lg'
                    : 'text-yellow-400 hover:bg-yellow-400/10 border border-yellow-400/30'
                }`
              }
            >
              <Shield className="w-5 h-5" />
              <span>ממשק ניהול</span>
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-dark-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.displayName || 'משתמש'}
              </p>
              <p className="text-xs text-text-muted">מתאמן</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:mr-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-surface border-t border-dark-border safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {navigation.slice(0, 4).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-primary-400' : 'text-text-muted'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
