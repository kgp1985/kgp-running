// Drop-in replacement for usePersonalRecords — identical public API, backed by Supabase.

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPRs, upsertPR, deletePR } from '../api/personalRecordsApi.js'

// Standard distances for auto-PR detection.
// Each entry uses explicit min/max mile bounds instead of a symmetric tolerance,
// allowing asymmetric windows that match real-world race measurement variance.
//
//   Mile:          0.98–1.02 mi   (±2% symmetric)
//   5K:            3.02–3.23 mi   (±4% symmetric — GPS 5Ks can read slightly long/short)
//   10K:           6.04–6.40 mi   (±3% symmetric)
//   Half Marathon: 13.00–13.60 mi (excludes 12-mi long runs; catches short-course HMs)
//   Marathon:      26.19–27.00 mi (excludes 22-mi long runs; accepts GPS-long courses)
const PR_DISTANCES = [
  { label: 'Mile',          min: 0.98,  max: 1.02  },
  { label: '5K',            min: 3.02,  max: 3.23  },
  { label: '10K',           min: 6.04,  max: 6.40  },
  { label: 'Half Marathon', min: 13.00, max: 13.60 },
  { label: 'Marathon',      min: 26.19, max: 27.00 },
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
    for (const { label, min, max } of PR_DISTANCES) {
      if (run.distance >= min && run.distance <= max) {
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
