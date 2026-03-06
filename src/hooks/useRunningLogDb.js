// Drop-in replacement for useRunningLog — identical public API, backed by Supabase.
// All query helpers (getRecentRuns, computeStats, etc.) are pure functions on local state.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchRuns, insertRun, deleteRun, updateRun } from '../api/runsApi.js'

export function useRunningLogDb() {
  const { user } = useAuth()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load runs whenever the signed-in user changes
  useEffect(() => {
    if (!user) {
      setRuns([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchRuns(user.id)
      .then(data => {
        if (!cancelled) { setRuns(data); setLoading(false) }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [user])

  const addRun = useCallback(async (runData) => {
    if (!user) return null
    try {
      const newRun = await insertRun(user.id, runData)
      setRuns(prev => [newRun, ...prev])
      return newRun
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [user])

  const removeRun = useCallback(async (id) => {
    try {
      await deleteRun(id)
      setRuns(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const editRun = useCallback(async (id, updates) => {
    try {
      const updated = await updateRun(id, updates)
      setRuns(prev => prev.map(r => r.id === id ? updated : r))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // ── Pure query helpers (same as original useRunningLog) ──────────────────

  const getRecentRuns = useCallback((days = 30) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return runs.filter(r => new Date(r.date) >= cutoff)
  }, [runs])

  const getRunsByType = useCallback((type) => {
    return runs.filter(r => r.workoutType === type)
  }, [runs])

  const getFastestRunNearDistance = useCallback((targetMiles, tolerancePct = 0.2) => {
    const lo = targetMiles * (1 - tolerancePct)
    const hi = targetMiles * (1 + tolerancePct)
    const candidates = runs.filter(r => r.distance >= lo && r.distance <= hi && r.duration > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((best, r) =>
      (r.duration / r.distance) < (best.duration / best.distance) ? r : best
    )
  }, [runs])

  const getBestRaceRun = useCallback(() => {
    if (runs.length === 0) return null
    const preferred = runs.filter(r => ['tempo', 'interval', 'repetition'].includes(r.workoutType))
    const pool = preferred.length > 0 ? preferred : runs
    const candidates = pool.filter(r => r.distance >= 1 && r.duration > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((best, r) =>
      (r.duration / r.distance) < (best.duration / best.distance) ? r : best
    )
  }, [runs])

  const computeStats = useCallback((runSet) => {
    if (!runSet || runSet.length === 0) {
      return { totalMiles: 0, totalRuns: 0, longestMiles: 0, avgPacePerMile: null }
    }
    const totalMiles    = runSet.reduce((sum, r) => sum + r.distance, 0)
    const totalSecs     = runSet.reduce((sum, r) => sum + r.duration, 0)
    const longestMiles  = Math.max(...runSet.map(r => r.distance))
    const avgPacePerMile = totalMiles > 0 ? totalSecs / totalMiles : null
    return { totalMiles, totalRuns: runSet.length, longestMiles, avgPacePerMile }
  }, [])

  return {
    runs,
    loading,
    error,
    addRun,
    deleteRun:                 removeRun,
    updateRun:                 editRun,
    getRecentRuns,
    getRunsByType,
    getFastestRunNearDistance,
    getBestRaceRun,
    computeStats,
  }
}
