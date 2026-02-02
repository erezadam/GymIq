import { useState, useEffect } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { programService } from '../services/programService'
import type { TrainingProgram, ProgramDay } from '../types'

export function useTraineeProgram() {
  const { user } = useAuthStore()
  const [program, setProgram] = useState<TrainingProgram | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    programService
      .getTraineeActiveProgram(user.uid)
      .then((p) => setProgram(p))
      .catch((err) => {
        console.error('Error loading trainee program:', err)
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [user?.uid])

  // Get today's training day from weekly structure
  const getTodayDay = (): ProgramDay | null => {
    if (!program || program.weeklyStructure.length === 0) return null

    // Calculate which day of the program we're on
    const startDate = program.startDate instanceof Date
      ? program.startDate
      : new Date()
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
    isLoading,
    error,
    getTodayDay,
    getTrainingDays,
    refreshProgram: () => {
      if (!user?.uid) return
      programService
        .getTraineeActiveProgram(user.uid)
        .then(setProgram)
        .catch(console.error)
    },
  }
}
