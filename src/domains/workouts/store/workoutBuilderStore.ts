import { create } from 'zustand'
import type { WorkoutExercise, WorkoutSet, SetType } from '../types'
import type { ExerciseReportType, AssistanceType } from '@/domains/exercises/types'
import type { ProgramDay } from '@/domains/trainer/types'

// ============================================
// Types
// ============================================

export interface QuickPlanSection {
  id: string
  title: string
  order: number
}

export interface SelectedExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl: string
  primaryMuscle: string
  category?: string
  equipment?: string
  complexity?: 'compound' | 'simple'
  reportType?: ExerciseReportType
  assistanceTypes?: AssistanceType[]  // Available assistance options for this exercise
  availableBands?: string[]           // Available band IDs (if 'bands' is in assistanceTypes)
  customSetCount?: number             // User-specified set count (Quick Plan)
  quickPlanSectionId?: string         // Which Quick Plan section this exercise belongs to
  sectionTitle?: string               // Section title (set on first exercise of each section before workout start)
  notes?: string                      // Planning notes / instructions (e.g. "פרמידה הפוכה") — shown to trainee in active workout
  sets: WorkoutSet[]
  restTime: number
  order: number
}

interface WorkoutBuilderState {
  workoutName: string
  selectedExercises: SelectedExercise[]
  scheduledDate: Date | null // null = today, Date = scheduled for that date
  // Quick Plan sections
  quickPlanSections: QuickPlanSection[]
  activeQuickPlanSectionId: string | null
  // Trainer program fields
  programId?: string
  programDayLabel?: string
  // Source of the linked program — distinguishes trainer-assigned from trainee self-built
  programSource?: 'trainer_program' | 'self_standalone'
  // Single source of truth for the planned workoutHistory doc being continued.
  // Why: both trainer-on-behalf and trainee self-report paths must update the same
  // planned doc on finish — otherwise a duplicate "completed" doc is created and
  // the planned one is orphaned. Set by whoever initiates continuation; read by
  // useActiveWorkout.initWorkout.
  plannedWorkoutDocId?: string
  // Trainer report fields (when trainer reports on behalf of trainee)
  targetUserId?: string
  reportedBy?: string
  reportedByName?: string
}

interface WorkoutBuilderActions {
  setWorkoutName: (name: string) => void
  setScheduledDate: (date: Date | null) => void
  addExercise: (exercise: Omit<SelectedExercise, 'order' | 'sets' | 'restTime'>) => void
  addExercisesFromSet: (exercises: Omit<SelectedExercise, 'order' | 'sets' | 'restTime'>[]) => void
  removeExercise: (exerciseId: string) => void
  reorderExercise: (fromIndex: number, toIndex: number) => void
  updateRestTime: (exerciseId: string, restTime: number) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => void
  loadFromProgram: (day: ProgramDay, programId: string, programName: string) => void
  setSelfStandaloneProgram: (programId: string, programDayLabel?: string) => void
  setTrainerReport: (targetUserId: string, reportedBy: string, reportedByName: string) => void
  setPlannedWorkoutDocId: (id: string | undefined) => void
  setExerciseSetCount: (exerciseId: string, count: number) => void
  updateExerciseNotes: (exerciseId: string, notes: string) => void
  addQuickPlanSection: (title: string) => string
  updateQuickPlanSectionTitle: (sectionId: string, title: string) => void
  removeQuickPlanSection: (sectionId: string) => void
  setActiveQuickPlanSection: (sectionId: string | null) => void
  moveQuickPlanSection: (sectionId: string, direction: 'up' | 'down') => void
  moveQuickPlanExercise: (exerciseId: string, direction: 'up' | 'down') => void
  sortExercises: (orderedIds: string[]) => void
  clearWorkout: () => void
  getWorkoutExercises: () => WorkoutExercise[]
}

type WorkoutBuilderStore = WorkoutBuilderState & WorkoutBuilderActions

// ============================================
// Helpers
// ============================================

let setIdCounter = 0

const generateSetId = (): string => {
  setIdCounter += 1
  return `set_${Date.now()}_${setIdCounter}`
}

const createDefaultSet = (type: SetType = 'working', reps = 10, weight = 0): WorkoutSet => ({
  id: generateSetId(),
  type,
  targetReps: reps,
  targetWeight: weight,
  completed: false,
})

const createDefaultSets = (): WorkoutSet[] => [
  createDefaultSet('working', 10, 0),
  createDefaultSet('working', 10, 0),
  createDefaultSet('working', 10, 0),
]

const DEFAULT_REST_TIME = 90

const updateExerciseInList = (
  exercises: SelectedExercise[],
  exerciseId: string,
  updater: (exercise: SelectedExercise) => SelectedExercise
): SelectedExercise[] => {
  return exercises.map((e) => (e.exerciseId === exerciseId ? updater(e) : e))
}

const reindexExercises = (exercises: SelectedExercise[]): SelectedExercise[] => {
  return exercises.map((e, index) => ({ ...e, order: index + 1 }))
}

// ============================================
// Store
// ============================================

export const useWorkoutBuilderStore = create<WorkoutBuilderStore>((set, get) => ({
  // State
  workoutName: '',
  selectedExercises: [],
  scheduledDate: null,
  quickPlanSections: [],
  activeQuickPlanSectionId: null,
  programId: undefined,
  programDayLabel: undefined,
  programSource: undefined,
  plannedWorkoutDocId: undefined,
  targetUserId: undefined,
  reportedBy: undefined,
  reportedByName: undefined,

  // Actions
  setWorkoutName: (name) => set({ workoutName: name }),
  setScheduledDate: (date) => set({ scheduledDate: date }),

  addExercise: (exercise) => {
    set((state) => {
      const alreadyExists = state.selectedExercises.some(
        (e) => e.exerciseId === exercise.exerciseId
      )
      if (alreadyExists) return state

      const newExercise: SelectedExercise = {
        ...exercise,
        primaryMuscle: exercise.primaryMuscle || 'other',
        order: state.selectedExercises.length + 1,
        sets: createDefaultSets(),
        restTime: DEFAULT_REST_TIME,
        quickPlanSectionId: exercise.quickPlanSectionId || state.activeQuickPlanSectionId || undefined,
      }

      return { selectedExercises: [...state.selectedExercises, newExercise] }
    })
  },

  addExercisesFromSet: (exercises) => {
    set((state) => {
      const existingIds = new Set(state.selectedExercises.map((e) => e.exerciseId))
      const newExercises = exercises.filter((e) => !existingIds.has(e.exerciseId))

      if (newExercises.length === 0) return state

      let nextOrder = state.selectedExercises.length + 1
      const mapped: SelectedExercise[] = newExercises.map((exercise) => ({
        ...exercise,
        primaryMuscle: exercise.primaryMuscle || 'other',
        order: nextOrder++,
        sets: createDefaultSets(),
        restTime: DEFAULT_REST_TIME,
      }))

      return { selectedExercises: [...state.selectedExercises, ...mapped] }
    })
  },

  removeExercise: (exerciseId) => {
    set((state) => ({
      selectedExercises: reindexExercises(
        state.selectedExercises.filter((e) => e.exerciseId !== exerciseId)
      ),
    }))
  },

  reorderExercise: (fromIndex, toIndex) => {
    set((state) => {
      const exercises = [...state.selectedExercises]
      const [moved] = exercises.splice(fromIndex, 1)
      exercises.splice(toIndex, 0, moved)
      return { selectedExercises: reindexExercises(exercises) }
    })
  },

  updateRestTime: (exerciseId, restTime) => {
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => ({ ...e, restTime })
      ),
    }))
  },

  addSet: (exerciseId) => {
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => {
          const lastSet = e.sets[e.sets.length - 1]
          const newSet = createDefaultSet(
            'working',
            lastSet?.targetReps ?? 10,
            lastSet?.targetWeight ?? 0
          )
          return { ...e, sets: [...e.sets, newSet] }
        }
      ),
    }))
  },

  removeSet: (exerciseId, setIndex) => {
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => {
          if (e.sets.length <= 1) return e
          return { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
        }
      ),
    }))
  },

  updateSet: (exerciseId, setIndex, updates) => {
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => ({
          ...e,
          sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...updates } : s)),
        })
      ),
    }))
  },

  loadFromProgram: (day, programId, programName) => {
    const sortedExercises = [...day.exercises].sort((a, b) => (a.order || Infinity) - (b.order || Infinity))
    const exercises: SelectedExercise[] = sortedExercises
      .filter((ex) => ex.exerciseId)
      .map((ex, index) => {
        // Parse target reps - take the middle/first value from range like "8-12"
        const repsParts = ex.targetReps.split('-')
        const targetReps = parseInt(repsParts[0]) || 10

        // Create sets based on targetSets
        const sets: WorkoutSet[] = Array.from(
          { length: ex.targetSets },
          () =>
            createDefaultSet(
              'working',
              targetReps,
              ex.targetWeight || 0
            )
        )

        return {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          imageUrl: ex.imageUrl || '',
          primaryMuscle: ex.primaryMuscle || '',
          category: ex.category,
          equipment: ex.equipment,
          complexity: ex.complexity as 'compound' | 'simple' | undefined,
          reportType: ex.reportType as ExerciseReportType | undefined,
          assistanceTypes: ex.assistanceTypes as AssistanceType[] | undefined,
          customSetCount: ex.targetSets,
          sectionTitle: ex.sectionTitle,
          notes: ex.notes,
          sets,
          restTime: ex.restTime || DEFAULT_REST_TIME,
          order: ex.order || index + 1,
        }
      })

    set({
      workoutName: `${programName} - ${day.dayLabel}${day.name ? ` (${day.name})` : ''}`,
      selectedExercises: exercises,
      scheduledDate: null,
      programId,
      programDayLabel: day.dayLabel,
      programSource: 'trainer_program',
    })
  },

  setSelfStandaloneProgram: (programId, programDayLabel) => {
    set({ programId, programDayLabel, programSource: 'self_standalone' })
  },

  setTrainerReport: (targetUserId, reportedBy, reportedByName) => {
    set({ targetUserId, reportedBy, reportedByName })
  },

  setPlannedWorkoutDocId: (id) => {
    set({ plannedWorkoutDocId: id })
  },

  setExerciseSetCount: (exerciseId, count) => {
    const clamped = Math.max(1, Math.min(20, count))
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => ({
          ...e,
          customSetCount: clamped,
          sets: Array.from({ length: clamped }, () => createDefaultSet('working', 10, 0)),
        })
      ),
    }))
  },

  updateExerciseNotes: (exerciseId, notes) => {
    const trimmed = notes.trim()
    set((state) => ({
      selectedExercises: updateExerciseInList(
        state.selectedExercises,
        exerciseId,
        (e) => ({ ...e, notes: trimmed.length > 0 ? trimmed : undefined })
      ),
    }))
  },

  addQuickPlanSection: (title) => {
    const id = `qps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    set((state) => ({
      quickPlanSections: [
        ...state.quickPlanSections,
        { id, title, order: state.quickPlanSections.length + 1 },
      ],
      activeQuickPlanSectionId: id,
    }))
    return id
  },

  updateQuickPlanSectionTitle: (sectionId, title) => {
    set((state) => ({
      quickPlanSections: state.quickPlanSections.map((s) =>
        s.id === sectionId ? { ...s, title } : s
      ),
    }))
  },

  removeQuickPlanSection: (sectionId) => {
    set((state) => ({
      quickPlanSections: state.quickPlanSections.filter((s) => s.id !== sectionId),
      selectedExercises: reindexExercises(
        state.selectedExercises.filter((e) => e.quickPlanSectionId !== sectionId)
      ),
      activeQuickPlanSectionId:
        state.activeQuickPlanSectionId === sectionId
          ? (state.quickPlanSections.find((s) => s.id !== sectionId)?.id ?? null)
          : state.activeQuickPlanSectionId,
    }))
  },

  setActiveQuickPlanSection: (sectionId) => {
    set({ activeQuickPlanSectionId: sectionId })
  },

  moveQuickPlanSection: (sectionId, direction) => {
    set((state) => {
      const sorted = [...state.quickPlanSections].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((s) => s.id === sectionId)
      if (idx === -1) return state
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= sorted.length) return state
      ;[sorted[idx], sorted[swapWith]] = [sorted[swapWith], sorted[idx]]
      return {
        quickPlanSections: sorted.map((s, i) => ({ ...s, order: i + 1 })),
      }
    })
  },

  moveQuickPlanExercise: (exerciseId, direction) => {
    set((state) => {
      const target = state.selectedExercises.find((e) => e.exerciseId === exerciseId)
      if (!target) return state
      const sameSection = state.selectedExercises
        .filter((e) => e.quickPlanSectionId === target.quickPlanSectionId)
        .sort((a, b) => a.order - b.order)
      const idx = sameSection.findIndex((e) => e.exerciseId === exerciseId)
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= sameSection.length) return state
      const neighbor = sameSection[swapWith]
      // Swap the two orders in the full list, then reindex for stable 1..N ordering.
      const swapped = state.selectedExercises.map((e) => {
        if (e.exerciseId === target.exerciseId) return { ...e, order: neighbor.order }
        if (e.exerciseId === neighbor.exerciseId) return { ...e, order: target.order }
        return e
      })
      const sortedFull = [...swapped].sort((a, b) => a.order - b.order)
      return { selectedExercises: reindexExercises(sortedFull) }
    })
  },

  sortExercises: (orderedIds) => {
    set((state) => {
      const exerciseMap = new Map(state.selectedExercises.map(e => [e.exerciseId, e]))
      const ordered: SelectedExercise[] = []
      for (const id of orderedIds) {
        const ex = exerciseMap.get(id)
        if (ex) {
          ordered.push(ex)
          exerciseMap.delete(id)
        }
      }
      // Append any remaining exercises not in orderedIds
      for (const ex of exerciseMap.values()) {
        ordered.push(ex)
      }
      return { selectedExercises: reindexExercises(ordered) }
    })
  },

  clearWorkout: () => {
    set({
      workoutName: '',
      selectedExercises: [],
      scheduledDate: null,
      quickPlanSections: [],
      activeQuickPlanSectionId: null,
      programId: undefined,
      programDayLabel: undefined,
      programSource: undefined,
      plannedWorkoutDocId: undefined,
      targetUserId: undefined,
      reportedBy: undefined,
      reportedByName: undefined,
    })
  },

  getWorkoutExercises: (): WorkoutExercise[] => {
    const { selectedExercises } = get()
    return selectedExercises.map((e) => ({
      id: `we_${e.exerciseId}_${Date.now()}`,
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      exerciseNameHe: e.exerciseNameHe,
      order: e.order,
      sets: e.sets,
      restTime: e.restTime,
      notes: e.notes,
    }))
  },
}))
