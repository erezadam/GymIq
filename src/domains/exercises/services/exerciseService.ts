import type { Exercise, ExerciseFilters, CreateExerciseDto, UpdateExerciseDto } from '../types'
import { mockExercises, categories, equipment, muscles } from '../data/mockExercises'

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// In-memory storage (will be replaced with Firebase)
let exercises = [...mockExercises]

export const exerciseService = {
  // Get all exercises with optional filtering
  async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    await delay(300) // Simulate network delay

    let result = [...exercises]

    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        result = result.filter(
          (ex) =>
            ex.name.toLowerCase().includes(searchLower) ||
            ex.nameHe.includes(filters.search!) ||
            ex.category.includes(searchLower)
        )
      }

      if (filters.category) {
        result = result.filter((ex) => ex.category === filters.category)
      }

      if (filters.difficulty) {
        result = result.filter((ex) => ex.difficulty === filters.difficulty)
      }

      if (filters.equipment) {
        result = result.filter((ex) => ex.equipment === filters.equipment)
      }

      if (filters.muscle) {
        result = result.filter(
          (ex) => ex.primaryMuscle === filters.muscle || ex.secondaryMuscles.includes(filters.muscle!)
        )
      }
    }

    return result
  },

  // Get single exercise by ID
  async getExerciseById(id: string): Promise<Exercise | null> {
    await delay(200)
    return exercises.find((ex) => ex.id === id) || null
  },

  // Create new exercise
  async createExercise(data: CreateExerciseDto): Promise<Exercise> {
    await delay(300)

    const newExercise: Exercise = {
      ...data,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    exercises.push(newExercise)
    return newExercise
  },

  // Update existing exercise
  async updateExercise(id: string, data: UpdateExerciseDto): Promise<Exercise> {
    await delay(300)

    const index = exercises.findIndex((ex) => ex.id === id)
    if (index === -1) {
      throw new Error('תרגיל לא נמצא')
    }

    exercises[index] = {
      ...exercises[index],
      ...data,
      updatedAt: new Date(),
    }

    return exercises[index]
  },

  // Delete exercise
  async deleteExercise(id: string): Promise<void> {
    await delay(300)

    const index = exercises.findIndex((ex) => ex.id === id)
    if (index === -1) {
      throw new Error('תרגיל לא נמצא')
    }

    exercises.splice(index, 1)
  },

  // Bulk import exercises
  async bulkImport(data: CreateExerciseDto[]): Promise<{ success: number; failed: number }> {
    await delay(500)

    let success = 0
    let failed = 0

    for (const exerciseData of data) {
      try {
        await this.createExercise(exerciseData)
        success++
      } catch {
        failed++
      }
    }

    return { success, failed }
  },

  // Export all exercises
  async exportExercises(): Promise<Exercise[]> {
    await delay(200)
    return [...exercises]
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
