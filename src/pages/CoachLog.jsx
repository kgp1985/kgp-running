import { useState, useEffect, useCallback } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunTable from '../features/log/RunTable.jsx'
import LogFilters from '../features/log/LogFilters.jsx'
import Bio from '../features/home/Bio.jsx'
import TrainingPhilosophy from '../features/home/TrainingPhilosophy.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAllRunsForOwner, fetchPublicRunsForUser, deleteRun } from '../api/runsApi.js'

const OWNER_ID = import.meta.env.VITE_OWNER_USER_ID
const DEFAULT_FILTERS = { workoutType: '', dateFrom: '', dateTo: '', sortBy: 'date-desc' }

export default function CoachLog() {
  const { user } = useAuth()
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const isOwner = !!(user && user.id === OWNER_ID)

  const loadRuns = useCallback(() => {
    if (!OWNER_ID) { setLoading(false); return }
    setLoading(true)
    const fetchFn = isOwner ? fetchAllRunsForOwner : fetchPublicRunsForUser
    fetchFn(OWNER_ID)
      .then(data => { setRuns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isOwner])

  useEffect(() => { loadRuns() }, [loadRuns])

  const handleDelete = useCallback(async (id) => {
    if (!isOwner) return
    await deleteRun(id)
    setRuns(prev => prev.filter(r => r.id !== id))
  }, [isOwner])

  // Apply filters
  const filtered = runs
    .filter(r => {
      if (filters.workoutType && r.workoutType !== filters.workoutType) return false
      if (filters.dateFrom && r.date < filters.dateFrom) return false
      if (filters.dateTo && r.date > filters.dateTo) return false
      return true
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-asc':      return a.date.localeCompare(b.date)
        case 'distance-desc': return b.distance - a.distance
        case 'distance-asc':  return a.distance - b.distance
        case 'pace-asc':      return (a.duration / a.distance) - (b.duration / b.distance)
        default:              return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      }
    })

  const totalMiles = filtered.reduce((s, r) => s + r.distance, 0)

  if (!OWNER_ID) {
    return (
      <PageWrapper>
        <div className="text-center py-16 text-gray-400 text-sm">
          Coach log not configured.
        </div>
      </PageWrapper>
    )
  }

  if (loading) {
    return (
      <PageWrapper>
        <p className="text-sm text-gray-400 text-center py-16">Loading...</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* About + Philosophy — visible to everyone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Bio />
        <TrainingPhilosophy />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kyle's Running Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isOwner ? 'All runs' : 'Public runs'} · {runs.length} run{runs.length !== 1 ? 's' : ''} · {totalMiles.toFixed(1)} mi shown
          </p>
        </div>
        {!isOwner && (
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Read-only</span>
        )}
      </div>

      {runs.length > 0 && (
        <div className="card mb-6">
          <LogFilters filters={filters} onChange={setFilters} />
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏃</p>
            <p className="text-sm font-medium text-gray-500">
              {runs.length === 0 ? 'No public runs yet.' : 'No runs match the current filters.'}
            </p>
          </div>
        ) : (
          <RunTable
            runs={filtered}
            onDelete={isOwner ? handleDelete : null}
          />
        )}
      </div>
    </PageWrapper>
  )
}
