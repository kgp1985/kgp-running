import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  fetchPlannedRuns,
  insertPlannedRun,
  deletePlannedRun,
  updatePlannedRun,
} from '../api/plannedRunsApi.js'

export function usePlannedRunsDb() {
  const { user } = useAuth()
  const [plannedRuns, setPlannedRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setPlannedRuns([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPlannedRuns(user.id)
      .then(data => { if (!cancelled) { setPlannedRuns(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const addPlannedRun = useCallback(async (runData) => {
    if (!user) return null
    const run = await insertPlannedRun(user.id, runData)
    setPlannedRuns(prev => [...prev, run].sort((a, b) => a.date.localeCompare(b.date)))
    return run
  }, [user])

  const removePlannedRun = useCallback(async (id) => {
    if (!user) return
    await deletePlannedRun(id)
    setPlannedRuns(prev => prev.filter(r => r.id !== id))
  }, [user])

  // Only updates local state — DB deletion is handled by deletePlanWithRuns in plansApi
  const removeRunsByPlanId = useCallback((planId) => {
    setPlannedRuns(prev => prev.filter(r => r.planId !== planId))
  }, [])

  // Re-fetches all planned runs from DB — returns the data AND updates state.
  // Returns the fresh array so callers can use it immediately without waiting for re-render.
  const refetch = useCallback(async () => {
    if (!user) return []
    const data = await fetchPlannedRuns(user.id)
    setPlannedRuns(data)
    return data
  }, [user])

  const editPlannedRun = useCallback(async (id, updates) => {
    if (!user) return null
    const updated = await updatePlannedRun(id, updates)
    setPlannedRuns(prev =>
      prev.map(r => r.id === id ? updated : r).sort((a, b) => a.date.localeCompare(b.date))
    )
    return updated
  }, [user])

  // Returns planned runs from today onward
  const upcomingRuns = plannedRuns.filter(r => r.date >= new Date().toISOString().slice(0, 10))

  // Returns planned runs in the next N days
  const getNextDays = useCallback((days) => {
    const today = new Date().toISOString().slice(0, 10)
    const future = new Date()
    future.setDate(future.getDate() + days)
    const futureStr = future.toISOString().slice(0, 10)
    return plannedRuns.filter(r => r.date >= today && r.date <= futureStr)
  }, [plannedRuns])

  return {
    plannedRuns,
    upcomingRuns,
    loading,
    addPlannedRun,
    removePlannedRun,
    removeRunsByPlanId,
    editPlannedRun,
    getNextDays,
    refetch,
  }
}
