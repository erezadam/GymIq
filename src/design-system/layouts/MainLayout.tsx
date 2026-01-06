import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
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
import {
  colors,
  spacing,
  borderRadius,
  typography,
  components,
} from '@/styles/theme'

const navigation = [
  { name: 'דשבורד', href: '/dashboard', icon: Home },
  { name: 'ספריה', href: '/exercises', icon: Library },
  { name: 'היסטוריה', href: '/workout/history', icon: History },
  { name: 'התקדמות', href: '/progress', icon: TrendingUp },
  { name: 'פרופיל', href: '/profile', icon: User },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === 'admin'

  // Hide header on workout session screen
  const hideMobileHeader = location.pathname === '/workout/session'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{
      height: '100dvh',
      background: colors.background.main,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Mobile header (hidden on workout session) */}
      {!hideMobileHeader && (
        <header
          className="lg:hidden fixed top-0 left-0 right-0 z-40"
          style={{
            background: colors.background.card,
            borderBottom: `1px solid ${colors.border.default}`,
          }}
        >
          <div
            style={{
              ...components.layout.header.container,
              height: 64,
              padding: `0 ${spacing.lg}px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <div
                style={{
                  ...components.layout.header.logoIcon,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dumbbell size={20} color={colors.text.primary} />
              </div>
              <span
                style={{
                  ...components.layout.header.logo,
                  color: colors.primary.main,
                }}
              >
                GymIQ
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                ...components.layout.header.menuButton,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {mobileMenuOpen ? (
                <X size={24} color={colors.text.secondary} />
              ) : (
                <Menu size={24} color={colors.text.secondary} />
              )}
            </button>
          </div>
        </header>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          style={{
            background: colors.background.main,
            paddingTop: 64,
          }}
        >
          <nav style={{ padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  borderRadius: borderRadius.lg,
                  textDecoration: 'none',
                  transition: '0.2s ease',
                  background: isActive
                    ? `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`
                    : 'transparent',
                  color: isActive ? colors.text.primary : colors.text.secondary,
                  boxShadow: isActive ? '0 4px 16px rgba(45, 212, 191, 0.3)' : 'none',
                })}
              >
                <item.icon size={20} />
                <span style={{ fontWeight: typography.fontWeight.medium }}>{item.name}</span>
              </NavLink>
            ))}
            {/* Admin Link */}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  borderRadius: borderRadius.lg,
                  textDecoration: 'none',
                  background: isActive ? colors.accent.gold : 'transparent',
                  color: isActive ? colors.text.inverse : colors.accent.gold,
                  border: isActive ? 'none' : `1px solid rgba(196, 160, 82, 0.3)`,
                })}
              >
                <Shield size={20} />
                <span>ממשק ניהול</span>
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderRadius: borderRadius.lg,
                background: 'transparent',
                border: 'none',
                color: colors.status.error,
                cursor: 'pointer',
              }}
            >
              <LogOut size={20} />
              <span>התנתקות</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed right-0 top-0 bottom-0 flex-col"
        style={{
          width: 256,
          background: colors.background.card,
          borderLeft: `1px solid ${colors.border.default}`,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${spacing['2xl']}px`,
            borderBottom: `1px solid ${colors.border.default}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                ...components.layout.header.logoIcon,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Dumbbell size={24} color={colors.text.primary} />
            </div>
            <span
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.primary.main,
              }}
            >
              GymIQ
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderRadius: borderRadius.lg,
                textDecoration: 'none',
                transition: '0.2s ease',
                background: isActive
                  ? `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`
                  : 'transparent',
                color: isActive ? colors.text.primary : colors.text.secondary,
                boxShadow: isActive ? '0 4px 16px rgba(45, 212, 191, 0.3)' : 'none',
              })}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: typography.fontWeight.medium }}>{item.name}</span>
            </NavLink>
          ))}
          {/* Admin Link */}
          {isAdmin && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderRadius: borderRadius.lg,
                textDecoration: 'none',
                transition: '0.2s ease',
                background: isActive ? colors.accent.gold : 'transparent',
                color: isActive ? colors.text.inverse : colors.accent.gold,
                border: isActive ? 'none' : `1px solid rgba(196, 160, 82, 0.3)`,
                fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
              })}
            >
              <Shield size={20} />
              <span>ממשק ניהול</span>
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div
          style={{
            padding: spacing.lg,
            borderTop: `1px solid ${colors.border.default}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
              padding: `${spacing.md}px ${spacing.lg}px`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: colors.text.primary, fontWeight: typography.fontWeight.medium }}>
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  margin: 0,
                }}
              >
                {user?.firstName || user?.displayName || 'משתמש'}
              </p>
              <p
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                  margin: 0,
                }}
              >
                מתאמן
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: spacing.sm,
                background: 'transparent',
                border: 'none',
                color: colors.text.muted,
                cursor: 'pointer',
                borderRadius: borderRadius.sm,
                transition: '0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.status.error)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.text.muted)}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - Mobile-first layout */}
      <main
        className="lg:mr-64"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: hideMobileHeader ? 0 : 64,
          overflow: 'hidden',
        }}
      >
        {/* Scrollable content area */}
        <div
          className="lg:p-6 lg:pb-6"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: `${spacing.lg}px`,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Outlet />
        </div>
      </main>

    </div>
  )
}
