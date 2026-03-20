/**
 * AITrainerModal
 * Modal for configuring AI-generated workout plans
 * New logic: bodyRegion-based splits, 10 sets/muscle/week
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, Sparkles } from 'lucide-react'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { generateAIWorkouts } from '@/domains/workouts/services/aiTrainerService'
import type { AITrainerRequest, WorkoutStructure, SplitStartWith, AIGeneratedWorkout } from '@/domains/workouts/services/aiTrainer.types'
import { getExerciseCount } from '@/domains/workouts/services/aiTrainer.types'

interface AITrainerModalProps {
  isOpen: boolean
  onClose: () => void
}

// Duration options (minutes)
const DURATION_OPTIONS = [
  { value: 60, label: '60' },
  { value: 75, label: '75' },
  { value: 90, label: '90' },
]

// Warmup options (minutes)
const WARMUP_OPTIONS = [
  { value: 0, label: 'ללא' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
]

export default function AITrainerModal({ isOpen, onClose }: AITrainerModalProps) {
  const navigate = useNavigate()
  const user = useEffectiveUser()

  // Form state
  const [numWorkouts, setNumWorkouts] = useState(3)
  const [duration, setDuration] = useState(60)
  const [warmupDuration, setWarmupDuration] = useState(5)
  const [workoutStructure, setWorkoutStructure] = useState<WorkoutStructure>('full_body')
  const [splitStartWith, setSplitStartWith] = useState<SplitStartWith>('upper')

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Explanation popup state
  const [showExplanation, setShowExplanation] = useState(false)
  const [generatedWorkouts, setGeneratedWorkouts] = useState<AIGeneratedWorkout[]>([])

  // Derived state
  const showSplitStartSelection = workoutStructure === 'split' && (numWorkouts === 3 || numWorkouts === 5)
  const effectiveStructure: WorkoutStructure = numWorkouts <= 2 ? 'full_body' : workoutStructure

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
        warmupDuration,
        userId: user.uid,
        workoutStructure: effectiveStructure,
        ...(effectiveStructure === 'split' && (numWorkouts === 3 || numWorkouts === 5) && {
          splitStartWith,
        }),
      }

      console.log('🤖 Generating workout with:', request)

      const result = await generateAIWorkouts(request)

      if (!result.success) {
        setError(result.error || 'שגיאה ביצירת האימון')
        return
      }

      console.log(`✅ Created ${result.workouts.length} workouts`)

      // Check if we have AI explanations
      const hasExplanations = result.workouts.some(w => w.aiExplanation)

      if (hasExplanations) {
        setGeneratedWorkouts(result.workouts)
        setShowExplanation(true)
      } else {
        onClose()
        navigate('/workout/history')
      }

    } catch (err: any) {
      console.error('Failed to generate workout:', err)
      setError(err.message || 'שגיאה ביצירת האימון. נסה שוב.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Close explanation popup and navigate to history
  const handleCloseExplanation = () => {
    setShowExplanation(false)
    setGeneratedWorkouts([])
    onClose()
    navigate('/workout/history')
  }

  if (!isOpen) return null

  const exerciseCount = getExerciseCount(duration)
  const totalExercises = warmupDuration > 0 ? exerciseCount + 1 : exerciseCount

  // Build split schedule description
  const getSplitDescription = (): string => {
    if (effectiveStructure === 'full_body') return 'כל אימון מכסה את כל הגוף'

    const start = splitStartWith || 'upper'
    const schedule: string[] = []
    for (let i = 0; i < numWorkouts; i++) {
      const isUpper = (i % 2 === 0) === (start === 'upper')
      schedule.push(isUpper ? 'עליון' : 'תחתון')
    }
    return schedule.map((s, i) => `אימון ${i + 1}: ${s}`).join(' | ')
  }

  return (
    <div
      className="confirmation-modal-backdrop"
      onClick={onClose}
      style={{ zIndex: 100 }}
    >
      <div
        className="confirmation-modal max-w-[400px] max-h-[90vh] overflow-auto p-5"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close button */}
        <button
          className="confirmation-modal-close top-3 left-3"
          onClick={onClose}
          disabled={isGenerating}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-pink-500/30 flex items-center justify-center mx-auto mb-3 text-3xl">
            🤖
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            מאמן AI
          </h3>
          <p className="text-sm text-gray-400">
            תן ל-AI לבנות לך תוכנית אימון שבועית
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 mb-4 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Number of workouts */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-white mb-2.5">
            כמה אימונים בשבוע?
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="6"
              value={numWorkouts}
              onChange={(e) => setNumWorkouts(parseInt(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-pink-500"
              style={{
                background: 'linear-gradient(to left, #EC4899 0%, #8B5CF6 100%)',
              }}
            />
            <span className="min-w-[36px] h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-base font-bold text-pink-500">
              {numWorkouts}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-white mb-2.5">
            משך אימון (דקות)
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDuration(opt.value)}
                className={`flex-1 py-3 px-2 rounded-xl border text-base transition-all cursor-pointer ${
                  duration === opt.value
                    ? 'border-teal-400/50 bg-teal-400/15 text-teal-400 font-bold'
                    : 'border-white/10 bg-white/5 text-gray-400 font-medium'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {exerciseCount} תרגילים{warmupDuration > 0 ? ` + חימום = ${totalExercises} סה"כ` : ''}
          </p>
        </div>

        {/* Warmup */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-white mb-2.5">
            חימום (דקות)
          </label>
          <div className="flex gap-2">
            {WARMUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWarmupDuration(opt.value)}
                className={`flex-1 py-2.5 px-2 rounded-xl border text-sm transition-all cursor-pointer ${
                  warmupDuration === opt.value
                    ? 'border-orange-500/50 bg-orange-500/15 text-orange-500 font-bold'
                    : 'border-white/10 bg-white/5 text-gray-400 font-medium'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Workout Structure - only for 3+ workouts */}
        {numWorkouts <= 2 ? (
          <div className="mb-5 bg-teal-400/10 border border-teal-400/20 rounded-xl p-3 text-center">
            <p className="text-sm text-teal-400 font-medium">
              🏋️ Full Body - כל הגוף
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {numWorkouts === 1 ? 'אימון אחד' : '2 אימונים'} = אימון כל הגוף אוטומטית
            </p>
          </div>
        ) : (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-white mb-2.5">
              מבנה אימון
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setWorkoutStructure('full_body')}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm transition-all cursor-pointer ${
                  workoutStructure === 'full_body'
                    ? 'border-teal-400/50 bg-teal-400/15 text-teal-400 font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                🏋️ כל הגוף
              </button>
              <button
                onClick={() => setWorkoutStructure('split')}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm transition-all cursor-pointer ${
                  workoutStructure === 'split'
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-400 font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                🔀 לפי אזורים
              </button>
            </div>

            {/* Split description */}
            {workoutStructure === 'split' && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                עליון / תחתון לסירוגין
              </p>
            )}
          </div>
        )}

        {/* Split start selection - only for 3 or 5 workouts with split */}
        {showSplitStartSelection && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-white mb-2.5">
              עם מה להתחיל?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSplitStartWith('upper')}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm transition-all cursor-pointer ${
                  splitStartWith === 'upper'
                    ? 'border-blue-400/50 bg-blue-400/15 text-blue-400 font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                💪 פלג גוף עליון
              </button>
              <button
                onClick={() => setSplitStartWith('lower')}
                className={`flex-1 py-3 px-3 rounded-xl border text-sm transition-all cursor-pointer ${
                  splitStartWith === 'lower'
                    ? 'border-green-400/50 bg-green-400/15 text-green-400 font-semibold'
                    : 'border-white/10 bg-white/5 text-gray-400'
                }`}
              >
                🦵 פלג גוף תחתון
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {getSplitDescription()}
            </p>
          </div>
        )}

        {/* 10 sets/muscle info */}
        <div className="mb-5 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-xs text-gray-400 text-center">
            📊 התוכנית מבוססת על 10 סטים לשריר בשבוע — נפח אימון אופטימלי לצמיחה
          </p>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 rounded-xl border-none text-white text-base font-bold flex items-center justify-center gap-2.5 transition-all ${
            isGenerating
              ? 'bg-pink-500/30 cursor-not-allowed'
              : 'cursor-pointer shadow-lg shadow-pink-500/30'
          }`}
          style={!isGenerating ? {
            background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
          } : undefined}
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
          className={`w-full py-3 mt-2.5 rounded-xl border border-white/10 bg-transparent text-gray-400 text-sm font-medium ${
            isGenerating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          }`}
        >
          ביטול
        </button>
      </div>

      {/* AI Explanation Popup */}
      {showExplanation && generatedWorkouts.length > 0 && (
        <div
          className="confirmation-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[400px] max-h-[80vh] overflow-auto p-6 rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
          style={{ zIndex: 101, background: '#1F2937' }}
        >
          {/* Success Icon */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/20 border-2 border-teal-400/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-teal-400" />
            </div>
            <h3 className="text-[22px] font-bold text-white mb-2">
              {generatedWorkouts.length === 1 ? 'האימון נוצר!' : `${generatedWorkouts.length} אימונים נוצרו!`}
            </h3>
            <p className="text-sm text-gray-400">
              הנה ההסבר של ה-AI לבחירות שלו
            </p>
          </div>

          {/* Explanations */}
          <div className="mb-6">
            {generatedWorkouts.map((workout, index) => (
              <div
                key={index}
                className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
                  index < generatedWorkouts.length - 1 ? 'mb-3' : ''
                }`}
              >
                {generatedWorkouts.length > 1 && (
                  <div className="text-sm font-semibold text-pink-500 mb-2 flex items-center gap-1.5">
                    <span>💪</span>
                    <span>אימון {index + 1}</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed text-gray-200 m-0">
                  {workout.aiExplanation || 'האימון נוצר בהצלחה!'}
                </p>
                {workout.muscleGroups.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {workout.muscleGroups.map((muscle, i) => (
                      <span
                        key={i}
                        className="bg-violet-500/20 border border-violet-500/30 rounded-md px-2 py-1 text-xs text-violet-400"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Continue button */}
          <button
            onClick={handleCloseExplanation}
            className="w-full py-4 rounded-xl border-none text-white text-base font-bold cursor-pointer shadow-lg shadow-teal-400/30 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #2DD4BF 0%, #10B981 100%)',
            }}
          >
            <span>🎯</span>
            <span>לצפייה באימונים</span>
          </button>
        </div>
      )}
    </div>
  )
}
