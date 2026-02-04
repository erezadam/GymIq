import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Users,
  LogOut,
  Menu,
  X,
  ArrowRight,
  ClipboardList,
  MessageSquare,
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/domains/authentication/store'

const navigation = [
  { name: 'מתאמנים', href: '/trainer', icon: Users, end: true },
  { name: 'תוכניות', href: '/trainer/program/new', icon: ClipboardList },
  { name: 'הודעות', href: '/trainer/messages', icon: MessageSquare },
]

export default function TrainerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 right-0 z-50
          w-64 bg-dark-surface border-l border-dark-border
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-info/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-status-info" />
            </div>
            <span className="text-xl font-bold text-status-info">מאמן</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-4 border-t border-dark-border">
          <NavLink
            to="/dashboard"
            className="sidebar-link text-text-muted hover:text-primary-main"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזרה לאפליקציה</span>
          </NavLink>
        </div>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.firstName?.charAt(0) || 'מ'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.firstName || user?.displayName || 'מאמן'}
              </p>
              <p className="text-xs text-text-muted">מאמן</p>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="h-16 bg-dark-surface border-b border-dark-border flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -mr-2 text-text-muted hover:text-text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary mr-4">ממשק מאמן</h1>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
