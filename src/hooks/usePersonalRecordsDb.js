// Drop-in replacement for usePersonalRecords — identical public API, backed by Supabase.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPRs, upsertPR, deletePR } from '../api/personalRecordsApi.js'

// Standard distances for auto-PR detection — matches the original hook
const PR_DISTANCES = [
  { label: 'Mile',          miles: 1,                   tolerance: 0.02 },
  { label: '5K',            miles: 5000 / 1609.344,     tolerance: 0.05 },
  { label: '10K',           miles: 10000 / 1609.344,    tolerance: 0.05 },
  { label: 'Half Marathon', miles: 21097.5 / 1609.344,  tolerance: 0.10 },
  { label: 'Marathon',      miles: 42195 / 1609.344,    tolerance: 0.20 },
]

export function usePersonalRecordsDb() {
  const { user } = useAuth()
  const [prs, setPRs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setPRs({}); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchPRs(user.id)
      .then(data => { if (!cancelled) { setPRs(data); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const setPR = useCallback(async (distanceLabel, time, date, raceName = '') => {
    if (!user) return
    const updated = await upsertPR(user.id, distanceLabel, time, date, raceName)
    setPRs(prev => ({ ...prev, [distanceLabel]: updated }))
  }, [user])

  const removePR = useCallback(async (distanceLabel) => {
    if (!user) return
    await deletePR(user.id, distanceLabel)
    setPRs(prev => {
      const next = { ...prev }
      delete next[distanceLabel]
      return next
    })
  }, [user])

  const getPR = useCallback((distanceLabel) => {
    return prs[distanceLabel] ?? null
  }, [prs])

  // Auto-detect PRs when a run is added — uses functional updater to avoid stale closures
  const checkAndUpdatePR = useCallback(async (run) => {
    if (!user) return
    for (const { label, miles, tolerance } of PR_DISTANCES) {
      if (Math.abs(run.distance - miles) / miles <= tolerance) {
        // Read current PR from latest state snapshot to avoid stale closure
        setPRs(prev => {
          const existing = prev[label]
          if (!existing || run.duration < existing.time) {
            // Kick off the async upsert (fire-and-forget from state perspective;
            // setPR will update state again when it resolves)
            upsertPR(user.id, label, run.duration, run.date, '').then(updated => {
              setPRs(latest => ({ ...latest, [label]: updated }))
            })
          }
          return prev // don't update state here — the .then() above handles it
        })
      }
    }
  }, [user])

  return {
    prs,
    loading,
    setPR,
    deletePR:        removePR,
    getPR,
    checkAndUpdatePR,
  }
}
