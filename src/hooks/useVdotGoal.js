import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchVdotGoal, saveVdotGoal } from '../api/vdotGoalApi.js'

/**
 * Hook for reading and writing the user's goal VDOT.
 *
 * Returns:
 *   goalData   - { goalVdot, goalRaceDist, goalRaceTime, updatedAt } | null
 *   loading    - boolean
 *   setGoal    - async (vdot, raceDist, raceTime) => void
 */
export function useVdotGoal() {
  const { user } = useAuth()
  const [goalData, setGoalData] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) { setGoalData(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchVdotGoal(user.id)
      .then(data => { if (!cancelled) { setGoalData(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const setGoal = useCallback(async (vdot, raceDist, raceTime) => {
    if (!user) return
    const updated = await saveVdotGoal(user.id, vdot, raceDist, raceTime)
    setGoalData(updated)
    return updated
  }, [user])

  return { goalData, loading, setGoal }
}
