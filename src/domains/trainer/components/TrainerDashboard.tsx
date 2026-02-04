import { useState, useMemo, useEffect } from 'react'
import { UserPlus, Users, RefreshCw } from 'lucide-react'
import { useTrainerData } from '../hooks/useTrainerData'
import { useAuthStore } from '@/domains/authentication/store'
import { messageService } from '../services/messageService'
import { TraineeCard } from './TraineeCard'
import { TraineeRegistrationModal } from './TraineeRegistrationModal'

export default function TrainerDashboard() {
  const { trainees, isLoading, error, refreshTrainees } = useTrainerData()
  const { user } = useAuthStore()
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [totalMessages, setTotalMessages] = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    messageService.getTrainerMessages(user.uid, 100)
      .then((msgs) => setTotalMessages(msgs.length))
      .catch(console.error)
  }, [user?.uid])

  const stats = useMemo(() => {
    const activeCount = trainees.length
    const weeklyWorkouts = trainees.reduce((sum, t) => sum + t.thisWeekWorkouts, 0)
    const avgCompletion =
      trainees.length > 0
        ? Math.round(
            trainees.reduce((sum, t) => sum + t.programCompletionRate, 0) / trainees.length
          )
        : 0
    return { activeCount, weeklyWorkouts, avgCompletion }
  }, [trainees])

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {trainees.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4 shadow-glow-cyan">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">👥</span>
              <span className="text-2xl font-black text-primary-main">{stats.activeCount}</span>
            </div>
            <p className="text-text-muted text-sm">מתאמנים פעילים</p>
          </div>
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🏋️</span>
              <span className="text-2xl font-black text-status-info">{stats.weeklyWorkouts}</span>
            </div>
            <p className="text-text-muted text-sm">אימונים השבוע</p>
          </div>
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🔥</span>
              <span className="text-2xl font-black text-accent-orange">{stats.avgCompletion}%</span>
            </div>
            <p className="text-text-muted text-sm">אחוז ביצוע</p>
          </div>
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💬</span>
              <span className="text-2xl font-black text-accent-purple">{totalMessages}</span>
            </div>
            <p className="text-text-muted text-sm">הודעות שנשלחו</p>
          </div>
        </div>
      )}

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-primary rounded-full" />
          המתאמנים שלי
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={refreshTrainees} className="btn-icon" disabled={isLoading}>
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRegistrationModal(true)}
            className="bg-gradient-to-br from-primary-main to-status-info px-4 py-2 rounded-xl font-medium text-white flex items-center gap-2 hover:opacity-90 transition text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>מתאמן חדש</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && trainees.length === 0 && (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && trainees.length === 0 && !error && (
        <div className="empty-state">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-muted" />
          <p className="empty-state-title">אין מתאמנים עדיין</p>
          <p className="empty-state-text">הוסף מתאמן חדש כדי להתחיל</p>
          <button
            onClick={() => setShowRegistrationModal(true)}
            className="bg-gradient-to-br from-primary-main to-status-info px-6 py-3 rounded-xl font-medium text-white text-sm"
          >
            + מתאמן חדש
          </button>
        </div>
      )}

      {/* Trainee grid */}
      {trainees.length > 0 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {trainees.map((trainee) => (
            <TraineeCard key={trainee.relationship.id} trainee={trainee} />
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && (
        <TraineeRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={() => {
            setShowRegistrationModal(false)
            refreshTrainees()
          }}
        />
      )}
    </div>
  )
}
