import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunForm from '../features/log/RunForm.jsx'
import RunTable from '../features/log/RunTable.jsx'
import LogFilters from '../features/log/LogFilters.jsx'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { useProfile } from '../hooks/useProfile.js'
import { secondsToTimeStr } from '../utils/paceCalc.js'
import PendingRunBanner from '../features/watch/PendingRunBanner.jsx'

const DEFAULT_FILTERS = { workoutType: '', dateFrom: '', dateTo: '', sortBy: 'date-desc' }

function runToFormValues(run) {
  return {
    date: run.date,
    distance: run.distanceUnit === 'km'
      ? (run.distance * 1.60934).toFixed(2)
      : run.distance.toFixed(2),
    distanceUnit: run.distanceUnit ?? 'mi',
    durationStr: secondsToTimeStr(run.duration, run.duration >= 3600),
    heartRate: run.heartRate ?? '',
    workoutType: run.workoutType,
    weather: run.weather ?? '',
    notes: run.notes ?? '',
    subtitle: run.subtitle ?? '',
    isPublic: run.isPublic ?? false,
    elevationGain: run.elevationGain ?? '',
    shoeId: run.shoeId ?? '',
    hasReps: !!run.repsCount,
    repsCount: run.repsCount ?? '',
    repDistanceMeters: run.repDistanceMeters ?? '',
    restSeconds: run.restSeconds ?? 90,
  }
}

export default function RunningLog() {
  const [showForm, setShowForm] = useState(false)
  const [editingRun, setEditingRun] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const { runs, addRun, deleteRun, updateRun, loading } = useRunningLogDb()
  const { checkAndUpdatePR } = usePersonalRecordsDb()
  const { profile } = useProfile()

  const handleAddRun = async (runData) => {
    const newRun = await addRun(runData)
    if (newRun) await checkAndUpdatePR({ ...runData, id: newRun.id })
    setShowForm(false)
  }

  const handleUpdateRun = async (runData) => {
    await updateRun(editingRun.id, runData)
    setEditingRun(null)
  }

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
        case 'date-asc': return a.date.localeCompare(b.date)
        case 'distance-desc': return b.distance - a.distance
        case 'distance-asc': return a.distance - b.distance
        case 'pace-asc': return (a.duration / a.distance) - (b.duration / b.distance)
        default: return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      }
    })

  // Quick stats for filtered view
  const totalMiles = filtered.reduce((s, r) => s + r.distance, 0)

  if (loading) {
    return (
      <PageWrapper>
        <p className="text-sm text-gray-400 text-center py-16">Loading your runs...</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* Watch sync pending runs prompt */}
      <PendingRunBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Running Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {runs.length} run{runs.length !== 1 ? 's' : ''} logged · {totalMiles.toFixed(1)} mi shown
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowForm(s => !s)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Cancel' : 'Log Run'}
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Run</h2>
          <RunForm
            onSubmit={handleAddRun}
            onCancel={() => setShowForm(false)}
            defaultIsPublic={profile?.isPublic ?? false}
          />
        </div>
      )}

      {/* Filters */}
      {runs.length > 0 && (
        <div className="card mb-6">
          <LogFilters filters={filters} onChange={setFilters} />
        </div>
      )}

      {/* Table */}
      <div className="card">
        <RunTable runs={filtered} onDelete={deleteRun} onEdit={run => setEditingRun(run)} />
      </div>

      {/* Edit modal */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-8 mb-8 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Edit Run</h2>
            <RunForm
              initialValues={runToFormValues(editingRun)}
              onSubmit={handleUpdateRun}
              onCancel={() => setEditingRun(null)}
            />
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
