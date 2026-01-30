/**
 * WorkoutSummaryModal
 * Modal showing workout summary with calories input before saving
 */

import { useState } from 'react'
import { X, Trophy, Flame, Dumbbell, Clock } from 'lucide-react'

interface WorkoutSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (calories?: number) => void
  isSaving?: boolean
  stats: {
    completedExercises: number
    totalExercises: number
    completedSets: number
    totalSets: number
    formattedTime: string
  }
}

export function WorkoutSummaryModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  stats,
}: WorkoutSummaryModalProps) {
  const [calories, setCalories] = useState<string>('')

  if (!isOpen) return null

  const handleSave = () => {
    const caloriesNum = calories ? parseInt(calories, 10) : undefined
    onSave(caloriesNum)
  }

  return (
    <div
      className="confirmation-modal-backdrop"
      onClick={undefined}
      style={{ zIndex: 100 }}
    >
      <div
        className="confirmation-modal"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          maxWidth: '340px',
          padding: '24px',
        }}
      >
        {/* Close button */}
        {!isSaving && (
          <button
            className="confirmation-modal-close"
            onClick={onClose}
            style={{ top: '12px', left: '12px' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Trophy Icon */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #FF6B35 0%, #E85A2A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255, 107, 53, 0.4)',
            }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '8px',
          }}
        >
          כל הכבוד!
        </h3>

        <p
          style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#9CA3AF',
            marginBottom: '20px',
          }}
        >
          סיימת את האימון בהצלחה
        </p>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          {/* Exercises */}
          <div
            style={{
              background: 'rgba(45, 212, 191, 0.1)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <Dumbbell
              className="w-5 h-5"
              style={{ color: '#2DD4BF', margin: '0 auto 8px' }}
            />
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
              {stats.completedExercises}/{stats.totalExercises}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>תרגילים</div>
          </div>

          {/* Sets */}
          <div
            style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: '#8B5CF6',
                margin: '0 auto 8px',
                fontWeight: 700,
              }}
            >
              #
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
              {stats.completedSets}/{stats.totalSets}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>סטים</div>
          </div>

          {/* Time */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <Clock
              className="w-5 h-5"
              style={{ color: '#3B82F6', margin: '0 auto 8px' }}
            />
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
              {stats.formattedTime}
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>זמן</div>
          </div>
        </div>

        {/* Calories Input */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#FFFFFF',
              marginBottom: '8px',
            }}
          >
            <Flame className="w-4 h-4" style={{ color: '#FF6B35' }} />
            <span>קלוריות שנשרפו (אופציונלי)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="הזן מספר קלוריות"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: '#1E2430',
              border: '1px solid #2A3142',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '16px',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              background: 'transparent',
              border: '1px solid #4B5563',
              borderRadius: '12px',
              color: '#9CA3AF',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            חזור לאימון
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              background: isSaving
                ? 'linear-gradient(180deg, #9CA3AF 0%, #6B7280 100%)'
                : 'linear-gradient(180deg, #FF6B35 0%, #E85A2A 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: isSaving ? 'none' : '0 4px 12px rgba(255, 107, 53, 0.3)',
            }}
          >
            {isSaving ? 'שומר...' : 'שמור וסיים'}
          </button>
        </div>
      </div>
    </div>
  )
}
