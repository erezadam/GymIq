import { create } from 'zustand'
import type { TraineeWithStats } from '../types'

interface TrainerStore {
  trainees: TraineeWithStats[]
  selectedTraineeId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setTrainees: (trainees: TraineeWithStats[]) => void
  setSelectedTrainee: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addTrainee: (trainee: TraineeWithStats) => void
  removeTrainee: (traineeId: string) => void
}

export const useTrainerStore = create<TrainerStore>((set) => ({
  trainees: [],
  selectedTraineeId: null,
  isLoading: false,
  error: null,

  setTrainees: (trainees) => set({ trainees }),
  setSelectedTrainee: (id) => set({ selectedTraineeId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addTrainee: (trainee) =>
    set((state) => ({
      trainees: [...state.trainees, trainee],
    })),
  removeTrainee: (traineeId) =>
    set((state) => ({
      trainees: state.trainees.filter(
        (t) => t.relationship.traineeId !== traineeId
      ),
    })),
}))
