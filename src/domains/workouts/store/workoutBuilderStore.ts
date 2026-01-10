import { create } from 'zustand'
import type { WorkoutExercise, WorkoutSet, SetType } from '../types'
import type { ExerciseReportType } from '@/domains/exercises/types'

// ============================================
// Types
// ============================================

export interface SelectedExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl: string
  primaryMuscle: string
  category?: string
  equipment?: string
  reportType?: ExerciseReportType
  sets: WorkoutSet[]
  restTime: number
  order: number
}

interface WorkoutBuilderState {
  workoutName: string
  selectedExercises: SelectedExercise[]
  scheduledDate: Date | null // null = today, Date = scheduled for that date
}

interface WorkoutBuilderActions {
  setWorkoutName: (name: string) => void
  setScheduledDate: (date: Date | null) => void
  addExercise: (exercise: Omit<SelectedExercise, 'order' | 'sets' | 'restTime'>) => void
  removeExercise: (exerciseId: string) => void
  reorderExercise: (fromIndex: number, toIndex: number) => void
  updateRestTime: (exerciseId: string, restTime: number) => void
  addSet: (exerciseId: string) => void
  removeSet: (exerciseId: string, setIndex: number) => void
  updateSet: (exerciseId: string, setIndex: number, updates: Partial<WorkoutSet>) => void
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
      }

      return { selectedExercises: [...state.selectedExercises, newExercise] }
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

  clearWorkout: () => {
    set({ workoutName: '', selectedExercises: [], scheduledDate: null })
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
    }))
  },
}))
