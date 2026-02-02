import { useState } from 'react'
import { UserPlus, Users, RefreshCw } from 'lucide-react'
import { useTrainerData } from '../hooks/useTrainerData'
import { TraineeCard } from './TraineeCard'
import { TraineeRegistrationModal } from './TraineeRegistrationModal'

export default function TrainerDashboard() {
  const { trainees, isLoading, error, refreshTrainees } = useTrainerData()
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">המתאמנים שלי</h1>
          <p className="text-text-muted text-sm mt-1">
            {trainees.length} מתאמנים פעילים
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshTrainees}
            className="btn-ghost p-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRegistrationModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>מתאמן חדש</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-status-error/10 border-status-error/30 text-status-error p-4 text-sm">
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
            className="btn-primary px-6 py-3 text-sm"
          >
            + מתאמן חדש
          </button>
        </div>
      )}

      {/* Trainee list */}
      {trainees.length > 0 && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {trainees.map((trainee) => (
            <TraineeCard
              key={trainee.relationship.id}
              trainee={trainee}
            />
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
