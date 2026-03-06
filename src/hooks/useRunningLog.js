import { useLocalStorage } from './useLocalStorage.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

export function useRunningLog() {
  const [runs, setRuns] = useLocalStorage(STORAGE_KEYS.RUN_LOG, [])

  const addRun = (runData) => {
    const newRun = {
      ...runData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setRuns(prev => [newRun, ...prev])
    return newRun
  }

  const deleteRun = (id) => {
    setRuns(prev => prev.filter(r => r.id !== id))
  }

  const updateRun = (id, updates) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  /**
   * Get runs from the last N days.
   */
  const getRecentRuns = (days = 30) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return runs.filter(r => new Date(r.date) >= cutoff)
  }

  /**
   * Get runs of a specific workout type.
   */
  const getRunsByType = (type) => {
    return runs.filter(r => r.workoutType === type)
  }

  /**
   * Get the fastest pace run (best effort) for a given approximate distance.
   * Looks for runs within ±20% of the target distance.
   * @param {number} targetMiles
   * @returns {object|null} best run
   */
  const getFastestRunNearDistance = (targetMiles, tolerancePct = 0.2) => {
    const lo = targetMiles * (1 - tolerancePct)
    const hi = targetMiles * (1 + tolerancePct)
    const candidates = runs.filter(r => r.distance >= lo && r.distance <= hi && r.duration > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((best, r) => {
      const pace = r.duration / r.distance
      const bestPace = best.duration / best.distance
      return pace < bestPace ? r : best
    })
  }

  /**
   * Get the best VDOT-applicable race run.
   * Looks for races/hard efforts, returns the one with best implied VDOT.
   */
  const getBestRaceRun = () => {
    if (runs.length === 0) return null
    // Prefer runs logged as race or interval/tempo efforts over easy runs
    const preferred = runs.filter(r => ['tempo', 'interval', 'repetition'].includes(r.workoutType))
    const pool = preferred.length > 0 ? preferred : runs
    // Return the one with highest pace (lowest pace time) for meaningful distances (>= 1 mile)
    const candidates = pool.filter(r => r.distance >= 1 && r.duration > 0)
    if (candidates.length === 0) return null
    return candidates.reduce((best, r) => {
      const pace = r.duration / r.distance
      const bestPace = best.duration / best.distance
      return pace < bestPace ? r : best
    })
  }

  /**
   * Compute summary stats for an array of runs.
   */
  const computeStats = (runSet) => {
    if (runSet.length === 0) return { totalMiles: 0, totalRuns: 0, longestMiles: 0, avgPacePerMile: null }
    const totalMiles = runSet.reduce((sum, r) => sum + r.distance, 0)
    const totalSecs = runSet.reduce((sum, r) => sum + r.duration, 0)
    const longestMiles = Math.max(...runSet.map(r => r.distance))
    const avgPacePerMile = totalSecs / totalMiles
    return { totalMiles, totalRuns: runSet.length, longestMiles, avgPacePerMile }
  }

  return {
    runs,
    addRun,
    deleteRun,
    updateRun,
    getRecentRuns,
    getRunsByType,
    getFastestRunNearDistance,
    getBestRaceRun,
    computeStats,
  }
}
