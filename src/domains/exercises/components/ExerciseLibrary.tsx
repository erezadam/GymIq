import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Check, Home, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Exercise, MuscleGroup } from '../types'
import type { PrimaryMuscle } from '../types/muscles'
import { defaultMuscleMapping } from '../types/muscles'
import { exerciseService } from '../services'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '../utils'
import { useWorkoutBuilderStore } from '@/domains/workouts/store'
import { getMuscles, getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import { getEquipment } from '@/lib/firebase/equipment'
import { MuscleIcon } from '@/shared/components/MuscleIcon'
import RecommendedSets from './RecommendedSets'
import QuickPlanExerciseList from './QuickPlanExerciseList'
import { saveWorkoutHistory, getRecentlyDoneExerciseIds, getWeeklyMuscleSets } from '@/lib/firebase/workoutHistory'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '@/domains/workouts/types/active-workout.types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import { programService } from '@/domains/trainer/services/programService'
import type { ProgramExercise } from '@/domains/trainer/types'
import { getMuscleNameHe } from '@/utils/muscleTranslations'
import { autoFixEquipmentMismatch } from '@/lib/firebase/exercises'
import { TraineeAssignmentModal } from '@/domains/trainer/components/TraineeAssignmentModal'

// Helper functions
function getEquipmentHe(equipment: string): string {
  const map: Record<string, string> = {
    barbell: 'מוט ברזל',
    dumbbell: 'משקולות',
    bodyweight: 'משקל גוף',
    pull_up_bar: 'מתח',
    cable_machine: 'כבלים',
    kettlebell: 'קטלבל',
    machine: 'מכונה',
    smit_machine: 'סמיט',
    bench: 'ספסל',
    resistance_band: 'גומייה',
  }
  return map[equipment] || equipment
}


export interface ProgramDayExerciseInfo {
  exerciseId: string
  dayLetter: string
}

export interface ExerciseLibraryProps {
  programMode?: boolean
  programExerciseIds?: string[]
  onProgramExerciseToggle?: (exercise: Exercise, isAdding: boolean) => void
  onProgramBack?: () => void
  targetUserId?: string // When building program for trainee, pass trainee's uid to show their history tags
  programOtherDaysExercises?: ProgramDayExerciseInfo[] // Exercises from other days in the same program
  initialMuscleFilter?: string // Pre-select muscle filter (e.g. from trainer's muscle analysis)
  initialSubMuscleFilter?: string // Pre-select sub-muscle filter
  onProgramReorder?: (orderedExerciseIds: string[]) => void // Callback to reorder exercises in program day
}

export function ExerciseLibrary({
  programMode = false,
  programExerciseIds = [],
  onProgramExerciseToggle,
  onProgramBack,
  targetUserId,
  programOtherDaysExercises = [],
  initialMuscleFilter,
  initialSubMuscleFilter,
  onProgramReorder,
}: ExerciseLibraryProps = {}) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isAddingToWorkout = !programMode && searchParams.get('addToWorkout') === 'true'
  const fromAnalysis = searchParams.get('fromAnalysis') === 'true'
  const initialMuscle = searchParams.get('muscle')
  const initialSubMuscle = searchParams.get('subMuscle')
  const user = useEffectiveUser()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>(defaultMuscleMapping)
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})
  const [equipmentOptions, setEquipmentOptions] = useState<{ id: string; label: string }[]>([
    { id: 'all', label: 'הכל' },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Initialize filters from URL params or props (props take priority for programMode)
  const [selectedPrimaryMuscle, setSelectedPrimaryMuscle] = useState<string>(
    initialMuscleFilter || (fromAnalysis && initialMuscle ? initialMuscle : 'all')
  )
  const [selectedSubMuscle, setSelectedSubMuscle] = useState<string>(
    initialSubMuscleFilter || (fromAnalysis && initialSubMuscle && initialSubMuscle !== initialMuscle ? initialSubMuscle : 'all')
  )
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [imageModal, setImageModal] = useState<{ url: string; name: string; instructionsHe: string[] } | null>(null)
  const [recentlyDoneExerciseIds, setRecentlyDoneExerciseIds] = useState<Set<string>>(new Set())
  const [weeklyMuscleSets, setWeeklyMuscleSets] = useState<Map<string, number>>(new Map())
  const [isScheduleForLater, setIsScheduleForLater] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const isFirstRender = useRef(true)

  const { selectedExercises, addExercise, addExercisesFromSet, removeExercise, clearWorkout, scheduledDate, setScheduledDate, sortExercises, setExerciseSetCount, quickPlanSections, activeQuickPlanSectionId, addQuickPlanSection, updateQuickPlanSectionTitle, removeQuickPlanSection, setActiveQuickPlanSection, setSelfStandaloneProgram, workoutName: builderWorkoutName } = useWorkoutBuilderStore()
  const [exerciseOrder, setExerciseOrder] = useState<Record<string, number>>({})
  const [activeTab, setActiveTab] = useState<'library' | 'quickPlan'>('library')

  // Trainer assignment modal state
  const isTrainer = user?.role === 'trainer' || user?.role === 'admin'
  const [showTraineeAssignment, setShowTraineeAssignment] = useState(false)
  const assignmentDecisionMade = useRef(false)

  // Program mode: computed selection state
  const effectiveSelectedIds = useMemo(() => {
    if (programMode) return new Set(programExerciseIds)
    return new Set(selectedExercises.map(e => e.exerciseId))
  }, [programMode, programExerciseIds, selectedExercises])

  const effectiveCount = programMode ? programExerciseIds.length : selectedExercises.length

  // Program mode: lookup for exercises in other days of the program
  const otherDaysMap = useMemo(() => {
    if (!programMode || programOtherDaysExercises.length === 0) return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const entry of programOtherDaysExercises) {
      const existing = map.get(entry.exerciseId)
      if (existing) {
        if (!existing.includes(entry.dayLetter)) existing.push(entry.dayLetter)
      } else {
        map.set(entry.exerciseId, [entry.dayLetter])
      }
    }
    return map
  }, [programMode, programOtherDaysExercises])

  // Helper: Check if today is selected (no date or date equals today)
  const isTodaySelected = useMemo(() => {
    if (!scheduledDate) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(scheduledDate)
    selected.setHours(0, 0, 0, 0)
    return selected.getTime() === today.getTime()
  }, [scheduledDate])

  // Helper: Check if this is a planned workout (future date OR user chose to plan for today)
  const isPlannedWorkout = useMemo(() => {
    // User chose to schedule for later today
    if (isScheduleForLater && isTodaySelected) return true
    // Future date selected
    if (!scheduledDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(scheduledDate)
    selected.setHours(0, 0, 0, 0)
    return selected > today
  }, [scheduledDate, isScheduleForLater, isTodaySelected])

  // Helper: Format date for input
  const formatDateForInput = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  // Helper: Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Helper: Format date in Hebrew for display
  const formatDateHe = (date: Date) => {
    const day = date.getDate()
    const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']
    const month = months[date.getMonth()]
    return `${day} ב${month}`
  }

  // Workout mode: 'now' | 'today' | 'date'
  type WorkoutMode = 'now' | 'today' | 'date'
  const workoutMode: WorkoutMode = useMemo(() => {
    if (scheduledDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selected = new Date(scheduledDate)
      selected.setHours(0, 0, 0, 0)
      if (selected.getTime() === today.getTime()) {
        return isScheduleForLater ? 'today' : 'now'
      }
      return 'date'
    }
    return isScheduleForLater ? 'today' : 'now'
  }, [scheduledDate, isScheduleForLater])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        let [exercisesData, musclesData, muscleNamesMapping, equipmentData] = await Promise.all([
          exerciseService.getExercises(),
          getMuscles(),
          getMuscleIdToNameHeMap(),
          getEquipment(),
        ] as const)
        if (cancelled) return
        const fixedIds = await autoFixEquipmentMismatch(exercisesData)
        if (cancelled) return
        if (fixedIds.length > 0) {
          const fixedSet = new Set(fixedIds)
          exercisesData = exercisesData.map((ex) =>
            fixedSet.has(ex.id) ? { ...ex, equipment: 'smit_machine' as const } : ex
          )
        }
        setExercises(exercisesData)
        setMuscles([...musclesData].sort((a, b) => a.nameHe.trim().localeCompare(b.nameHe.trim(), 'he')))
        setDynamicMuscleNames(muscleNamesMapping)
        setEquipmentOptions([
          { id: 'all', label: 'הכל' },
          ...[
            ...equipmentData.map((eq) => ({ id: eq.id, label: eq.nameHe })),
            { id: 'graviton', label: 'גרביטון' },
          ].sort((a, b) => a.label.trim().localeCompare(b.label.trim(), 'he')),
        ])
      } catch (error) {
        if (!cancelled) console.error('Failed to load data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Reset sub-muscle when primary muscle changes (skip on first render to preserve URL params)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSelectedSubMuscle('all')
  }, [selectedPrimaryMuscle])

  // Auto-open date picker when modal shows (desktop fix)
  useEffect(() => {
    if (showDatePicker && dateInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        dateInputRef.current?.showPicker?.()
      }, 100)
    }
  }, [showDatePicker])

  // Load recently done exercises and last month exercises in background (non-blocking)
  // When targetUserId is provided (e.g., building program for trainee), use that instead of current user
  const historyUserId = targetUserId || user?.uid
  // Check if scheduledDate is in a different week (future week)
  const isScheduledInDifferentWeek = useMemo(() => {
    if (!scheduledDate) return false
    const now = new Date()
    const startOfCurrentWeek = new Date(now)
    startOfCurrentWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfCurrentWeek.setHours(0, 0, 0, 0)
    const endOfCurrentWeek = new Date(startOfCurrentWeek)
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 7) // Next Sunday
    const selected = new Date(scheduledDate)
    selected.setHours(0, 0, 0, 0)
    return selected >= endOfCurrentWeek
  }, [scheduledDate])

  useEffect(() => {
    if (historyUserId && !loading && exercises.length > 0) {
      // If scheduled for a future week, no sets data needed (will show 0/10)
      if (isScheduledInDifferentWeek) {
        setRecentlyDoneExerciseIds(new Set())
        setWeeklyMuscleSets(new Map())
        return
      }

      // Build exercise lookup keyed by exerciseId → category (not primaryMuscle)
      // so weekly sets are aggregated at the muscle group level
      const exerciseLookup = new Map<string, { primaryMuscle: string }>()
      for (const ex of exercises) {
        exerciseLookup.set(ex.id, { primaryMuscle: ex.category })
      }

      // Load both in parallel
      Promise.all([
        getRecentlyDoneExerciseIds(historyUserId),
        getWeeklyMuscleSets(historyUserId, exerciseLookup)
      ])
        .then(([recentIds, muscleSets]) => {
          setRecentlyDoneExerciseIds(recentIds)
          setWeeklyMuscleSets(muscleSets)
        })
        .catch(err => console.error('Failed to load exercise history:', err))
    }
  }, [historyUserId, loading, exercises, isScheduledInDifferentWeek])

  // Get selected muscle name in Hebrew
  const selectedMuscleName = useMemo(() => {
    if (selectedPrimaryMuscle === 'all') return 'כל השרירים'
    const muscle = muscles.find(m => m.id === selectedPrimaryMuscle)
    return muscle?.nameHe || selectedPrimaryMuscle
  }, [selectedPrimaryMuscle, muscles])

  // Get sub-muscles for selected primary muscle
  const availableSubMuscles = useMemo(() => {
    if (selectedPrimaryMuscle === 'all') return []
    const primaryMuscle = muscles.find(m => m.id === selectedPrimaryMuscle)
    return [...(primaryMuscle?.subMuscles || [])].sort((a, b) => a.nameHe.trim().localeCompare(b.nameHe.trim(), 'he'))
  }, [selectedPrimaryMuscle, muscles])

  // Set of all available exercise IDs (for RecommendedSets accuracy)
  const availableExerciseIds = useMemo(
    () => new Set(exercises.map((e) => e.id)),
    [exercises]
  )

  // Filter and sort exercises (Hebrew A-Z)
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((ex) => {
        // Primary muscle filter — also match if selectedPrimaryMuscle is in secondaryMuscles
        if (selectedPrimaryMuscle !== 'all') {
          const exercisePrimaryMuscle = ex.primaryMuscle || ex.category
          const matchesPrimary = exercisePrimaryMuscle === selectedPrimaryMuscle || ex.category === selectedPrimaryMuscle
          const matchesSecondary = ex.secondaryMuscles?.includes(selectedPrimaryMuscle as MuscleGroup)
          if (!matchesPrimary && !matchesSecondary) {
            return false
          }
        }

        // Sub-muscle filter
        if (selectedSubMuscle !== 'all') {
          if (ex.primaryMuscle !== selectedSubMuscle && !ex.secondaryMuscles.includes(selectedSubMuscle as MuscleGroup)) {
            return false
          }
        }

        // Equipment filter
        if (selectedEquipment !== 'all') {
          if (selectedEquipment === 'graviton') {
            if (!ex.assistanceTypes?.includes('graviton')) return false
          } else if (ex.equipment !== selectedEquipment) {
            return false
          }
        }

        return true
      })
      // Sort by Hebrew name (A-Z) - trim whitespace for consistent sorting
      .sort((a, b) => (a.nameHe || '').trim().localeCompare((b.nameHe || '').trim(), 'he'))
  }, [exercises, selectedPrimaryMuscle, selectedSubMuscle, selectedEquipment])

  // Selected exercises grouped by muscle for the top section
  const selectedExercisesGrouped = useMemo(() => {
    if (effectiveSelectedIds.size === 0) return []

    // Get full Exercise objects for selected exercises
    const selectedFull = exercises.filter(ex => effectiveSelectedIds.has(ex.id))

    // Split into numbered (user-assigned order) and unnumbered
    const numbered = selectedFull.filter(ex => exerciseOrder[ex.id] !== undefined)
    const unnumbered = selectedFull.filter(ex => exerciseOrder[ex.id] === undefined)

    // Numbered: sorted by user number, shown as a single group at top
    numbered.sort((a, b) => (exerciseOrder[a.id] || 0) - (exerciseOrder[b.id] || 0))

    // Unnumbered: group by category, sort within by Hebrew name A-Z
    const groups = new Map<string, Exercise[]>()
    for (const ex of unnumbered) {
      const cat = ex.category || 'other'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(ex)
    }
    for (const exList of groups.values()) {
      exList.sort((a, b) => (a.nameHe || '').trim().localeCompare((b.nameHe || '').trim(), 'he'))
    }

    const unnumberedGroups = Array.from(groups.entries())
      .map(([cat, exList]) => ({
        category: cat,
        categoryNameHe: getMuscleNameHe(cat, dynamicMuscleNames),
        exercises: exList,
      }))
      .sort((a, b) => a.categoryNameHe.trim().localeCompare(b.categoryNameHe.trim(), 'he'))

    if (numbered.length > 0) {
      return [
        { category: '__ordered__', categoryNameHe: '', exercises: numbered },
        ...unnumberedGroups,
      ]
    }
    return unnumberedGroups
  }, [exercises, effectiveSelectedIds, dynamicMuscleNames, exerciseOrder])

  // Unselected exercises from the filtered list (to avoid duplication with selected section)
  const unselectedFilteredExercises = useMemo(() => {
    return filteredExercises.filter(ex => !effectiveSelectedIds.has(ex.id))
  }, [filteredExercises, effectiveSelectedIds])

  const handleToggleExercise = (exercise: Exercise) => {
    if (programMode) {
      const isSelected = effectiveSelectedIds.has(exercise.id)
      if (isSelected) {
        setExerciseOrder(prev => { const next = { ...prev }; delete next[exercise.id]; return next })
      }
      onProgramExerciseToggle?.(exercise, !isSelected)
      return
    }
    // Quick Plan: must have an active section to add exercises
    if (activeTab === 'quickPlan' && !activeQuickPlanSectionId) {
      return // Can't add without a section
    }
    const isSelected = selectedExercises.some((e) => e.exerciseId === exercise.id)
    if (isSelected) {
      setExerciseOrder(prev => { const next = { ...prev }; delete next[exercise.id]; return next })
      removeExercise(exercise.id)
    } else {
      addExercise({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        primaryMuscle: exercise.primaryMuscle || exercise.category,
        category: exercise.category,
        equipment: exercise.equipment,
        complexity: exercise.complexity,
        reportType: exercise.reportType,
        assistanceTypes: exercise.assistanceTypes,   // Pass assistance options
        availableBands: exercise.availableBands,     // Pass available bands
        // Quick Plan: explicitly assign to active section
        ...(activeTab === 'quickPlan' && activeQuickPlanSectionId ? { quickPlanSectionId: activeQuickPlanSectionId } : {}),
      })
    }
  }

  const handleSelectSet = (exerciseIds: string[]) => {
    const exercisesToAdd = exercises.filter((ex) => exerciseIds.includes(ex.id))
    const mapped = exercisesToAdd.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNameHe: exercise.nameHe,
      imageUrl: exercise.imageUrl,
      primaryMuscle: exercise.primaryMuscle || exercise.category,
      category: exercise.category,
      equipment: exercise.equipment,
      complexity: exercise.complexity,
      reportType: exercise.reportType,
      assistanceTypes: exercise.assistanceTypes,
      availableBands: exercise.availableBands,
    }))
    addExercisesFromSet(mapped)
  }

  // Compute ordered exercise IDs from exerciseOrder state
  const getOrderedExerciseIds = () => {
    const allIds = [...effectiveSelectedIds]
    const numbered = allIds.filter(id => exerciseOrder[id] !== undefined)
      .sort((a, b) => exerciseOrder[a] - exerciseOrder[b])
    const unnumbered = allIds.filter(id => exerciseOrder[id] === undefined)
    return [...numbered, ...unnumbered]
  }

  // Build a default workout name from selected exercises (used when user didn't provide one)
  const buildDefaultWorkoutName = (): string => {
    if (builderWorkoutName?.trim()) return builderWorkoutName.trim()
    const todayHe = new Date().toLocaleDateString('he-IL')
    // Pick up to 2 unique muscle groups for a hint
    const muscleHints = Array.from(
      new Set(
        selectedExercises
          .map((e) => getMuscleNameHe(e.category || e.primaryMuscle || '', dynamicMuscleNames))
          .filter(Boolean)
      )
    ).slice(0, 2)
    return muscleHints.length > 0
      ? `אימון ${muscleHints.join(' + ')} - ${todayHe}`
      : `אימון ${todayHe}`
  }

  // Convert store exercises to ProgramExercise format for trainingPrograms collection
  const toProgramExercisesPayload = (): ProgramExercise[] => {
    return selectedExercises.map((ex, index) => {
      const programEx: ProgramExercise = {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseNameHe: ex.exerciseNameHe,
        imageUrl: ex.imageUrl,
        category: ex.category,
        primaryMuscle: ex.primaryMuscle,
        equipment: ex.equipment,
        complexity: ex.complexity,
        order: index + 1,
        targetSets: ex.customSetCount || ex.sets.length || 3,
        targetReps: '8-12',
        restTime: ex.restTime || 90,
        reportType: ex.reportType,
        assistanceTypes: ex.assistanceTypes as string[] | undefined,
        sectionTitle: ex.sectionTitle,
      }
      return programEx
    })
  }

  // When the trainee builds a workout themselves (immediate or planned),
  // also create a standalone trainingProgram so it shows up in the trainer's
  // "אימונים בודדים" section. Returns the new programId, or null if not applicable.
  const maybeCreateSelfStandaloneProgram = async (): Promise<string | null> => {
    if (!user) return null

    // Skip if user has no linked trainer — nobody would read the trainingPrograms doc.
    // Independent users still get the workoutHistory entry as before.
    if (!user.trainerId) return null

    // Read latest store state to make context-aware decisions
    const state = useWorkoutBuilderStore.getState()

    // Skip if this is a trainer-reported workout (trainer acting on behalf of trainee)
    if (state.reportedBy) return null
    // Skip if a program link already exists (continuing a trainer-assigned program)
    if (state.programId) return null

    try {
      const name = buildDefaultWorkoutName()
      const programExercises = toProgramExercisesPayload()
      const newProgramId = await programService.createSelfStandaloneProgram({
        traineeId: user.uid,
        trainerId: user.trainerId,
        name,
        exercises: programExercises,
      })
      // Link the active workout to this newly-created standalone program
      setSelfStandaloneProgram(newProgramId, name)
      return newProgramId
    } catch (err) {
      // Non-blocking: even if linking fails, the workout itself should still proceed.
      // Failure here only means the trainer won't see the workout in "אימונים בודדים".
      console.warn('Could not create self-standalone trainingProgram link:', err)
      return null
    }
  }

  const handleStartWorkout = async () => {
    if (selectedExercises.length === 0) return

    // Quick Plan: sort exercises by section order, then by primaryMuscle within section
    // Also assign section titles to the first exercise of each section
    if (activeTab === 'quickPlan' && quickPlanSections.length > 0) {
      const sectionOrder = new Map(quickPlanSections.map((s, i) => [s.id, i]))
      const sectionTitleMap = new Map(quickPlanSections.map((s) => [s.id, s.title]))
      const sorted = [...selectedExercises]
        .sort((a, b) => {
          const sectionA = sectionOrder.get(a.quickPlanSectionId || '') ?? 999
          const sectionB = sectionOrder.get(b.quickPlanSectionId || '') ?? 999
          if (sectionA !== sectionB) return sectionA - sectionB
          // Within same section, sort by primaryMuscle
          return (a.primaryMuscle || '').localeCompare(b.primaryMuscle || '')
        })
      // Assign section title to first exercise of each section
      const seenSections = new Set<string>()
      for (const ex of sorted) {
        const sid = ex.quickPlanSectionId
        if (sid && !seenSections.has(sid)) {
          seenSections.add(sid)
          ex.sectionTitle = sectionTitleMap.get(sid) || ''
        } else {
          ex.sectionTitle = undefined
        }
      }
      sortExercises(sorted.map(e => e.exerciseId))
      // Update section titles on store exercises
      const { selectedExercises: currentExercises } = useWorkoutBuilderStore.getState()
      const titleMap = new Map(sorted.map(e => [e.exerciseId, e.sectionTitle]))
      useWorkoutBuilderStore.setState({
        selectedExercises: currentExercises.map(e => ({
          ...e,
          sectionTitle: titleMap.get(e.exerciseId),
        }))
      })
    } else if (Object.keys(exerciseOrder).length > 0) {
      // Apply user-defined order to the store before starting
      sortExercises(getOrderedExerciseIds())
    }

    if (isAddingToWorkout) {
      // Adding exercises to existing workout - DON'T clear localStorage!
      // The useActiveWorkout hook will merge the new exercises
      navigate('/workout/session')
      return
    }

    // Trainer interception: show assignment modal before proceeding
    if (isTrainer && !programMode && !assignmentDecisionMade.current) {
      setShowTraineeAssignment(true)
      return
    }

    // Check if this is a planned workout (future date OR "plan for today" selected)
    if (isPlannedWorkout && user) {
      setSaving(true)
      try {
        // Use scheduledDate if set, otherwise use today's date (for "plan for today")
        const workoutDate = scheduledDate || new Date()

        // First, mirror this workout as a standalone trainingProgram so the trainer
        // sees it in "אימונים בודדים" alongside the planned workoutHistory entry.
        const linkedProgramId = await maybeCreateSelfStandaloneProgram()

        // Create planned workout entry (linked to the standalone program if one was created)
        const plannedWorkout: Omit<WorkoutHistoryEntry, 'id'> = {
          userId: user.uid,
          name: buildDefaultWorkoutName(),
          date: workoutDate,
          startTime: workoutDate,
          endTime: workoutDate,
          duration: 0,
          status: 'planned',
          exercises: selectedExercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName || '',
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl || '',
            category: ex.category || '',
            isCompleted: false,
            sets: [
              {
                type: 'working' as const,
                targetReps: 10,
                targetWeight: 0,
                actualReps: 0,
                actualWeight: 0,
                completed: false,
              }
            ],
          })),
          completedExercises: 0,
          totalExercises: selectedExercises.length,
          completedSets: 0,
          totalSets: selectedExercises.length,
          totalVolume: 0,
          personalRecords: 0,
          ...(linkedProgramId && {
            source: 'self_standalone' as const,
            programId: linkedProgramId,
          }),
        }

        await saveWorkoutHistory(plannedWorkout)
        clearWorkout()
        setScheduledDate(null)
        setIsScheduleForLater(false)
        navigate('/workout/history')
      } catch (error) {
        console.error('Failed to save planned workout:', error)
      } finally {
        setSaving(false)
      }
      return
    }

    // Immediate workout: mirror to standalone trainingProgram before starting,
    // so the link travels through to workoutHistory via the store.
    await maybeCreateSelfStandaloneProgram()

    // Starting fresh workout today - clear any existing saved workout
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
    navigate('/workout/session')
  }

  // Trainer assignment: user chose to assign to a trainee
  const handleTraineeAssigned = async (traineeId: string, traineeName: string) => {
    setShowTraineeAssignment(false)
    if (!user) return

    setSaving(true)
    try {
      // Build the day structure from selected exercises (same as StandaloneWorkoutEditor)
      const programExercises = toProgramExercisesPayload()
      const cleanExercises = programExercises.map((ex) => {
        const clean: Record<string, unknown> = {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          order: ex.order,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restTime: ex.restTime,
        }
        if (ex.imageUrl) clean.imageUrl = ex.imageUrl
        if (ex.category) clean.category = ex.category
        if (ex.primaryMuscle) clean.primaryMuscle = ex.primaryMuscle
        if (ex.equipment) clean.equipment = ex.equipment
        if (ex.reportType) clean.reportType = ex.reportType
        if (ex.assistanceTypes && ex.assistanceTypes.length > 0) clean.assistanceTypes = ex.assistanceTypes
        if (ex.sectionTitle) clean.sectionTitle = ex.sectionTitle
        return clean
      })

      const workoutName = builderWorkoutName || buildDefaultWorkoutName()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanDay: any = {
        dayLabel: workoutName,
        name: workoutName,
        exercises: cleanExercises,
        restDay: false,
      }

      // Create standalone program via the existing trainer module path
      const trainerName = user.displayName || user.firstName || 'מאמן'
      const newProgramId = await programService.createProgram({
        trainerId: user.uid,
        traineeId,
        originalTrainerId: user.uid,
        trainerName,
        name: workoutName,
        type: 'standalone',
        status: 'active',
        isModifiedByTrainee: false,
        weeklyStructure: [cleanDay],
        startDate: new Date(),
        currentWeek: 1,
      })

      // Also create a planned workoutHistory entry for the trainee,
      // so the workout shows up in their "recent workouts" screen and in
      // the trainer's "standalone workouts" section as a pending item.
      const now = new Date()
      await saveWorkoutHistory({
        userId: traineeId,
        reportedBy: user.uid,
        reportedByName: trainerName,
        name: workoutName,
        date: now,
        startTime: now,
        endTime: now,
        duration: 0,
        status: 'planned',
        exercises: selectedExercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName || '',
          exerciseNameHe: ex.exerciseNameHe,
          imageUrl: ex.imageUrl || '',
          category: ex.category || '',
          isCompleted: false,
          sets: [
            {
              type: 'working' as const,
              targetReps: 10,
              targetWeight: 0,
              actualReps: 0,
              actualWeight: 0,
              completed: false,
            },
          ],
        })),
        completedExercises: 0,
        totalExercises: selectedExercises.length,
        completedSets: 0,
        totalSets: selectedExercises.length,
        totalVolume: 0,
        personalRecords: 0,
        source: 'trainer_program',
        programId: newProgramId,
      })

      toast.success(`האימון שויך ל${traineeName}`)
    } catch (err) {
      console.error('Failed to assign workout to trainee:', err)
      toast.error('שגיאה בשיוך האימון למתאמן')
    } finally {
      setSaving(false)
    }

    // Now continue with the trainer's own workout flow
    assignmentDecisionMade.current = true
    handleStartWorkout()
  }

  // Trainer assignment: user chose to skip (workout for themselves only)
  const handleTraineeAssignmentSkip = () => {
    setShowTraineeAssignment(false)
    assignmentDecisionMade.current = true
    handleStartWorkout()
  }

  const handleImageClick = (e: React.MouseEvent, exercise: Exercise) => {
    e.stopPropagation()
    if (exercise.imageUrl) {
      setImageModal({ url: exercise.imageUrl, name: exercise.nameHe, instructionsHe: exercise.instructionsHe || [] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <header style={{ flexShrink: 0, marginBottom: 16 }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (programMode || onProgramBack) ? onProgramBack?.() : navigate(isAddingToWorkout ? '/workout/session' : fromAnalysis ? '/analysis?scrollToDetail=true' : '/dashboard')}
              className={`flex items-center gap-1 transition-colors ${fromAnalysis ? 'text-status-error font-bold hover:text-red-300' : 'text-text-secondary hover:text-white'}`}
            >
              <ChevronRight className="w-5 h-5" />
              <span className="text-sm">{programMode ? 'חזרה לאימון' : onProgramBack ? 'חזרה לאימון' : isAddingToWorkout ? 'חזרה לאימון' : fromAnalysis ? 'חזרה לניתוח' : 'חזור'}</span>
            </button>
            <h1 className="text-xl font-bold text-white">
              {programMode ? 'בחירת תרגילים לאימון' : isAddingToWorkout ? 'הוספת תרגילים לאימון' : 'בחירת תרגילים'}
            </h1>
          </div>

          {/* Tab Toggle: Library / Quick Plan */}
          {!programMode && !isAddingToWorkout && (
            <div className="mt-3 flex gap-1 rounded-xl bg-surface-container p-1">
              <button
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'library'
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                אימון
              </button>
              <button
                onClick={() => setActiveTab('quickPlan')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'quickPlan'
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                תכנון חופשי
              </button>
            </div>
          )}

          {/* Workout Mode Selection - 3 buttons in one row */}
          {!isAddingToWorkout && !programMode && !onProgramBack && activeTab === 'library' && (
            <div
              className="mt-3"
              style={{
                display: 'flex',
                gap: '4px',
                background: '#0d1f35',
                borderRadius: '12px',
                padding: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                flexWrap: 'nowrap',
              }}
            >
              {/* עכשיו */}
              <button
                onClick={() => {
                  setScheduledDate(null)
                  setIsScheduleForLater(false)
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '10px 2px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  background: workoutMode === 'now' ? 'rgba(0,191,165,0.15)' : 'transparent',
                  color: workoutMode === 'now' ? '#00bfa5' : 'rgba(255,255,255,0.6)',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${workoutMode === 'now' ? '#00bfa5' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {workoutMode === 'now' && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00bfa5' }} />
                  )}
                </div>
                <span>עכשיו</span>
              </button>

              {/* להיום */}
              <button
                onClick={() => {
                  setScheduledDate(null)
                  setIsScheduleForLater(true)
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '10px 2px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  background: workoutMode === 'today' ? 'rgba(249,115,22,0.15)' : 'transparent',
                  color: workoutMode === 'today' ? '#f97316' : 'rgba(255,255,255,0.6)',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${workoutMode === 'today' ? '#f97316' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {workoutMode === 'today' && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316' }} />
                  )}
                </div>
                <span>להיום</span>
              </button>

              {/* תאריך */}
              <button
                onClick={() => setShowDatePicker(true)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '10px 2px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  background: workoutMode === 'date' ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: workoutMode === 'date' ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: `2px solid ${workoutMode === 'date' ? '#a78bfa' : 'rgba(255,255,255,0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {workoutMode === 'date' && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa' }} />
                  )}
                </div>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {workoutMode === 'date' && scheduledDate
                    ? formatDateHe(scheduledDate)
                    : '📅 תאריך'
                  }
                </span>
              </button>
            </div>
          )}

          {/* Hidden Date Picker Modal */}
          {showDatePicker && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setShowDatePicker(false)}
            >
              <div
                className="bg-background-card rounded-xl p-4 max-w-xs w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-white text-lg font-semibold mb-4 text-center">בחר תאריך</h3>
                <input
                  ref={dateInputRef}
                  type="date"
                  min={getMinDate()}
                  value={formatDateForInput(scheduledDate) || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedDate = new Date(e.target.value)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      selectedDate.setHours(0, 0, 0, 0)
                      setScheduledDate(selectedDate)
                      setIsScheduleForLater(false)
                      setShowDatePicker(false)
                    }
                  }}
                  onClick={() => {
                    // Open native date picker on click (for desktop)
                    dateInputRef.current?.showPicker?.()
                  }}
                  className="w-full p-3 rounded-lg bg-background-elevated text-white border border-border-default cursor-pointer"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-full mt-3 p-3 rounded-lg bg-background-elevated text-text-secondary hover:text-white transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content - extra padding for fixed footer + safe area */}
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="max-w-2xl mx-auto">
          {/* Quick Plan: Sections with exercises */}
          {activeTab === 'quickPlan' && !programMode && !isAddingToWorkout && (
            <div className="mb-4">
              <QuickPlanExerciseList
                sections={quickPlanSections}
                exercises={selectedExercises}
                activeSectionId={activeQuickPlanSectionId}
                onAddSection={addQuickPlanSection}
                onUpdateSectionTitle={updateQuickPlanSectionTitle}
                onRemoveSection={removeQuickPlanSection}
                onSetActiveSection={setActiveQuickPlanSection}
                onSetCountChange={setExerciseSetCount}
                onRemoveExercise={removeExercise}
              />
            </div>
          )}

          {/* Muscle Title with Count */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              {selectedMuscleName} ({filteredExercises.length} תרגילים)
            </h2>
          </div>

          {/* Primary Muscle Filter */}
          <div className="mb-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedPrimaryMuscle('all')}
                className={selectedPrimaryMuscle === 'all' ? 'pill-active' : 'pill-default'}
              >
                הכל
              </button>
              {muscles.map((muscle) => (
                <button
                  key={muscle.id}
                  onClick={() => setSelectedPrimaryMuscle(muscle.id)}
                  className={selectedPrimaryMuscle === muscle.id ? 'pill-active' : 'pill-default'}
                >
                  <MuscleIcon icon={muscle.icon} size={20} />
                  <span>{muscle.nameHe}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Muscle Filter */}
          {selectedPrimaryMuscle !== 'all' && availableSubMuscles.length > 0 && (
            <div className="mb-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedSubMuscle('all')}
                  className={selectedSubMuscle === 'all' ? 'pill-active' : 'pill-default'}
                >
                  הכל
                </button>
                {availableSubMuscles.map((subMuscle) => (
                  <button
                    key={subMuscle.id}
                    onClick={() => setSelectedSubMuscle(subMuscle.id)}
                    className={`${selectedSubMuscle === subMuscle.id ? 'pill-active' : 'pill-default'} flex flex-col items-center`}
                  >
                    <span>{subMuscle.nameHe}</span>
                    {subMuscle.nameEn && (
                      <span className="text-[10px] opacity-60">{subMuscle.nameEn}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Filter - Smaller font */}
          <div className="mb-4">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {equipmentOptions.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedEquipment === eq.id
                      ? 'bg-primary-main text-background-main'
                      : 'bg-background-card border border-border-default text-text-secondary hover:text-white'
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Sets */}
          {!loading && !programMode && activeTab === 'library' && (
            <RecommendedSets
              muscleGroup={selectedPrimaryMuscle}
              onSelectSet={handleSelectSet}
              selectedExerciseIds={selectedExercises.map((e) => e.exerciseId)}
              availableExerciseIds={availableExerciseIds}
            />
          )}

          {/* Exercise List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner"></div>
            </div>
          ) : filteredExercises.length === 0 && selectedExercisesGrouped.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-lg font-semibold text-white mb-2">לא נמצאו תרגילים</h3>
              <p className="text-text-muted">נסה לשנות את הפילטרים</p>
            </div>
          ) : (
            <>
              {/* Selected Exercises Section - always on top, grouped by muscle (hidden in Quick Plan mode) */}
              {selectedExercisesGrouped.length > 0 && activeTab === 'library' && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-primary-main mb-2">
                    נבחרו ({effectiveCount})
                  </h3>
                  <div className="space-y-3">
                    {selectedExercisesGrouped.map((group) => (
                      <div key={group.category}>
                        {group.category !== '__ordered__' && (
                          <p className="text-xs text-on-surface-variant mb-1 font-medium">{group.categoryNameHe}</p>
                        )}
                        <div className="space-y-1.5">
                          {group.exercises.map((exercise) => {
                            const wasInLastWorkout = recentlyDoneExerciseIds.has(exercise.id)
                            const otherDayLetters = otherDaysMap.get(exercise.id)
                            const WEEKLY_SETS_TARGET = 10
                            const STRENGTH_CATEGORIES = new Set(['legs', 'chest', 'back', 'shoulders', 'biceps_brachii', 'triceps', 'core'])
                            const currentWeeklySets = weeklyMuscleSets.get(exercise.category) || 0
                            const isStrengthCategory = STRENGTH_CATEGORIES.has(exercise.category)
                            const showRecommended = !wasInLastWorkout && isStrengthCategory && currentWeeklySets < WEEKLY_SETS_TARGET
                            const showWeeklySets = !wasInLastWorkout && isStrengthCategory && currentWeeklySets >= WEEKLY_SETS_TARGET
                            return (
                              <div
                                key={exercise.id}
                                onClick={() => handleToggleExercise(exercise)}
                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all bg-primary-main/10 border-2 border-primary-main"
                              >
                                {/* Checkbox */}
                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary-main">
                                  <Check className="w-4 h-4 text-background-main" strokeWidth={3} />
                                </div>

                                {/* Exercise Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold text-white truncate">{exercise.nameHe}</h3>
                                    {exercise.assistanceTypes && exercise.assistanceTypes.length > 0 && (
                                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full flex-shrink-0">
                                        גמיש
                                      </span>
                                    )}
                                    {wasInLastWorkout ? (
                                      <span className="badge-last-workout flex-shrink-0">אחרון</span>
                                    ) : showRecommended ? (
                                      <span className="badge-recommended flex-shrink-0">מומלץ {currentWeeklySets}/{WEEKLY_SETS_TARGET}</span>
                                    ) : showWeeklySets ? (
                                      <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-status-success/20 text-status-success flex-shrink-0">{currentWeeklySets}/{WEEKLY_SETS_TARGET}</span>
                                    ) : null}
                                    {otherDayLetters && otherDayLetters.map((letter) => (
                                      <span
                                        key={letter}
                                        className="px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple text-[10px] rounded-full flex-shrink-0 font-bold"
                                      >
                                        יום {letter}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-on-surface-variant truncate">
                                    {getMuscleNameHe(exercise.primaryMuscle, dynamicMuscleNames)} • {getEquipmentHe(exercise.equipment)}
                                  </p>
                                </div>

                                {/* Image */}
                                <div
                                  onClick={(e) => handleImageClick(e, exercise)}
                                  className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-background-elevated"
                                >
                                  <img
                                    src={getExerciseImageUrl(exercise)}
                                    alt={exercise.nameHe}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.onerror = null
                                      target.src = EXERCISE_PLACEHOLDER_IMAGE
                                    }}
                                  />
                                </div>

                                {/* Order number input */}
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={exerciseOrder[exercise.id] ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '') {
                                      setExerciseOrder(prev => { const next = { ...prev }; delete next[exercise.id]; return next })
                                    } else {
                                      const num = parseInt(val)
                                      if (num >= 1 && num <= 99) {
                                        setExerciseOrder(prev => ({ ...prev, [exercise.id]: num }))
                                      }
                                    }
                                  }}
                                  className="w-10 h-10 text-center rounded-lg bg-background-elevated border border-border-default text-primary-main font-bold text-sm focus:border-primary-main focus:outline-none flex-shrink-0"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Divider between selected and unselected */}
                  {unselectedFilteredExercises.length > 0 && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border-default" />
                      <span className="text-xs text-on-surface-variant">תרגילים נוספים</span>
                      <div className="flex-1 h-px bg-border-default" />
                    </div>
                  )}
                </div>
              )}

              {/* Unselected Exercises */}
              <div className="space-y-2">
                {unselectedFilteredExercises.map((exercise) => {
                  const isSelected = effectiveSelectedIds.has(exercise.id)
                  const wasInLastWorkout = recentlyDoneExerciseIds.has(exercise.id)
                  const otherDayLetters = otherDaysMap.get(exercise.id)

                  // Weekly sets badge: show for all strength categories
                  const WEEKLY_SETS_TARGET = 10
                  const STRENGTH_CATEGORIES = new Set(['legs', 'chest', 'back', 'shoulders', 'biceps_brachii', 'triceps', 'core'])
                  const currentWeeklySets = weeklyMuscleSets.get(exercise.category) || 0
                  const isStrengthCategory = STRENGTH_CATEGORIES.has(exercise.category)
                  const showRecommended = !wasInLastWorkout && isStrengthCategory && currentWeeklySets < WEEKLY_SETS_TARGET
                  const showWeeklySets = !wasInLastWorkout && isStrengthCategory && currentWeeklySets >= WEEKLY_SETS_TARGET
                  return (
                    <div
                      key={exercise.id}
                      onClick={() => handleToggleExercise(exercise)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary-main/10 border-2 border-primary-main'
                          : 'bg-background-card border border-border-default hover:border-border-light'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-primary-main'
                          : 'border-2 border-border-light'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-background-main" strokeWidth={3} />}
                      </div>

                      {/* Exercise Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white truncate">{exercise.nameHe}</h3>
                          {/* Flexible exercise tag */}
                          {exercise.assistanceTypes && exercise.assistanceTypes.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full flex-shrink-0">
                              גמיש
                            </span>
                          )}
                          {/* Priority: "אחרון" > "מומלץ X/10" > "X/10" (target met) */}
                          {wasInLastWorkout ? (
                            <span className="badge-last-workout flex-shrink-0">אחרון</span>
                          ) : showRecommended ? (
                            <span className="badge-recommended flex-shrink-0">מומלץ {currentWeeklySets}/{WEEKLY_SETS_TARGET}</span>
                          ) : showWeeklySets ? (
                            <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-status-success/20 text-status-success flex-shrink-0">{currentWeeklySets}/{WEEKLY_SETS_TARGET}</span>
                          ) : null}
                          {/* Program: tags for other days that already include this exercise */}
                          {otherDayLetters && otherDayLetters.map((letter) => (
                            <span
                              key={letter}
                              className="px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple text-[10px] rounded-full flex-shrink-0 font-bold"
                            >
                              יום {letter}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-on-surface-variant truncate">
                          {getMuscleNameHe(exercise.primaryMuscle, dynamicMuscleNames)} • {getEquipmentHe(exercise.equipment)}
                        </p>
                      </div>

                      {/* Image */}
                      <div
                        onClick={(e) => handleImageClick(e, exercise)}
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-background-elevated"
                      >
                        <img
                          src={getExerciseImageUrl(exercise)}
                          alt={exercise.nameHe}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.onerror = null
                            target.src = EXERCISE_PLACEHOLDER_IMAGE
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer - Fixed at bottom with safe area support */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-[100] bg-background-main border-t border-border-default"
        style={{
          padding: '12px 16px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-2xl mx-auto">
          {programMode ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (Object.keys(exerciseOrder).length > 0 && onProgramReorder) {
                    onProgramReorder(getOrderedExerciseIds())
                  }
                  onProgramBack?.()
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>סיום ({effectiveCount} תרגילים)</span>
              </button>
              <span className="text-white font-semibold">
                {effectiveCount > 0
                  ? `${effectiveCount} תרגילים נבחרו`
                  : 'בחר תרגילים'
                }
              </span>
            </div>
          ) : !programMode && onProgramBack ? (
            /* Standalone trainer mode — show "Done" button that goes back to editor */
            <div className="flex items-center justify-between">
              <button
                onClick={() => onProgramBack?.()}
                disabled={selectedExercises.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                <span>סיום ({selectedExercises.length} תרגילים)</span>
              </button>
              <span className="text-white font-semibold">
                {selectedExercises.length > 0
                  ? `${selectedExercises.length} תרגילים נבחרו`
                  : 'בחר תרגילים'
                }
              </span>
            </div>
          ) : (
          <div className="flex items-center justify-between">
            {/* Start Workout Button - Left side with mode-specific styling */}
            <button
              onClick={handleStartWorkout}
              disabled={selectedExercises.length === 0 || saving}
              className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                selectedExercises.length === 0 || saving
                  ? 'bg-secondary-main text-text-disabled cursor-not-allowed'
                  : workoutMode === 'now'
                    ? 'text-white hover:scale-105'
                    : workoutMode === 'today'
                      ? 'text-white hover:scale-105'
                      : 'text-white hover:scale-105'
              }`}
              style={selectedExercises.length > 0 && !saving ? {
                background: workoutMode === 'now' ? '#00bfa5' : workoutMode === 'today' ? '#f97316' : '#a78bfa',
                boxShadow: workoutMode === 'now'
                  ? '0 4px 0 #0A0C10, 0 0 12px rgba(0, 191, 165, 0.5)'
                  : workoutMode === 'today'
                    ? '0 4px 0 #0A0C10, 0 0 12px rgba(249, 115, 22, 0.5)'
                    : '0 4px 0 #0A0C10, 0 0 12px rgba(167, 139, 250, 0.5)'
              } : {}}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>שומר...</span>
                </>
              ) : isAddingToWorkout ? (
                <>
                  <span>+</span>
                  <span>הוסף לאימון ({selectedExercises.length})</span>
                </>
              ) : workoutMode === 'now' ? (
                <>
                  <Home className="w-5 h-5" />
                  <span>התחל אימון ({selectedExercises.length})</span>
                </>
              ) : workoutMode === 'today' ? (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>שמור להיום ({selectedExercises.length})</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>שמור אימון ({selectedExercises.length})</span>
                </>
              )}
            </button>

            {/* Selected Count - Right side */}
            <div className="flex items-center gap-4">
              {selectedExercises.length > 0 && (
                <button
                  onClick={() => {
                    clearWorkout()
                    setScheduledDate(null)
                    setIsScheduleForLater(false)
                    setExerciseOrder({})
                  }}
                  className="text-status-error text-sm hover:underline"
                >
                  נקה
                </button>
              )}
              <span className="text-white font-semibold">
                {selectedExercises.length > 0
                  ? `${selectedExercises.length} תרגילים נבחרו`
                  : 'בחר תרגילים'
                }
              </span>
            </div>
          </div>
          )}
        </div>
      </footer>

      {/* Image Modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close button - top left for RTL, min 44x44 touch target */}
            <button
              onClick={() => setImageModal(null)}
              className="absolute top-2 left-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/60 text-white text-xl"
              aria-label="סגור תמונה"
            >
              ✕
            </button>
            <img
              src={imageModal.url}
              alt={imageModal.name}
              className="w-full max-h-[60vh] object-contain rounded-xl"
            />
            <p className="text-white text-center mt-3 font-semibold">{imageModal.name}</p>
            {imageModal.instructionsHe.length > 0 && (
              <div className="mt-4 bg-dark-surface/90 rounded-xl p-4 border border-dark-border" dir="rtl">
                <p className="text-primary-400 text-sm font-semibold mb-3">הוראות ביצוע</p>
                <ol className="space-y-2 list-decimal list-inside">
                  {imageModal.instructionsHe.map((instruction, i) => (
                    <li key={i} className="text-text-secondary text-sm leading-relaxed">{instruction}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trainer: Assign workout to trainee modal */}
      {showTraineeAssignment && user && (
        <TraineeAssignmentModal
          isOpen={showTraineeAssignment}
          onClose={() => {
            setShowTraineeAssignment(false)
            assignmentDecisionMade.current = false
          }}
          onAssign={handleTraineeAssigned}
          onSkip={handleTraineeAssignmentSkip}
          trainerId={user.uid}
        />
      )}
    </div>
  )
}

export default ExerciseLibrary
