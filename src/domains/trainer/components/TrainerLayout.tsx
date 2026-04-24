import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Users,
  ArrowRight,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { MobilePreviewFrame } from '@/shared/components/MobilePreviewFrame'
import { MobilePreviewToggle } from '@/shared/components/MobilePreviewToggle'
import { WhatsNewBadge } from '@/domains/whatsnew/components/WhatsNewBadge'
import { WhatsNewModal } from '@/domains/whatsnew/components/WhatsNewModal'

const bottomNav = [
  { name: 'דאשבורד', href: '/trainer', icon: LayoutDashboard, end: true },
  { name: 'מתאמנים', href: '/trainer', icon: Users, end: true },
  { name: 'הודעות', href: '/trainer/messages', icon: MessageSquare },
  { name: 'הגדרות', href: '#', icon: Settings, disabled: true },
]

export default function TrainerLayout() {
  const navigate = useNavigate()
  const user = useEffectiveUser()

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Right side (RTL): Title */}
          <h1 className="text-lg font-bold text-primary-main tracking-tight">ממשק מאמן</h1>

          {/* Left side (RTL): Avatar + Back to dashboard + Mobile preview */}
          <div className="flex items-center gap-3">
            <MobilePreviewToggle />
            <WhatsNewBadge />
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-on-surface-variant hover:text-primary-main transition-colors rounded-xl"
              aria-label="חזרה לדאשבורד"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.charAt(0) || 'מ'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <WhatsNewModal />

      {/* Main Content */}
      <MobilePreviewFrame>
        <main className="px-5 py-6 pb-28 overflow-y-auto overflow-x-hidden flex-1">
          <Outlet />
        </main>
      </MobilePreviewFrame>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container/90 backdrop-blur-2xl rounded-t-3xl border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center pt-3 pb-8 px-4">
          {bottomNav.map((item) =>
            item.disabled ? (
              <div
                key={item.name}
                className="flex flex-col items-center justify-center text-on-surface-variant opacity-40 px-3 py-1"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest mt-1">{item.name}</span>
              </div>
            ) : (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-main/15 text-primary-main shadow-[0_0_12px_rgba(0,212,170,0.15)]'
                      : 'text-on-surface-variant opacity-60 hover:text-primary-main hover:opacity-100'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest mt-1">{item.name}</span>
              </NavLink>
            )
          )}
        </div>
      </nav>
    </div>
  )
}
