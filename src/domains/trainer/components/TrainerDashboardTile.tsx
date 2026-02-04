import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'

export function TrainerDashboardTile() {
  return (
    <Link
      to="/trainer"
      className="card flex items-center gap-4 py-4 px-5 hover:bg-dark-card/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-xl bg-status-info/20 flex items-center justify-center flex-shrink-0">
        <Users className="w-6 h-6 text-status-info" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-text-primary">ממשק מאמן</p>
        <p className="text-xs text-text-muted">נהל מתאמנים, תוכניות והודעות</p>
      </div>
      <div className="text-text-muted">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
    </Link>
  )
}
