import type { Exercise, ExerciseFilters, CreateExerciseDto, UpdateExerciseDto } from '../types'
import { categories, equipment, muscles } from '../data/mockExercises'
import {
  getExercises as firebaseGetExercises,
  getExerciseById as firebaseGetExerciseById,
  createExercise as firebaseCreateExercise,
  updateExercise as firebaseUpdateExercise,
  deleteExercise as firebaseDeleteExercise,
  bulkImportExercises as firebaseBulkImport,
  deleteAllExercises as firebaseDeleteAllExercises,
} from '@/lib/firebase/exercises'

export const exerciseService = {
  // Get all exercises with optional filtering
  async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    return firebaseGetExercises(filters)
  },

  // Get single exercise by ID
  async getExerciseById(id: string): Promise<Exercise | null> {
    return firebaseGetExerciseById(id)
  },

  // Create new exercise
  async createExercise(data: CreateExerciseDto): Promise<Exercise> {
    return firebaseCreateExercise(data)
  },

  // Update existing exercise
  async updateExercise(id: string, data: UpdateExerciseDto): Promise<Exercise> {
    await firebaseUpdateExercise(id, data)
    const updated = await firebaseGetExerciseById(id)
    if (!updated) {
      throw new Error('תרגיל לא נמצא')
    }
    return updated
  },

  // Delete exercise
  async deleteExercise(id: string): Promise<void> {
    return firebaseDeleteExercise(id)
  },

  // Bulk import exercises
  async bulkImport(data: CreateExerciseDto[]): Promise<{ success: number; failed: number }> {
    return firebaseBulkImport(data)
  },

  // Export all exercises
  async exportExercises(): Promise<Exercise[]> {
    return firebaseGetExercises()
  },

  // Delete all exercises
  async deleteAllExercises(): Promise<number> {
    return firebaseDeleteAllExercises()
  },

  // Get metadata
  getCategories() {
    return categories
  },

  getEquipment() {
    return equipment
  },

  getMuscles() {
    return muscles
  },
}
