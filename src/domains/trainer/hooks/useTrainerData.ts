import { useEffect, useCallback } from 'react'
import { useTrainerStore } from '../store/trainerStore'
import { trainerService } from '../services/trainerService'
import { useAuthStore } from '@/domains/authentication/store'

export function useTrainerData() {
  const { user } = useAuthStore()
  const {
    trainees,
    isLoading,
    error,
    setTrainees,
    setLoading,
    setError,
  } = useTrainerStore()

  const loadTrainees = useCallback(async () => {
    if (!user?.uid) return

    setLoading(true)
    setError(null)

    try {
      const data = await trainerService.getTraineesWithStats(user.uid)
      setTrainees(data)
    } catch (err: any) {
      console.error('Error loading trainees:', err)
      setError(err.message || 'שגיאה בטעינת מתאמנים')
    } finally {
      setLoading(false)
    }
  }, [user?.uid, setTrainees, setLoading, setError])

  useEffect(() => {
    loadTrainees()
  }, [loadTrainees])

  return {
    trainees,
    isLoading,
    error,
    refreshTrainees: loadTrainees,
  }
}
