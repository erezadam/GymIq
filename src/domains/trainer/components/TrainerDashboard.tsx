import { useState, useMemo, useEffect } from 'react'
import { UserPlus, Users, RefreshCw, Dumbbell, TrendingUp, MessageSquare } from 'lucide-react'
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
          <div className="bg-dark-card border border-white/5 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black text-accent-orange">{stats.activeCount}</span>
              <div className="w-10 h-10 rounded-xl bg-accent-orange/15 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent-orange" />
              </div>
            </div>
            <p className="text-text-secondary text-xs">מתאמנים פעילים</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black text-primary-main">{stats.weeklyWorkouts}</span>
              <div className="w-10 h-10 rounded-xl bg-primary-main/15 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-main" />
              </div>
            </div>
            <p className="text-text-secondary text-xs">אימונים השבוע</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black text-accent-purple">{stats.avgCompletion}%</span>
              <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-purple" />
              </div>
            </div>
            <p className="text-text-secondary text-xs">אחוז ביצוע</p>
          </div>
          <div className="bg-dark-card border border-white/5 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-black text-status-info">{totalMessages}</span>
              <div className="w-10 h-10 rounded-xl bg-status-info/15 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-status-info" />
              </div>
            </div>
            <p className="text-text-secondary text-xs">הודעות שנשלחו</p>
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
