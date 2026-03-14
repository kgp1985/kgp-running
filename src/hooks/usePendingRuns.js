import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchPendingRuns, dismissPendingRun, markPendingRunSaved } from '../api/pendingRunsApi.js'
import { insertRun } from '../api/runsApi.js'

/**
 * Fetches pending runs (from Garmin/Coros webhooks or .fit uploads) for the
 * signed-in user. Provides actions to save or dismiss each run.
 *
 * Returns:
 *   pendingRuns     — array of pending run objects
 *   loading         — initial fetch in progress
 *   saveRun(id, runData) — inserts into `runs`, marks pending as saved
 *   dismiss(id)     — marks pending run as dismissed (won't show again)
 */
export function usePendingRuns() {
  const { user } = useAuth()
  const [pendingRuns, setPendingRuns] = useState([])
  const [loading, setLoading]         = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const runs = await fetchPendingRuns(user.id)
      setPendingRuns(runs)
    } catch (err) {
      console.error('usePendingRuns fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const saveRun = useCallback(async (pendingId, runData) => {
    if (!user) return
    // Insert into runs table
    await insertRun(user.id, runData)
    // Mark pending as saved so it disappears from the prompt
    await markPendingRunSaved(pendingId)
    setPendingRuns(prev => prev.filter(r => r.id !== pendingId))
  }, [user])

  const dismiss = useCallback(async (pendingId) => {
    await dismissPendingRun(pendingId)
    setPendingRuns(prev => prev.filter(r => r.id !== pendingId))
  }, [])

  return { pendingRuns, loading, saveRun, dismiss, reload: load }
}
