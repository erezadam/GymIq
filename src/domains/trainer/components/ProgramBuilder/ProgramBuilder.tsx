import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Plus,
} from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { trainerService } from '../../services/trainerService'
import { programService } from '../../services/programService'
import type { ProgramDay, ProgramExercise, TrainerRelationship, TraineeStats } from '../../types'
import { ProgramDayCard } from './ProgramDayCard'
import { ProgramDayEditor } from './ProgramDayEditor'
import { ProgramReview } from './ProgramReview'
import { ProgramBuilderHeader } from './ProgramBuilderHeader'
import { MobileDaySelector } from './MobileDaySelector'
import { MobileExerciseCard } from './MobileExerciseCard'
import { TraineeSidePanel } from './TraineeSidePanel'
import { TraineeHistoryPanel } from './TraineeHistoryPanel'
import { ExerciseLibrary } from '@/domains/exercises/components/ExerciseLibrary'
import type { ProgramDayExerciseInfo } from '@/domains/exercises/components/ExerciseLibrary'
import type { Exercise } from '@/domains/exercises/types'

type Step = 1 | 2 | 3 | 4
type MobileTab = 'program' | 'trainee' | 'history'

const DAY_LABELS = ['אימון ראשון', 'אימון שני', 'אימון שלישי', 'אימון רביעי', 'אימון חמישי', 'אימון שישי', 'אימון שביעי']
const STEP_LABELS = ['פרטים', 'מבנה', 'תרגילים', 'סיכום']
const DAY_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const DAY_LETTER_GRADIENTS = [
  'from-primary-main to-teal-600',
  'from-status-info to-blue-600',
  'from-accent-purple to-purple-600',
  'from-accent-orange to-orange-600',
  'from-accent-pink to-pink-600',
  'from-accent-gold to-yellow-600',
  'from-status-success to-green-600',
]

const NAME_SUGGESTIONS = [
  { emoji: '💪', label: 'בניית שריר' },
  { emoji: '🔥', label: 'שריפת שומן' },
  { emoji: '⚡', label: 'חיזוק כללי' },
  { emoji: '🏃', label: 'אימון פונקציונלי' },
]

const DURATION_PRESETS: { value: number | null; label: string }[] = [
  { value: 4, label: '4' },
  { value: 8, label: '8' },
  { value: 12, label: '12' },
  { value: null, label: '∞' },
]

const AVATAR_GRADIENTS = [
  'from-primary-main to-status-info',
  'from-accent-purple to-accent-pink',
  'from-accent-orange to-status-error',
  'from-status-info to-accent-purple',
  'from-status-success to-primary-main',
  'from-accent-gold to-accent-orange',
]

function getAvatarGradient(name: string): string {
  const index = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export default function ProgramBuilder() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const isEditMode = !!editId

  // State
  const [step, setStep] = useState<Step>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)
  const [trainees, setTrainees] = useState<TrainerRelationship[]>([])

  // Form data
  const [name, setName] = useState('')
  const [traineeId, setTraineeId] = useState('')
  const [description, setDescription] = useState('')
  const [durationWeeks, setDurationWeeks] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [days, setDays] = useState<ProgramDay[]>([])
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)

  // Mobile-specific state
  const [mobileTab, setMobileTab] = useState<MobileTab>('program')
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState(0)
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  // Draft auto-save
  const [draftId, setDraftId] = useState<string | null>(editId || null)
  const draftSaveInFlight = useRef(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  // Trainee data for side panel
  const [traineeStats, setTraineeStats] = useState<TraineeStats | null>(null)

  // Load trainees
  useEffect(() => {
    if (!user?.uid) return
    trainerService.getTrainerTrainees(user.uid).then(setTrainees).catch(console.error)
  }, [user?.uid])

  // Load trainee stats when trainee is selected
  useEffect(() => {
    if (!traineeId) {
      setTraineeStats(null)
      return
    }
    trainerService.getTraineeStats(traineeId).then(setTraineeStats).catch(console.error)
  }, [traineeId])

  // Load existing program for edit
  useEffect(() => {
    if (!editId) return
    setIsLoading(true)
    programService
      .getProgram(editId)
      .then((program) => {
        if (!program) {
          setError('תוכנית לא נמצאה')
          return
        }
        setName(program.name)
        setTraineeId(program.traineeId)
        setDescription(program.description || '')
        setDurationWeeks(program.durationWeeks || null)
        const date =
          program.startDate instanceof Date
            ? program.startDate
            : (program.startDate as any)?.toDate?.()
              ? (program.startDate as any).toDate()
              : new Date()
        setStartDate(date.toISOString().split('T')[0])
        setDays(program.weeklyStructure || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [editId])

  // ============ Day operations ============

  const addDay = () => {
    if (days.length >= 7) return
    const label = DAY_LABELS[days.length] || `אימון ${days.length + 1}`
    setDays([
      ...days,
      {
        dayLabel: label,
        name: '',
        exercises: [],
        restDay: false,
      },
    ])
  }

  const copyDay = (index: number) => {
    if (days.length >= 7) return
    const source = days[index]
    const copied: ProgramDay = {
      ...source,
      exercises: source.exercises.map((e) => ({ ...e })),
      dayLabel: DAY_LABELS[days.length] || `אימון ${days.length + 1}`,
    }
    setDays([...days, copied])
  }

  const removeDay = (index: number) => {
    const updated = days.filter((_, i) => i !== index)
    updated.forEach((d, i) => {
      d.dayLabel = DAY_LABELS[i] || `אימון ${i + 1}`
    })
    setDays(updated)
    if (selectedMobileDayIndex >= updated.length) {
      setSelectedMobileDayIndex(Math.max(0, updated.length - 1))
    }
  }

  const updateDay = (index: number, day: ProgramDay) => {
    const updated = [...days]
    updated[index] = day
    setDays(updated)
  }

  const updateDayName = (index: number, newName: string) => {
    const updated = [...days]
    updated[index] = { ...updated[index], name: newName }
    setDays(updated)
  }

  // ============ Other-days exercise map for cross-day indicators ============

  const getOtherDaysExercises = useMemo(() => {
    return (excludeDayIndex: number): ProgramDayExerciseInfo[] => {
      const result: ProgramDayExerciseInfo[] = []
      days.forEach((day, i) => {
        if (i === excludeDayIndex || day.restDay) return
        const letter = DAY_LETTERS[i] || String(i + 1)
        day.exercises.forEach((ex) => {
          result.push({ exerciseId: ex.exerciseId, dayLetter: letter })
        })
      })
      return result
    }
  }, [days])

  // ============ Exercise operations for mobile inline editing ============

  const updateMobileExercise = (dayIdx: number, exIdx: number, updates: Partial<ProgramExercise>) => {
    const updated = [...days]
    const day = { ...updated[dayIdx] }
    const exercises = [...day.exercises]
    exercises[exIdx] = { ...exercises[exIdx], ...updates }
    day.exercises = exercises
    updated[dayIdx] = day
    setDays(updated)
  }

  const removeMobileExercise = (dayIdx: number, exIdx: number) => {
    const updated = [...days]
    const day = { ...updated[dayIdx] }
    day.exercises = day.exercises.filter((_, i) => i !== exIdx)
    day.exercises.forEach((ex, i) => (ex.order = i + 1))
    updated[dayIdx] = day
    setDays(updated)
  }

  const handleMobileExerciseToggle = (exercise: Exercise, isAdding: boolean) => {
    const dayIdx = selectedMobileDayIndex
    const day = days[dayIdx]
    if (!day) return

    if (isAdding) {
      const alreadyExists = day.exercises.some(e => e.exerciseId === exercise.id)
      if (alreadyExists) return

      const newExercise: ProgramExercise = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        equipment: exercise.equipment,
        order: day.exercises.length + 1,
        targetSets: 3,
        targetReps: '8-12',
        restTime: 90,
        reportType: exercise.reportType,
        assistanceTypes: exercise.assistanceTypes,
      }
      const updated = [...days]
      updated[dayIdx] = { ...day, exercises: [...day.exercises, newExercise] }
      setDays(updated)
    } else {
      const updated = [...days]
      const newExercises = day.exercises.filter(e => e.exerciseId !== exercise.id)
      newExercises.forEach((ex, i) => (ex.order = i + 1))
      updated[dayIdx] = { ...day, exercises: newExercises }
      setDays(updated)
    }
  }

  // ============ Templates ============

  const applyTemplate = (template: 'ppl' | 'upper_lower' | 'full_body') => {
    if (days.length > 0 && days.some(d => d.exercises.length > 0)) {
      if (!window.confirm('יש ימים קיימים עם תרגילים. להחליף בתבנית?')) return
    }
    let newDays: ProgramDay[] = []
    switch (template) {
      case 'ppl':
        newDays = [
          { dayLabel: DAY_LABELS[0], name: 'Push - חזה, כתפיים, טרייספס', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[1], name: 'Pull - גב, ביספס', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[2], name: 'Legs - רגליים', exercises: [], restDay: false },
        ]
        break
      case 'upper_lower':
        newDays = [
          { dayLabel: DAY_LABELS[0], name: 'Upper - פלג גוף עליון', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[1], name: 'Lower - פלג גוף תחתון', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[2], name: 'Upper - פלג גוף עליון', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[3], name: 'Lower - פלג גוף תחתון', exercises: [], restDay: false },
        ]
        break
      case 'full_body':
        newDays = [
          { dayLabel: DAY_LABELS[0], name: 'Full Body A', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[1], name: 'Full Body B', exercises: [], restDay: false },
          { dayLabel: DAY_LABELS[2], name: 'Full Body C', exercises: [], restDay: false },
        ]
        break
    }
    setDays(newDays)
  }

  // ============ Helpers ============

  const getTraineeName = () => {
    const rel = trainees.find((t) => t.traineeId === traineeId)
    return rel?.traineeName || ''
  }

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1:
        return name.trim().length > 0 && traineeId.length > 0
      case 2:
        return (
          days.length > 0 &&
          days.some(d => !d.restDay && d.exercises.length > 0)
        )
      case 3:
        return days.some((d) => !d.restDay && d.exercises.length > 0)
      case 4:
        return true
      default:
        return false
    }
  }

  // ============ Save helpers ============

  const buildCleanDays = useCallback((currentDays: ProgramDay[]) => {
    return currentDays.map((day) => {
      const cleanDay: Record<string, unknown> = {
        dayLabel: day.dayLabel,
        name: day.name,
        restDay: day.restDay,
        exercises: day.exercises.map((ex) => {
          const cleanEx: Record<string, unknown> = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            order: ex.order,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            restTime: ex.restTime,
          }
          if (ex.imageUrl) cleanEx.imageUrl = ex.imageUrl
          if (ex.category) cleanEx.category = ex.category
          if (ex.primaryMuscle) cleanEx.primaryMuscle = ex.primaryMuscle
          if (ex.equipment) cleanEx.equipment = ex.equipment
          if (ex.targetWeight != null) cleanEx.targetWeight = ex.targetWeight
          if (ex.notes) cleanEx.notes = ex.notes
          if (ex.supersetGroup) cleanEx.supersetGroup = ex.supersetGroup
          if (ex.reportType) cleanEx.reportType = ex.reportType
          if (ex.assistanceTypes && ex.assistanceTypes.length > 0) cleanEx.assistanceTypes = ex.assistanceTypes
          return cleanEx
        }),
      }
      if (day.dayOfWeek != null) cleanDay.dayOfWeek = day.dayOfWeek
      if (day.notes) cleanDay.notes = day.notes
      if (day.estimatedDuration != null) cleanDay.estimatedDuration = day.estimatedDuration
      return cleanDay
    })
  }, [])

  // ============ Background draft save ============

  const saveDraftInBackground = useCallback(async () => {
    if (!user?.uid || !traineeId || !name.trim()) return
    if (draftSaveInFlight.current) return
    draftSaveInFlight.current = true
    setDraftError(null)

    try {
      const programData: Record<string, unknown> = {
        trainerId: user.uid,
        originalTrainerId: user.uid,
        traineeId,
        name,
        status: 'draft',
        isModifiedByTrainee: false,
        weeklyStructure: buildCleanDays(days),
        startDate: new Date(startDate),
        currentWeek: 1,
      }
      if (description) programData.description = description
      if (durationWeeks != null) programData.durationWeeks = durationWeeks

      if (draftId) {
        await programService.updateProgram(draftId, programData as any)
      } else {
        const newId = await programService.createProgram(programData as any)
        setDraftId(newId)
      }
    } catch (err) {
      console.error('Draft save failed:', err)
      setDraftError('שמירת טיוטה נכשלה')
      setTimeout(() => setDraftError(null), 4000)
    } finally {
      draftSaveInFlight.current = false
    }
  }, [user?.uid, traineeId, name, description, durationWeeks, startDate, days, draftId, buildCleanDays])

  // ============ Save ============

  const handleSave = async (activate: boolean) => {
    if (!user?.uid) return
    if (!traineeId.trim()) {
      setError('יש לבחור מתאמן')
      return
    }
    if (!name.trim()) {
      setError('יש להזין שם תוכנית')
      return
    }
    setIsSaving(true)
    setError(null)

    try {
      const programData: Record<string, unknown> = {
        trainerId: user.uid,
        originalTrainerId: user.uid,
        traineeId,
        name,
        status: activate ? 'active' : 'draft',
        isModifiedByTrainee: false,
        weeklyStructure: buildCleanDays(days),
        startDate: new Date(startDate),
        currentWeek: 1,
      }
      if (description) programData.description = description
      if (durationWeeks != null) programData.durationWeeks = durationWeeks

      if (draftId) {
        await programService.updateProgram(draftId, programData as any)
        if (activate) {
          await programService.activateProgram(draftId, traineeId)
        }
      } else {
        const newId = await programService.createProgram(programData as any)
        if (activate) {
          await programService.activateProgram(newId, traineeId)
        }
      }

      navigate('/trainer')
    } catch (err: any) {
      console.error('Error saving program:', err)
      setError(err.message || 'שגיאה בשמירת התוכנית')
    } finally {
      setIsSaving(false)
    }
  }

  const handleQuickSave = () => handleSave(false)

  // Step navigation with background draft save
  const navigateToStep = useCallback((targetStep: Step) => {
    setStep(targetStep)
    saveDraftInBackground()
  }, [saveDraftInBackground])

  // ============ Loading state ============

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  // ============ Full-screen exercise picker ============

  if (showExercisePicker) {
    const currentDay = days[selectedMobileDayIndex]
    return (
      <div className="fixed inset-0 z-50 bg-dark-bg overflow-y-auto">
        <ExerciseLibrary
          programMode
          programExerciseIds={currentDay?.exercises.map(e => e.exerciseId) || []}
          onProgramExerciseToggle={handleMobileExerciseToggle}
          onProgramBack={() => { setShowExercisePicker(false); saveDraftInBackground() }}
          targetUserId={traineeId}
          programOtherDaysExercises={getOtherDaysExercises(selectedMobileDayIndex)}
        />
      </div>
    )
  }

  // ============ Desktop: ProgramDayEditor (full page) ============

  if (editingDayIndex !== null && (step === 2 || step === 3)) {
    return (
      <ProgramDayEditor
        day={days[editingDayIndex]}
        dayIndex={editingDayIndex}
        onUpdate={(updated) => updateDay(editingDayIndex, updated)}
        onBack={() => { setEditingDayIndex(null); saveDraftInBackground() }}
        traineeId={traineeId}
        programOtherDaysExercises={getOtherDaysExercises(editingDayIndex)}
      />
    )
  }

  const trainingDaysCount = days.filter((d) => !d.restDay).length
  const hasTrainee = traineeId.length > 0

  // ============ Mobile Tab: Trainee Profile ============

  const renderMobileTraineeTab = () => (
    <div className="p-4">
      <TraineeSidePanel traineeId={traineeId} />
    </div>
  )

  // ============ Mobile Tab: History ============

  const renderMobileHistoryTab = () => (
    <div className="p-4">
      <TraineeHistoryPanel traineeId={traineeId} />
    </div>
  )

  // ============ Mobile: Step 3 inline exercises ============

  const renderMobileStep3 = () => {
    const currentDay = days[selectedMobileDayIndex]
    if (!currentDay) return null

    const letter = DAY_LETTERS[selectedMobileDayIndex] || String(selectedMobileDayIndex + 1)
    const gradient = DAY_LETTER_GRADIENTS[selectedMobileDayIndex % DAY_LETTER_GRADIENTS.length]
    const exerciseCount = currentDay.exercises.length
    const estimatedMinutes = Math.round(
      currentDay.exercises.reduce((sum, ex) => sum + ex.targetSets * (45 + ex.restTime), 0) / 60 +
        currentDay.exercises.length * 2
    )

    return (
      <div className="p-4">
        {/* Day selector */}
        <MobileDaySelector
          days={days}
          selectedIndex={selectedMobileDayIndex}
          onSelect={setSelectedMobileDayIndex}
          onAddDay={addDay}
        />

        {/* Day title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg font-black text-white flex-shrink-0`}
          >
            {letter}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={currentDay.name}
              onChange={(e) => updateDayName(selectedMobileDayIndex, e.target.value)}
              className="bg-transparent font-bold text-lg text-text-primary focus:outline-none w-full"
              placeholder="שם האימון..."
            />
            <p className="text-xs text-text-muted">
              {exerciseCount} תרגילים{estimatedMinutes > 0 ? ` • ~${estimatedMinutes} דקות` : ''}
            </p>
          </div>
        </div>

        {/* Exercise cards */}
        <div className="space-y-3">
          {currentDay.exercises.map((ex, i) => (
            <MobileExerciseCard
              key={`${ex.exerciseId}-${i}`}
              exercise={ex}
              onUpdate={(updates) => updateMobileExercise(selectedMobileDayIndex, i, updates)}
              onRemove={() => removeMobileExercise(selectedMobileDayIndex, i)}
            />
          ))}

          {/* Add exercise button */}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-4 border-2 border-dashed border-dark-border rounded-xl text-text-muted flex items-center justify-center gap-2 hover:border-primary-main hover:text-primary-main transition"
          >
            <Plus className="w-5 h-5" />
            הוסף תרגיל
          </button>

          {/* Day notes */}
          <div className="mt-2">
            <textarea
              value={currentDay.notes || ''}
              onChange={(e) => {
                const updated = [...days]
                updated[selectedMobileDayIndex] = {
                  ...updated[selectedMobileDayIndex],
                  notes: e.target.value || undefined,
                }
                setDays(updated)
              }}
              placeholder="הערות ליום..."
              rows={2}
              className="w-full bg-dark-surface/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-primary-main"
            />
          </div>
        </div>
      </div>
    )
  }

  // ============ Program Content (shared between desktop and mobile program tab) ============

  const renderProgramContent = (isMobile: boolean) => (
    <div className={isMobile ? '' : 'space-y-6'}>
      {/* Step Indicator */}
      <div className="flex justify-center py-3">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`${isMobile ? 'w-7 h-7 rounded-full text-xs' : 'w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl text-base sm:text-xl'} flex items-center justify-center font-bold transition-all ${
                    s < step
                      ? 'bg-primary-main text-white'
                      : s === step
                      ? 'bg-gradient-to-br from-primary-main to-status-info text-white shadow-glow-cyan'
                      : 'bg-dark-surface border-2 border-dark-border text-text-muted'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                {!isMobile && (
                  <span
                    className={`text-xs sm:text-sm mt-1.5 sm:mt-2 ${
                      s <= step ? 'text-primary-main font-medium' : 'text-text-muted'
                    }`}
                  >
                    {STEP_LABELS[s - 1]}
                  </span>
                )}
              </div>
              {i < 3 && (
                <div
                  className={`${isMobile ? 'w-6 h-0.5 mx-1' : 'w-8 sm:w-16 h-1 mx-1.5 sm:mx-2'} rounded-full ${
                    s < step
                      ? 'bg-gradient-to-l from-primary-main to-status-info'
                      : 'bg-dark-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={`bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm ${isMobile ? 'mx-4' : ''}`}>
          {error}
        </div>
      )}

      {/* Draft save error toast */}
      {draftError && (
        <div className={`bg-status-warning/10 border border-status-warning/30 text-status-warning rounded-xl p-3 text-sm ${isMobile ? 'mx-4' : ''}`}>
          {draftError}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className={`bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-3xl ${isMobile ? 'm-4 p-4' : 'p-5 sm:p-8'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`${isMobile ? 'w-8 h-8 text-lg' : 'w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl'} bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center`}>
              📋
            </div>
            <div>
              <h2 className={`${isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-bold text-text-primary`}>פרטי התוכנית</h2>
              <p className="text-text-muted text-sm">הגדר את המידע הבסיסי</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Trainee Select */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <span className="text-primary-main">👤</span> בחר מתאמן *
              </label>
              <select
                value={traineeId}
                onChange={(e) => setTraineeId(e.target.value)}
                className="w-full bg-dark-surface border-2 border-dark-border rounded-xl py-3 px-4 text-text-primary appearance-none focus:border-primary-main focus:outline-none transition"
              >
                <option value="">בחר מתאמן...</option>
                {trainees.map((t) => (
                  <option key={t.traineeId} value={t.traineeId}>
                    {t.traineeName}
                  </option>
                ))}
              </select>
              {trainees.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {trainees.slice(0, 5).map((t) => (
                    <button
                      key={t.traineeId}
                      onClick={() => setTraineeId(t.traineeId)}
                      className={`flex items-center gap-2 px-3 py-2 bg-dark-surface rounded-xl transition border-2 ${
                        traineeId === t.traineeId
                          ? 'border-primary-main bg-primary-main/10'
                          : 'border-transparent hover:border-primary-main/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(t.traineeName)} flex items-center justify-center text-sm font-bold text-white`}
                      >
                        {t.traineeName.charAt(0)}
                      </div>
                      <span className="text-sm text-text-primary">
                        {t.traineeName.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Program Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <span className="text-primary-main">✏️</span> שם התוכנית *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-surface border-2 border-dark-border rounded-xl py-3 px-4 text-text-primary focus:border-primary-main focus:outline-none transition placeholder-text-muted"
                placeholder="למשל: תוכנית חיזוק 3 ימים"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {NAME_SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setName(s.label)}
                    className="px-3 py-1.5 bg-dark-surface rounded-lg text-sm text-text-secondary hover:bg-primary-main/20 hover:text-primary-main transition"
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <span className="text-primary-main">📝</span> תיאור (אופציונלי)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-dark-surface border-2 border-dark-border rounded-xl py-3 px-4 text-text-primary focus:border-primary-main focus:outline-none transition placeholder-text-muted resize-none"
                placeholder="תיאור קצר של התוכנית ומטרותיה..."
                rows={3}
              />
            </div>

            {/* Date + Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  <span className="text-primary-main">📅</span> תאריך התחלה
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="w-full bg-dark-surface border-2 border-dark-border rounded-xl py-3 px-4 text-text-primary focus:border-primary-main focus:outline-none transition [color-scheme:dark] cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  <span className="text-primary-main">⏱️</span> משך (שבועות)
                </label>
                <div className="flex gap-2">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setDurationWeeks(p.value)}
                      className={`flex-1 py-3 rounded-xl text-center font-medium transition border-2 ${
                        durationWeeks === p.value
                          ? 'bg-primary-main/20 border-primary-main text-primary-main'
                          : 'bg-dark-surface border-dark-border hover:border-primary-main/50 text-text-secondary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Week Structure */}
      {step === 2 && (
        <div className={`bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-3xl ${isMobile ? 'm-4 p-4' : 'p-5 sm:p-8'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`${isMobile ? 'w-8 h-8 text-lg' : 'w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl'} bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center`}>
                📆
              </div>
              <div>
                <h2 className={`${isMobile ? 'text-base' : 'text-lg sm:text-xl'} font-bold text-text-primary`}>מבנה שבועי</h2>
                <p className="text-text-muted text-sm">הגדר את ימי האימון</p>
              </div>
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold text-primary-main">{trainingDaysCount}</div>
              <div className="text-sm text-text-muted">ימי אימון</div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {days.map((day, index) => (
              <ProgramDayCard
                key={index}
                day={day}
                index={index}
                onEdit={() => {
                  if (isMobile) {
                    setStep(3)
                    setSelectedMobileDayIndex(index)
                  } else {
                    setEditingDayIndex(index)
                  }
                }}
                onRemove={removeDay}
                onCopy={copyDay}
                onUpdateName={updateDayName}
              />
            ))}
          </div>

          {days.length < 7 && (
            <button
              onClick={addDay}
              className="w-full py-4 border-2 border-dashed border-dark-border rounded-2xl text-text-muted hover:border-primary-main hover:text-primary-main transition flex items-center justify-center gap-2"
            >
              <span className="text-2xl">+</span>
              הוסף יום אימון
            </button>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-text-muted mb-3">תבניות מהירות:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyTemplate('ppl')}
                className="px-4 py-2 bg-dark-surface rounded-xl text-sm text-text-secondary hover:bg-primary-main/20 hover:text-primary-main transition"
              >
                🏋️ Push/Pull/Legs
              </button>
              <button
                onClick={() => applyTemplate('upper_lower')}
                className="px-4 py-2 bg-dark-surface rounded-xl text-sm text-text-secondary hover:bg-primary-main/20 hover:text-primary-main transition"
              >
                💪 Upper/Lower
              </button>
              <button
                onClick={() => applyTemplate('full_body')}
                className="px-4 py-2 bg-dark-surface rounded-xl text-sm text-text-secondary hover:bg-primary-main/20 hover:text-primary-main transition"
              >
                🔥 Full Body 3x
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Exercises (desktop day list / mobile inline) */}
      {step === 3 && (
        isMobile ? (
          renderMobileStep3()
        ) : editingDayIndex === null ? (
          <div className="bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-main to-status-info rounded-xl flex items-center justify-center text-xl sm:text-2xl">
                🏋️
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">תרגילים ליום</h2>
                <p className="text-text-muted text-sm">לחץ על עריכה כדי להוסיף תרגילים</p>
              </div>
            </div>

            <div className="space-y-4">
              {days.map((day, index) => (
                <ProgramDayCard
                  key={index}
                  day={day}
                  index={index}
                  onEdit={() => setEditingDayIndex(index)}
                  onRemove={removeDay}
                  onCopy={copyDay}
                  onUpdateName={updateDayName}
                />
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className={isMobile ? 'p-4' : ''}>
          <ProgramReview
            name={name}
            traineeName={getTraineeName()}
            description={description}
            durationWeeks={durationWeeks}
            startDate={startDate}
            days={days}
          />
        </div>
      )}
    </div>
  )

  // ============ RENDER ============

  return (
    <div className="flex flex-col h-full">
      {/* ===== MOBILE LAYOUT (<md) ===== */}
      <div className="md:hidden flex flex-col h-full">
        {/* Sticky Header */}
        {hasTrainee && (
          <div className="sticky top-0 z-30">
            <ProgramBuilderHeader
              traineeId={traineeId}
              trainees={trainees}
              stats={traineeStats}
              isSaving={isSaving}
              onSave={handleQuickSave}
              subtitle={
                mobileTab === 'trainee'
                  ? `${trainees.find(t => t.traineeId === traineeId)?.traineeEmail || ''}`
                  : mobileTab === 'history'
                  ? `${traineeStats?.totalWorkouts || 0} אימונים • ${traineeStats?.programCompletionRate || 0}% ביצוע`
                  : undefined
              }
            />
          </div>
        )}

        {/* Tab Navigation */}
        {hasTrainee && (
          <div className="flex bg-dark-bg border-b border-dark-border sticky top-0 z-20">
            <button
              onClick={() => setMobileTab('program')}
              className={`flex-1 py-3 text-center text-sm font-medium transition ${
                mobileTab === 'program'
                  ? 'text-primary-main border-b-2 border-primary-main'
                  : 'text-text-muted'
              }`}
            >
              📋 תוכנית
            </button>
            <button
              onClick={() => setMobileTab('trainee')}
              className={`flex-1 py-3 text-center text-sm font-medium transition ${
                mobileTab === 'trainee'
                  ? 'text-primary-main border-b-2 border-primary-main'
                  : 'text-text-muted'
              }`}
            >
              👤 מתאמן
            </button>
            <button
              onClick={() => setMobileTab('history')}
              className={`flex-1 py-3 text-center text-sm font-medium transition relative ${
                mobileTab === 'history'
                  ? 'text-primary-main border-b-2 border-primary-main'
                  : 'text-text-muted'
              }`}
            >
              📊 היסטוריה
              {(traineeStats?.totalWorkouts || 0) > 0 && mobileTab !== 'history' && (
                <span className="absolute top-2 mr-1 w-2 h-2 bg-primary-main rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          {mobileTab === 'program' && renderProgramContent(true)}
          {mobileTab === 'trainee' && renderMobileTraineeTab()}
          {mobileTab === 'history' && renderMobileHistoryTab()}
        </div>

        {/* Fixed Bottom Bar */}
        {mobileTab === 'program' && (
          <div className="fixed bottom-0 inset-x-0 p-4 bg-dark-bg border-t border-dark-border z-30 pb-safe">
            <div className="flex gap-3">
              {step > 1 ? (
                <button
                  onClick={() => {
                    if (step === 3) setSelectedMobileDayIndex(0)
                    setStep(step === 4 ? 2 : (step - 1) as Step)
                  }}
                  className="flex-1 py-3 bg-dark-surface rounded-xl font-medium text-text-secondary flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-4 h-4" />
                  הקודם
                </button>
              ) : (
                <button
                  onClick={() => navigate('/trainer')}
                  className="flex-1 py-3 bg-dark-surface rounded-xl font-medium text-text-secondary"
                >
                  ביטול
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={() => navigateToStep(step === 2 ? 4 : (step + 1) as Step)}
                  disabled={!canProceed(step)}
                  title={step === 2 && !canProceed(2) ? 'הוסף תרגילים ליום אימון אחד לפחות' : undefined}
                  className="flex-1 py-3 bg-gradient-to-br from-primary-main to-status-info rounded-xl font-bold text-white shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-1"
                >
                  {step === 2 ? 'המשך לסיכום' : step === 3 ? 'סיכום' : 'הבא'}
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-dark-surface rounded-xl font-medium text-text-secondary flex items-center justify-center gap-1"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    טיוטה
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-gradient-to-br from-primary-main to-status-info rounded-xl font-bold text-white shadow-glow-cyan disabled:opacity-40 flex items-center justify-center gap-1"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    הפעל
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP LAYOUT (>=md) ===== */}
      <div className="hidden md:block">
        {/* Desktop Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/trainer')}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition"
          >
            <ArrowRight className="w-5 h-5" />
            <span>חזרה</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            {isEditMode ? '✏️ עריכת תוכנית' : '✨ תוכנית חדשה'}
          </h1>
          <div className="w-20" />
        </div>

        {/* Split layout: 70% builder + 30% side panel */}
        <div className="flex gap-6">
          {/* Main builder area (70%) */}
          <div className="flex-1 min-w-0 space-y-6">
            {renderProgramContent(false)}

            {/* Desktop navigation buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step === 4 ? 2 : (step - 1) as Step)}
                  className="px-5 sm:px-6 py-3 sm:py-4 bg-dark-surface rounded-xl hover:bg-dark-card transition flex items-center gap-2 text-text-secondary"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>הקודם</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/trainer')}
                  className="px-5 sm:px-6 py-3 sm:py-4 bg-dark-surface rounded-xl hover:bg-dark-card transition flex items-center gap-2 text-text-secondary"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>ביטול</span>
                </button>
              )}

              {step < 4 ? (
                <button
                  onClick={() => navigateToStep(step === 2 ? 4 : (step + 1) as Step)}
                  disabled={!canProceed(step)}
                  title={step === 2 && !canProceed(2) ? 'הוסף תרגילים ליום אימון אחד לפחות' : undefined}
                  className="px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-br from-primary-main to-status-info rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2 text-white shadow-glow-cyan disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <span>{step === 2 ? 'המשך לסיכום' : 'המשך'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving}
                    className="px-5 sm:px-6 py-3 sm:py-4 bg-dark-surface rounded-xl hover:bg-dark-card transition flex items-center gap-2 text-text-secondary"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>שמור טיוטה</span>
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-br from-primary-main to-status-info rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2 text-white shadow-glow-cyan disabled:opacity-40 disabled:shadow-none"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>הפעל תוכנית</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Side panel (30%) - Trainee info */}
          {hasTrainee && (
            <div className="w-80 xl:w-96 flex-shrink-0 space-y-4">
              {/* Trainee header card */}
              <div className="bg-gradient-to-br from-primary-main/10 to-status-info/10 border border-primary-main/20 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(getTraineeName())} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0`}
                  >
                    {getTraineeName().charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary truncate">{getTraineeName()}</span>
                      <span className="px-1.5 py-0.5 bg-status-success/20 text-status-success text-xs rounded flex-shrink-0">
                        פעיל
                      </span>
                    </div>
                    {traineeStats && (
                      <div className="text-xs text-text-muted flex items-center gap-2">
                        <span>🔥 {traineeStats.currentStreak} ימים</span>
                        <span>•</span>
                        <span>{traineeStats.thisWeekWorkouts} השבוע</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs for side panel content */}
              <SidePanelTabs traineeId={traineeId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Desktop Side Panel Tabs ============

function SidePanelTabs({ traineeId }: { traineeId: string }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex bg-dark-card/80 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden mb-4">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition ${
            activeTab === 'profile'
              ? 'bg-primary-main/20 text-primary-main'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          👤 פרופיל
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-sm font-medium text-center transition ${
            activeTab === 'history'
              ? 'bg-primary-main/20 text-primary-main'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          📊 היסטוריה
        </button>
      </div>

      {/* Content */}
      {activeTab === 'profile' ? (
        <TraineeSidePanel traineeId={traineeId} />
      ) : (
        <TraineeHistoryPanel traineeId={traineeId} />
      )}
    </div>
  )
}
