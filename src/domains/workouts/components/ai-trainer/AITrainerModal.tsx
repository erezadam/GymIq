/**
 * AITrainerModal
 * Modal for configuring AI-generated workout plans
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { getMuscles } from '@/lib/firebase/muscles'
import { MuscleIcon } from '@/shared/components/MuscleIcon'
import { useAuthStore } from '@/domains/authentication/store'
import { generateAIWorkouts } from '@/domains/workouts/services/aiTrainerService'
import type { AITrainerRequest, MuscleSelectionMode } from '@/domains/workouts/services/aiTrainer.types'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'

interface AITrainerModalProps {
  isOpen: boolean
  onClose: () => void
}

// Duration options
const DURATION_OPTIONS = [
  { value: 30, label: '30' },
  { value: 45, label: '45' },
  { value: 60, label: '60' },
  { value: 90, label: '90' },
]

// Warmup options
const WARMUP_OPTIONS = [
  { value: 0, label: 'ללא' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
]

// Calculate exercise count based on duration (NOT including warmup)
const getExerciseCount = (duration: number): number => {
  if (duration <= 30) return 6   // 30 min = 6 + warmup = 7
  if (duration <= 45) return 8   // 45 min = 8 + warmup = 9
  if (duration <= 60) return 9   // 60 min = 9 + warmup = 10
  return 11                      // 90 min = 11 + warmup = 12
}

export default function AITrainerModal({ isOpen, onClose }: AITrainerModalProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Form state
  const [numWorkouts, setNumWorkouts] = useState(1)
  const [duration, setDuration] = useState(60)
  const [warmupDuration, setWarmupDuration] = useState(5)
  const [muscleTargets, setMuscleTargets] = useState<string[]>([])

  // Muscle selection mode (for multiple workouts)
  const [muscleSelectionMode, setMuscleSelectionMode] = useState<MuscleSelectionMode>('ai_rotate')
  const [perWorkoutMuscles, setPerWorkoutMuscles] = useState<string[][]>([])
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null)

  // UI state
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>([])
  const [isLoadingMuscles, setIsLoadingMuscles] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load muscles from Firebase
  useEffect(() => {
    if (isOpen) {
      loadMuscles()
    }
  }, [isOpen])

  // Reset per-workout muscles when numWorkouts changes
  useEffect(() => {
    setPerWorkoutMuscles(Array(numWorkouts).fill([]).map(() => []))
    setExpandedWorkout(null)
  }, [numWorkouts])

  const loadMuscles = async () => {
    try {
      setIsLoadingMuscles(true)
      const musclesData = await getMuscles()
      setMuscles(musclesData)
    } catch (err) {
      console.error('Failed to load muscles:', err)
      setError('שגיאה בטעינת שרירים')
    } finally {
      setIsLoadingMuscles(false)
    }
  }

  // Toggle muscle selection (for single workout or "same" mode)
  const toggleMuscle = (muscleId: string) => {
    setMuscleTargets(prev =>
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    )
  }

  // Toggle muscle for specific workout (manual mode)
  const toggleWorkoutMuscle = (workoutIndex: number, muscleId: string) => {
    setPerWorkoutMuscles(prev => {
      const updated = [...prev]
      const current = updated[workoutIndex] || []
      updated[workoutIndex] = current.includes(muscleId)
        ? current.filter(id => id !== muscleId)
        : [...current, muscleId]
      return updated
    })
  }

  // Generate workout
  const handleGenerate = async () => {
    if (!user?.uid) {
      setError('יש להתחבר כדי ליצור אימון')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)

      const request: AITrainerRequest = {
        numWorkouts,
        duration,
        muscleTargets: numWorkouts === 1 ? muscleTargets : [],
        warmupDuration,
        userId: user.uid,
        muscleSelectionMode: numWorkouts > 1 ? muscleSelectionMode : 'same',
        perWorkoutMuscles: muscleSelectionMode === 'manual' ? perWorkoutMuscles : undefined,
      }

      console.log('🤖 Generating workout with:', request)

      const result = await generateAIWorkouts(request)

      if (!result.success) {
        setError(result.error || 'שגיאה ביצירת האימון')
        return
      }

      console.log(`✅ Created ${result.workouts.length} workouts`)

      onClose()
      navigate('/workout/history')

    } catch (err: any) {
      console.error('Failed to generate workout:', err)
      setError(err.message || 'שגיאה ביצירת האימון. נסה שוב.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const exerciseCount = getExerciseCount(duration)
  const totalExercises = warmupDuration > 0 ? exerciseCount + 1 : exerciseCount
  const showMuscleSelectionMode = numWorkouts > 1

  return (
    <div
      className="confirmation-modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 100 }}
    >
      <div
        className="confirmation-modal"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          maxWidth: '400px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '20px',
        }}
      >
        {/* Close button */}
        <button
          className="confirmation-modal-close"
          onClick={onClose}
          style={{ top: '12px', left: '12px' }}
          disabled={isGenerating}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '28px',
            }}
          >
            🤖
          </div>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '4px',
            }}
          >
            מאמן AI
          </h3>
          <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
            תן ל-AI לבנות לך אימון מותאם אישית
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '16px',
              color: '#EF4444',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Number of workouts */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '10px',
            }}
          >
            כמה אימונים לייצר?
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="1"
              max="6"
              value={numWorkouts}
              onChange={(e) => setNumWorkouts(parseInt(e.target.value))}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                appearance: 'none',
                background: 'linear-gradient(to left, #EC4899 0%, #8B5CF6 100%)',
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                minWidth: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.15)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#EC4899',
              }}
            >
              {numWorkouts}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '10px',
            }}
          >
            משך אימון (דקות)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  borderRadius: '10px',
                  border: duration === opt.value
                    ? '1px solid rgba(45, 212, 191, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: duration === opt.value
                    ? 'rgba(45, 212, 191, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: duration === opt.value ? '#2DD4BF' : '#9CA3AF',
                  fontSize: '15px',
                  fontWeight: duration === opt.value ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', textAlign: 'center' }}>
            {exerciseCount} תרגילים{warmupDuration > 0 ? ` + חימום = ${totalExercises} סה"כ` : ''}
          </p>
        </div>

        {/* Warmup */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '10px',
            }}
          >
            חימום (דקות)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {WARMUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWarmupDuration(opt.value)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: warmupDuration === opt.value
                    ? '1px solid rgba(255, 107, 53, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: warmupDuration === opt.value
                    ? 'rgba(255, 107, 53, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: warmupDuration === opt.value ? '#FF6B35' : '#9CA3AF',
                  fontSize: '14px',
                  fontWeight: warmupDuration === opt.value ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle Selection Mode (only for multiple workouts) */}
        {showMuscleSelectionMode && (
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              בחירת שרירים לאימונים
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* AI Rotate option */}
              <button
                onClick={() => setMuscleSelectionMode('ai_rotate')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: muscleSelectionMode === 'ai_rotate'
                    ? '1px solid rgba(45, 212, 191, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: muscleSelectionMode === 'ai_rotate'
                    ? 'rgba(45, 212, 191, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: muscleSelectionMode === 'ai_rotate' ? '#2DD4BF' : '#9CA3AF',
                  fontSize: '13px',
                  fontWeight: muscleSelectionMode === 'ai_rotate' ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>🔄</span>
                <span>AI יבחר שרירים שונים לכל אימון (מומלץ)</span>
              </button>

              {/* Same muscles option */}
              <button
                onClick={() => setMuscleSelectionMode('same')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: muscleSelectionMode === 'same'
                    ? '1px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: muscleSelectionMode === 'same'
                    ? 'rgba(139, 92, 246, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: muscleSelectionMode === 'same' ? '#A78BFA' : '#9CA3AF',
                  fontSize: '13px',
                  fontWeight: muscleSelectionMode === 'same' ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>📋</span>
                <span>אותם שרירים לכל האימונים</span>
              </button>

              {/* Manual selection option */}
              <button
                onClick={() => setMuscleSelectionMode('manual')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: muscleSelectionMode === 'manual'
                    ? '1px solid rgba(236, 72, 153, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: muscleSelectionMode === 'manual'
                    ? 'rgba(236, 72, 153, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: muscleSelectionMode === 'manual' ? '#EC4899' : '#9CA3AF',
                  fontSize: '13px',
                  fontWeight: muscleSelectionMode === 'manual' ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>✋</span>
                <span>אבחר בעצמי לכל אימון</span>
              </button>
            </div>
          </div>
        )}

        {/* Muscle targets - for single workout or "same" mode */}
        {(numWorkouts === 1 || muscleSelectionMode === 'same') && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              קבוצות שרירים {numWorkouts === 1 ? '(אופציונלי)' : ''}
            </label>

            {isLoadingMuscles ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ margin: '0 auto' }} />
                <p style={{ fontSize: '13px', marginTop: '8px' }}>טוען שרירים...</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}
              >
                {muscles.map((muscle) => {
                  const isSelected = muscleTargets.includes(muscle.id)
                  return (
                    <button
                      key={muscle.id}
                      onClick={() => toggleMuscle(muscle.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '1px solid rgba(139, 92, 246, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected
                          ? 'rgba(139, 92, 246, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? '#A78BFA' : '#9CA3AF',
                        fontSize: '12px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MuscleIcon icon={muscle.icon} size={20} />
                      <span>{muscle.nameHe}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {muscleTargets.length === 0 && !isLoadingMuscles && numWorkouts === 1 && (
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', textAlign: 'center' }}>
                אם לא תבחר - ה-AI יבחר בשבילך
              </p>
            )}
          </div>
        )}

        {/* Per-workout muscle selection (manual mode) */}
        {muscleSelectionMode === 'manual' && numWorkouts > 1 && (
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: '10px',
              }}
            >
              בחירת שרירים לכל אימון
            </label>

            {isLoadingMuscles ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ margin: '0 auto' }} />
                <p style={{ fontSize: '13px', marginTop: '8px' }}>טוען שרירים...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Array.from({ length: numWorkouts }).map((_, workoutIndex) => {
                  const isExpanded = expandedWorkout === workoutIndex
                  const selectedMuscles = perWorkoutMuscles[workoutIndex] || []
                  const selectedNames = selectedMuscles
                    .map(id => muscles.find(m => m.id === id)?.nameHe)
                    .filter(Boolean)
                    .join(', ')

                  return (
                    <div
                      key={workoutIndex}
                      style={{
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Workout header */}
                      <button
                        onClick={() => setExpandedWorkout(isExpanded ? null : workoutIndex)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#EC4899', fontWeight: 600, fontSize: '14px' }}>
                            אימון {workoutIndex + 1}
                          </span>
                          {selectedNames && (
                            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '2px' }}>
                              {selectedNames}
                            </p>
                          )}
                          {!selectedNames && (
                            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '2px' }}>
                              לחץ לבחירת שרירים
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                        ) : (
                          <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                        )}
                      </button>

                      {/* Expanded muscle selection */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {muscles.map((muscle) => {
                            const isSelected = selectedMuscles.includes(muscle.id)
                            return (
                              <button
                                key={muscle.id}
                                onClick={() => toggleWorkoutMuscle(workoutIndex, muscle.id)}
                                style={{
                                  padding: '8px 6px',
                                  borderRadius: '8px',
                                  border: isSelected
                                    ? '1px solid rgba(236, 72, 153, 0.5)'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                  background: isSelected
                                    ? 'rgba(236, 72, 153, 0.15)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                  color: isSelected ? '#EC4899' : '#9CA3AF',
                                  fontSize: '11px',
                                  fontWeight: isSelected ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <MuscleIcon icon={muscle.icon} size={18} />
                                <span>{muscle.nameHe}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isLoadingMuscles}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '12px',
            border: 'none',
            background: isGenerating
              ? 'rgba(236, 72, 153, 0.3)'
              : 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: 700,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            boxShadow: isGenerating ? 'none' : '0 4px 20px rgba(236, 72, 153, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>יוצר אימון...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>צור {numWorkouts === 1 ? 'אימון' : `${numWorkouts} אימונים`}</span>
            </>
          )}
        </button>

        {/* Cancel button */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'transparent',
            color: '#9CA3AF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.5 : 1,
          }}
        >
          ביטול
        </button>
      </div>
    </div>
  )
}
