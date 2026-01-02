import { Link } from 'react-router-dom'
import { Dumbbell, Calendar, Flame, ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'

// User stats - will be fetched from Firebase later
const userStats = {
  totalWorkouts: 47,
  thisWeek: 4,
  currentStreak: 12,
}

export default function UserDashboard() {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] lg:min-h-[calc(100vh-3rem)]">
      {/* Welcome Section */}
      <div className="text-center pt-4 pb-8">
        <h1 className="text-2xl font-bold text-text-primary">
          שלום, {user?.firstName || 'מתאמן'}!
        </h1>
        <p className="text-text-muted mt-1">מוכן לאימון מעולה?</p>
      </div>

      {/* Stats - 3 cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card-stat">
          <div className="stat-icon-primary">
            <Dumbbell className="w-5 h-5 text-primary-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{userStats.totalWorkouts}</p>
          <p className="text-text-muted text-xs">אימונים</p>
        </div>

        <div className="card-stat">
          <div className="stat-icon-accent">
            <Calendar className="w-5 h-5 text-accent-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{userStats.thisWeek}</p>
          <p className="text-text-muted text-xs">השבוע</p>
        </div>

        <div className="card-stat">
          <div className="stat-icon-warning">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary">{userStats.currentStreak}</p>
          <p className="text-text-muted text-xs">ימי רצף</p>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Primary CTA - Build Workout */}
        <Link to="/exercises" className="card-hero block">
          <div className="action-icon-lg">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">בנה אימון חופשי</h2>
          <p className="text-white/70 text-sm">בחר תרגילים והתחל להתאמן</p>
        </Link>

        {/* Secondary CTA - Training Programs */}
        <Link to="/programs" className="card-action block">
          <div className="action-icon-md bg-accent-400/20">
            <ClipboardList className="w-7 h-7 text-accent-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">תוכניות אימונים</h2>
          <p className="text-text-muted text-sm">תוכניות מוכנות להתחלה מהירה</p>
        </Link>
      </div>
    </div>
  )
}
