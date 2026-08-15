/**
 * AITrainerModal
 * Modal for configuring AI-generated workout plans
 * New logic: bodyRegion-based splits, 10 sets/muscle/week
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, Sparkles } from 'lucide-react'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { generateAIWorkouts } from '@/domains/workouts/services/aiTrainerService'
import { getDistinctPerformedExerciseIds } from '@/lib/firebase/workoutHistory'
import { getExercises } from '@/lib/firebase/exercises'
import { getEquipment } from '@/lib/firebase/equipment'
import { buildEquipmentOptions, isEquipmentOptionEmpty, type EquipmentOption } from '@/domains/exercises/utils'
import {
  equipmentSelectableIds,
  equipmentAvailabilityCounts,
  isAllSelected,
  toggleEquipment,
  equipmentFilterForRequest,
  availableStrengthCount,
  isCardioExercise,
} from '@/domains/workouts/utils/equipmentSelection'
import type { Exercise } from '@/domains/exercises/types'
import type { AITrainerRequest, WorkoutStructure, SplitStartWith, ExerciseSource, AIGeneratedWorkout } from '@/domains/workouts/services/aiTrainer.types'
import { getExerciseCount } from '@/domains/workouts/services/aiTrainer.types'

interface AITrainerModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Entry-gate threshold: the minimum number of DISTINCT exercises a trainee must
 * have actually performed (ex.isCompleted) before the AI Trainer unlocks.
 * Single source of truth — change this one value to tune the gate.
 */
const MIN_DISTINCT_EXERCISES = 10

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
  // Exercise pool source — user-selectable. The threshold-based default is set
  // once when the history check resolves (see the open effect); manual choices
  // afterward are not overridden until the modal reopens.
  const [exerciseSource, setExerciseSource] = useState<ExerciseSource>('performed')

  // UI state
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Explanation popup state
  const [showExplanation, setShowExplanation] = useState(false)
  const [generatedWorkouts, setGeneratedWorkouts] = useState<AIGeneratedWorkout[]>([])

  // Entry-gate state: how many distinct exercises the trainee has performed.
  // null = not yet resolved (the modal shows a loading state). This is the only
  // data the modal loads on open.
  const [distinctExerciseCount, setDistinctExerciseCount] = useState<number | null>(null)

  // Equipment multi-select. Availability is derived from the trainer's pool
  // (which the exercise-source selector affects), not the whole library.
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [performedIds, setPerformedIds] = useState<Set<string>>(new Set())
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>([])
  // The selected equipment option ids (excluding the "all" toggle). Default: all.
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set())

  // Scarcity alert (too few strength exercises under the selection).
  const [scarcityCount, setScarcityCount] = useState<number | null>(null)
  // Warmup skipped because the filter left no cardio (from the function response).
  const [warmupSkippedNoCardio, setWarmupSkippedNoCardio] = useState(false)

  // On open, derive the distinct-exercise count. Reset to null up-front (and on
  // close) so the loading state — not a stale form — renders while the check
  // runs; this avoids a one-frame flash of the config form before the gate
  // applies. Any failure (or missing user) is treated as 0, i.e. below
  // threshold, so the neutral block state is shown rather than crashing.
  useEffect(() => {
    setDistinctExerciseCount(null)
    setScarcityCount(null)
    setWarmupSkippedNoCardio(false)
    if (!isOpen) return

    let cancelled = false

    const run = async () => {
      // Library + equipment (independent of the user). Failures degrade to an
      // empty pool / default equipment rather than crashing the modal.
      try {
        const [exs, equip] = await Promise.all([getExercises(), getEquipment()])
        if (!cancelled) {
          setExercises(exs)
          const opts = buildEquipmentOptions(equip)
          setEquipmentOptions(opts)
          // Default selection: everything (equivalent to "all" → no filter sent).
          setSelectedEquipment(new Set(equipmentSelectableIds(opts)))
        }
      } catch (e) {
        console.error('Failed to load exercises/equipment for AI modal:', e)
      }

      // Entry gate + the performed set (used for 'performed'-mode availability).
      try {
        if (!user?.uid) {
          if (!cancelled) {
            setPerformedIds(new Set())
            setDistinctExerciseCount(0)
            // Below threshold → default to the full library; 'performed' is locked.
            setExerciseSource('all')
          }
          return
        }
        const ids = await getDistinctPerformedExerciseIds(user.uid)
        if (!cancelled) {
          setPerformedIds(ids)
          setDistinctExerciseCount(ids.size)
          // Threshold-based default, set once per open. Subsequent manual choices
          // are preserved because this effect only re-runs on open / user change.
          setExerciseSource(ids.size < MIN_DISTINCT_EXERCISES ? 'all' : 'performed')
        }
      } catch (err) {
        console.error('Failed to derive distinct exercise count:', err)
        if (!cancelled) {
          setPerformedIds(new Set())
          setDistinctExerciseCount(0)
          setExerciseSource('all')
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [isOpen, user?.uid])

  // Derived state.
  // The upper/lower start choice only changes the muscle balance when the number
  // of split workouts is odd (1, 3, 5) — for even counts the split is balanced
  // regardless of start, so the picker stays hidden. The structure (full body vs
  // split) is always the user's choice, for every workout count.
  const showSplitStartSelection = workoutStructure === 'split' && numWorkouts % 2 === 1

  // While the count is unresolved, show the loading state. Once resolved, the
  // gate is active iff the trainee is short of the threshold.
  const isCheckingHistory = distinctExerciseCount === null
  const isGated =
    distinctExerciseCount !== null &&
    distinctExerciseCount < MIN_DISTINCT_EXERCISES
  const exercisesRemaining = Math.max(0, MIN_DISTINCT_EXERCISES - (distinctExerciseCount ?? 0))

  // The trainer's available pool, respecting the exercise-source selector (same
  // rule as buildContext: 'all' → whole library; 'performed' → performed + all
  // cardio). Equipment availability/dimming derives from THIS pool, so switching
  // the source updates the counts.
  const sourcePool = useMemo(() => {
    if (exerciseSource === 'all') return exercises
    return exercises.filter((ex) => isCardioExercise(ex) || performedIds.has(ex.id))
  }, [exerciseSource, exercises, performedIds])

  const selectableEquipmentIds = useMemo(
    () => equipmentSelectableIds(equipmentOptions),
    [equipmentOptions]
  )
  const equipmentCounts = useMemo(
    () => equipmentAvailabilityCounts(sourcePool, equipmentOptions),
    [sourcePool, equipmentOptions]
  )
  const allEquipmentSelected = isAllSelected(selectedEquipment, selectableEquipmentIds)

  // Generate — first guard against too few strength exercises under the current
  // equipment selection. When enough, proceed; otherwise show the scarcity alert.
  const handleGenerate = () => {
    if (!user?.uid) {
      setError('יש להתחבר כדי ליצור אימון')
      return
    }
    // Scarcity check only when the pool actually loaded — a failed/absent library
    // load must NOT block generation (the service loads its own exercises).
    if (exercises.length > 0) {
      const strengthAvailable = availableStrengthCount(sourcePool, selectedEquipment, selectableEquipmentIds)
      if (strengthAvailable < exerciseCount) {
        setScarcityCount(strengthAvailable)
        return
      }
    }
    void proceedGenerate()
  }

  const proceedGenerate = async () => {
    if (!user?.uid) return
    try {
      setScarcityCount(null)
      setIsGenerating(true)
      setError(null)

      // Send the equipment field only for a partial selection; "all" sends nothing
      // so behavior stays identical to today.
      const equipmentFilter = equipmentFilterForRequest(selectedEquipment, selectableEquipmentIds)

      const request: AITrainerRequest = {
        numWorkouts,
        duration,
        warmupDuration,
        userId: user.uid,
        workoutStructure,
        exerciseSource,
        ...(showSplitStartSelection && { splitStartWith }),
        ...(equipmentFilter && { equipmentFilter }),
      }

      console.log('🤖 Generating workout with:', request)

      const result = await generateAIWorkouts(request)

      if (!result.success) {
        setError(result.error || 'שגיאה ביצירת האימון')
        return
      }

      console.log(`✅ Created ${result.workouts.length} workouts`)

      const skipped = result.warmupSkippedNoCardio === true
      setWarmupSkippedNoCardio(skipped)

      // Check if we have AI explanations
      const hasExplanations = result.workouts.some(w => w.aiExplanation)

      // Show the popup when there's an explanation OR a warmup notice to convey.
      if (hasExplanations || skipped) {
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
    if (workoutStructure === 'full_body') return 'כל אימון מכסה את כל הגוף'

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

        {/* Entry gate: checking the trainee's workout history */}
        {isCheckingHistory && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            <p className="text-sm text-gray-400">בודק את היסטוריית האימונים שלך...</p>
          </div>
        )}

        {/* Configuration form — shown once the history check resolves. The gate
            no longer blocks the whole form; below the threshold it only
            constrains the source selector (locks 'מתוך שביצעת' and defaults to
            'מכל התרגילים'). */}
        {!isCheckingHistory && (
          <>
        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 mb-4 text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Exercise source selector */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-white mb-2.5">
            מקור התרגילים
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setExerciseSource('performed')}
              disabled={isGated}
              className={`flex-1 py-3 px-2 rounded-xl border text-sm transition-all ${
                isGated
                  ? 'border-white/10 bg-white/5 text-gray-600 cursor-not-allowed'
                  : exerciseSource === 'performed'
                    ? 'border-teal-400/50 bg-teal-400/15 text-teal-400 font-semibold cursor-pointer'
                    : 'border-white/10 bg-white/5 text-gray-400 cursor-pointer'
              }`}
            >
              💪 מתוך שביצעת
            </button>
            <button
              onClick={() => setExerciseSource('all')}
              className={`flex-1 py-3 px-2 rounded-xl border text-sm transition-all cursor-pointer ${
                exerciseSource === 'all'
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-400 font-semibold'
                  : 'border-white/10 bg-white/5 text-gray-400'
              }`}
            >
              🗂️ מכל התרגילים
            </button>
          </div>
          {isGated && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              כדי לבחור "מתוך שביצעת" נותרו עוד {exercisesRemaining} {exercisesRemaining === 1 ? 'תרגיל שונה' : 'תרגילים שונים'} (ביצעת {distinctExerciseCount ?? 0} מתוך {MIN_DISTINCT_EXERCISES})
            </p>
          )}
        </div>

        {/* Equipment selector (multi-select). Default: all selected → no field
            sent. Availability derives from the source-filtered pool; an option
            with zero available exercises is dimmed and truly disabled. */}
        {equipmentOptions.length > 0 && (
          <div className="mb-5">
            <label className="block text-sm font-semibold text-white mb-1">
              ציוד זמין
            </label>
            <p className="text-xs text-gray-500 mb-2">
              לחיצה בוחרת ציוד ספציפי · "הכל" לכל הציוד
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {equipmentOptions.map((opt) => {
                const selected =
                  opt.id === 'all'
                    ? allEquipmentSelected
                    : selectedEquipment.has(opt.id)
                const empty =
                  opt.id !== 'all' &&
                  isEquipmentOptionEmpty(opt.id, false, equipmentCounts.get(opt.id))
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={empty}
                    onClick={() =>
                      setSelectedEquipment(
                        toggleEquipment(selectedEquipment, opt.id, selectableEquipmentIds)
                      )
                    }
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all ${
                      empty
                        ? 'border-white/10 bg-white/5 text-gray-600 opacity-40 cursor-not-allowed'
                        : selected
                          ? 'border-teal-400/50 bg-teal-400/15 text-teal-400 font-semibold cursor-pointer'
                          : 'border-white/10 bg-white/5 text-gray-400 cursor-pointer'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
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
        {/* Workout structure — always selectable, for every workout count */}
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
          </>
        )}
      </div>

      {/* Scarcity alert — too few strength exercises under the current equipment
          selection. Continue proceeds; cancel returns to the selector inside the
          modal with all choices preserved (it only dismisses this overlay). */}
      {scarcityCount !== null && (
        <div
          className="confirmation-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[360px] w-[90%] p-5 rounded-2xl shadow-2xl z-[102] bg-[#1F2937]"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <h3 className="text-lg font-bold text-white mb-2 text-center">מעט תרגילים לציוד שנבחר</h3>
          <p className="text-sm text-gray-300 leading-relaxed text-center mb-5">
            תחת בחירת הציוד יש רק {scarcityCount} תרגילי כוח זמינים, והאימון במשך שנבחר דורש {exerciseCount}.
            אפשר להמשיך בכל זאת (ייבנה אימון קצר יותר) או לחזור ולשנות את בחירת הציוד.
          </p>
          <button
            type="button"
            onClick={() => void proceedGenerate()}
            className="w-full py-3 rounded-xl border-none text-white text-sm font-bold cursor-pointer mb-2.5 bg-gradient-to-br from-pink-500 to-violet-500"
          >
            המשך בכל זאת
          </button>
          <button
            type="button"
            onClick={() => setScarcityCount(null)}
            className="w-full py-3 rounded-xl border border-white/10 bg-transparent text-gray-300 text-sm font-medium cursor-pointer"
          >
            חזרה לבחירת ציוד
          </button>
        </div>
      )}

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

          {/* Warmup skipped because no cardio survived the equipment filter. */}
          {warmupSkippedNoCardio && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 mb-5">
              <p className="text-sm leading-relaxed text-gray-200 m-0">
                לא הוספנו חימום כי אין תרגיל אירובי (קרדיו) שמתאים לבחירת הציוד שלך. אפשר להוסיף גומייה/מכשיר קרדיו לבחירה, או להוסיף חימום ידני באימון.
              </p>
            </div>
          )}

          {/* Built-from-performed-exercises note — only when the plan was actually
              built from the performed pool ('performed' mode). In 'all' mode the
              statement would be untrue, so it is hidden. */}
          {exerciseSource === 'performed' && (
            <div className="bg-teal-400/10 border border-teal-400/20 rounded-xl p-3.5 mb-5">
              <p className="text-sm leading-relaxed text-gray-200 m-0">
                {distinctExerciseCount && distinctExerciseCount > 0
                  ? `בנינו לך את האימון מהתרגילים שכבר ביצעת — מתוך ${distinctExerciseCount} תרגילים שביצעת עד כה. אתה מכיר אותם, ויש לך עליהם היסטוריה.`
                  : 'בנינו לך את האימון מהתרגילים שכבר ביצעת — אתה מכיר אותם, ויש לך עליהם היסטוריה.'}
              </p>
            </div>
          )}

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
