import { useState, useEffect } from 'react'
import { X, Users, User, Loader2, Check } from 'lucide-react'
import { trainerService } from '../services/trainerService'
import type { TrainerRelationship } from '../types'

export interface AssignmentChoice {
  assignToSelf: boolean
  trainee?: { id: string; name: string }
}

interface TraineeAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (choice: AssignmentChoice) => void
  trainerId: string
}

export function TraineeAssignmentModal({
  isOpen,
  onClose,
  onConfirm,
  trainerId,
}: TraineeAssignmentModalProps) {
  const [trainees, setTrainees] = useState<TrainerRelationship[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [assignToSelf, setAssignToSelf] = useState(true)
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null)

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

  // Reset state when modal closes/reopens
  useEffect(() => {
    if (!isOpen) {
      setAssignToSelf(true)
      setSelectedTraineeId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const selectedTrainee = trainees.find((t) => t.traineeId === selectedTraineeId)
  const canConfirm = assignToSelf || !!selectedTrainee

  const handleConfirm = () => {
    onConfirm({
      assignToSelf,
      trainee: selectedTrainee
        ? { id: selectedTrainee.traineeId, name: selectedTrainee.traineeName }
        : undefined,
    })
  }

  const toggleTrainee = (traineeId: string) => {
    setSelectedTraineeId((curr) => (curr === traineeId ? null : traineeId))
  }

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
            למי לשמור את האימון?
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Self checkbox */}
        <label
          className={`w-full mb-4 py-3 px-4 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
            assignToSelf
              ? 'bg-primary-main/15 border-primary-main/40'
              : 'bg-white/5 border-white/10 hover:border-primary-main/30'
          }`}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
              assignToSelf
                ? 'bg-primary-main border-primary-main'
                : 'border-white/30'
            }`}
          >
            {assignToSelf && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </div>
          <User className="w-5 h-5 text-primary-main" />
          <span className="text-on-surface font-medium flex-1">לעצמי</span>
          <input
            type="checkbox"
            checked={assignToSelf}
            onChange={(e) => setAssignToSelf(e.target.checked)}
            className="sr-only"
          />
        </label>

        {/* Trainee section */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-on-surface-variant">למתאמן:</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
          </div>
        ) : trainees.length === 0 ? (
          <p className="text-center text-on-surface-variant py-6 text-sm">
            אין מתאמנים פעילים
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto flex-1 min-h-[200px]">
            {trainees.map((rel) => {
              const checked = selectedTraineeId === rel.traineeId
              return (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => toggleTrainee(rel.traineeId)}
                  className={`w-full py-3 px-4 rounded-xl border flex items-center gap-3 transition text-right ${
                    checked
                      ? 'bg-accent-purple/15 border-accent-purple/40'
                      : 'bg-white/5 border-white/10 hover:border-accent-purple/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                      checked
                        ? 'bg-accent-purple border-accent-purple'
                        : 'border-white/30'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent-purple font-bold text-sm">
                      {rel.traineeName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="text-on-surface font-medium">{rel.traineeName}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Confirm button */}
        <div className="pt-4 mt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full py-3 rounded-xl font-medium transition ${
              canConfirm
                ? 'bg-primary-main text-white hover:bg-primary-main/90'
                : 'bg-white/5 text-on-surface-variant cursor-not-allowed'
            }`}
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  )
}
