import { useState, useEffect } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { programService } from '../services/programService'
import type { TrainingProgram, ProgramDay } from '../types'

export function useTraineeProgram(traineeId?: string) {
  const { user } = useAuthStore()
  const targetId = traineeId || user?.uid
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [standaloneWorkouts, setStandaloneWorkouts] = useState<TrainingProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = async (id: string) => {
    const [p, sw] = await Promise.all([
      programService.getTraineeActiveProgram(id),
      programService.getTraineeStandaloneWorkouts(id),
    ])
    setProgram(p)
    setStandaloneWorkouts(sw)
  }

  useEffect(() => {
    if (!targetId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    loadAll(targetId)
      .catch((err) => {
        console.error('Error loading trainee program:', err)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [targetId])

  // Get today's training day from weekly structure
  const getTodayDay = (): ProgramDay | null => {
    if (!program || program.weeklyStructure.length === 0) return null

    // Calculate which day of the program we're on
    // Try to parse startDate even if it's a string/number (e.g. from Firestore)
    const parsed = program.startDate instanceof Date
      ? program.startDate
      : new Date(program.startDate as unknown as string | number)
    const startDate = isNaN(parsed.getTime()) ? new Date() : parsed
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const dayIndex = diffDays % program.weeklyStructure.length

    return program.weeklyStructure[dayIndex >= 0 ? dayIndex : 0] || null
  }

  // Get all training days (non-rest days)
  const getTrainingDays = (): ProgramDay[] => {
    if (!program) return []
    return program.weeklyStructure.filter((d) => !d.restDay)
  }

  return {
    program,
    standaloneWorkouts,
    isLoading,
    error,
    getTodayDay,
    getTrainingDays,
    refreshProgram: () => {
      if (!targetId) return
      loadAll(targetId).catch(console.error)
    },
  }
}
