import { useState, useEffect } from 'react'
import { X, Users, User, Loader2 } from 'lucide-react'
import { trainerService } from '../services/trainerService'
import type { TrainerRelationship } from '../types'

interface TraineeAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (traineeId: string, traineeName: string) => void
  onSkip: () => void
  trainerId: string
}

export function TraineeAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  onSkip,
  trainerId,
}: TraineeAssignmentModalProps) {
  const [trainees, setTrainees] = useState<TrainerRelationship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !trainerId) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        const result = await trainerService.getTrainerTrainees(trainerId)
        if (!cancelled) setTrainees(result)
      } catch (err) {
        console.error('Failed to load trainees:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()

    return () => { cancelled = true }
  }, [isOpen, trainerId])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container rounded-2xl p-5 pb-6 animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-purple" />
            שייך אימון למתאמן
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Skip — my own workout */}
        <button
          onClick={onSkip}
          className="w-full mb-3 py-3 px-4 rounded-xl bg-primary-main/15 border border-primary-main/30 flex items-center gap-3 hover:bg-primary-main/25 transition"
        >
          <User className="w-5 h-5 text-primary-main" />
          <span className="text-primary-main font-medium">אימון לעצמי בלבד</span>
        </button>

        {/* Trainee list */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
          </div>
        ) : trainees.length === 0 ? (
          <p className="text-center text-on-surface-variant py-6 text-sm">
            אין מתאמנים פעילים
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 min-h-[280px]">
            {trainees.map((rel) => (
              <button
                key={rel.id}
                onClick={() => onAssign(rel.traineeId, rel.traineeName)}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-accent-purple/15 hover:border-accent-purple/30 transition text-right"
              >
                <div className="w-9 h-9 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-purple font-bold text-sm">
                    {rel.traineeName?.charAt(0) || '?'}
                  </span>
                </div>
                <span className="text-on-surface font-medium">{rel.traineeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
