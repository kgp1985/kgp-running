import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import PlannedRunForm from '../features/plan/PlannedRunForm.jsx'
import RunForm from '../features/log/RunForm.jsx'
import { usePlannedRunsDb } from '../hooks/usePlannedRunsDb.js'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../data/workoutTypes.js'
import { secondsToTimeStr } from '../utils/paceCalc.js'

function formatRestLabel(secs) {
  if (!secs) return ''
  if (secs < 60) return `${secs}s rest`
  if (secs % 60 === 0) return `${secs / 60}min rest`
  return `${secs}s rest`
}

function RepsBadge({ run }) {
  if (!run.repsCount) return null
  return (
    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
      {run.repsCount} × {run.repDistanceMeters}m{run.restSeconds ? ` · ${formatRestLabel(run.restSeconds)}` : ''}
    </span>
  )
}

function PlannedRunCard({ run, onDelete, onMarkDone }) {
  const type = WORKOUT_TYPES[run.workoutType]
  const colors = WORKOUT_TYPE_COLORS[type?.color ?? 'green']
  const isToday = run.date === new Date().toISOString().slice(0, 10)
  const isPast  = run.date < new Date().toISOString().slice(0, 10)

  return (
    <div className={`border rounded-xl p-4 space-y-2 transition-colors ${
      isToday ? 'border-red-300 bg-red-50' : isPast ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isToday && <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Today</span>}
          <span className="text-sm font-semibold text-gray-900">
            {new Date(run.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
            {type?.label ?? run.workoutType}
          </span>
        </div>
        <span className="text-sm font-bold text-gray-900 shrink-0">{run.distance.toFixed(1)} mi</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <RepsBadge run={run} />
        {run.targetPace && (
          <span className="text-xs text-gray-500">🎯 {run.targetPace}</span>
        )}
        {run.targetRace && (
          <span className="text-xs text-gray-400 italic">📍 {run.targetRace}</span>
        )}
      </div>

      {run.notes && (
        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-line line-clamp-3">{run.notes}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onMarkDone(run)}
          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          ✓ Mark as Done
        </button>
        <button
          onClick={() => onDelete(run.id)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1.5"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// Group runs by week (Mon–Sun)
function groupByWeek(runs) {
  const groups = {}
  for (const run of runs) {
    const d = new Date(run.date + 'T00:00:00')
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    const key = mon.toISOString().slice(0, 10)
    if (!groups[key]) groups[key] = { monday: mon, runs: [] }
    groups[key].runs.push(run)
  }
  return Object.values(groups).sort((a, b) => a.monday - b.monday)
}

export default function TrainingPlan() {
  const [showForm, setShowForm] = useState(false)
  const [markDoneRun, setMarkDoneRun] = useState(null) // planned run being converted
  const { plannedRuns, upcomingRuns, loading, addPlannedRun, removePlannedRun } = usePlannedRunsDb()
  const { addRun } = useRunningLogDb()
  const { checkAndUpdatePR } = usePersonalRecordsDb()

  const handleAddPlan = async (data) => {
    await addPlannedRun(data)
    setShowForm(false)
  }

  // "Mark as Done" — saves to running log, removes from plan
  const handleMarkDone = async (runData) => {
    const newRun = await addRun(runData)
    if (newRun) await checkAndUpdatePR({ ...runData, id: newRun.id })
    await removePlannedRun(markDoneRun.id)
    setMarkDoneRun(null)
  }

  const handleDeletePlan = async (id) => {
    await removePlannedRun(id)
  }

  const weekGroups = groupByWeek(plannedRuns)

  const weekLabel = (monday) => {
    const sun = new Date(monday)
    sun.setDate(sun.getDate() + 6)
    return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const weekStats = (runs) => {
    const total = runs.reduce((s, r) => s + r.distance, 0)
    const typeCounts = runs.reduce((acc, r) => {
      const label = WORKOUT_TYPES[r.workoutType]?.label ?? r.workoutType
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})
    return { total, typeCounts }
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {upcomingRuns.length} upcoming run{upcomingRuns.length !== 1 ? 's' : ''} planned
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowForm(s => !s)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? 'Cancel' : 'Add Run'}
        </button>
      </div>

      {/* Add planned run form */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Plan a Run</h2>
          <PlannedRunForm onSubmit={handleAddPlan} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Mark as Done modal — pre-fills RunForm with planned data */}
      {markDoneRun && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Log Completed Run</h2>
            <p className="text-sm text-gray-500 mb-4">
              Review and fill in your actual distance, time, and notes — then save to your running log.
            </p>
            <RunForm
              onSubmit={handleMarkDone}
              onCancel={() => setMarkDoneRun(null)}
              initialValues={{
                date:        markDoneRun.date,
                distance:    markDoneRun.distance.toString(),
                distanceUnit:'mi',
                workoutType: markDoneRun.workoutType,
                notes:       markDoneRun.notes,
              }}
            />
          </div>
        </div>
      )}

      {/* Plan content */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-16">Loading your plan...</p>
      ) : plannedRuns.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm font-medium text-gray-500">No runs planned yet.</p>
          <p className="text-xs mt-1">Add your first planned run to get started!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekGroups.map(({ monday, runs }) => {
            const { total, typeCounts } = weekStats(runs)
            return (
              <div key={monday.toISOString()}>
                {/* Week header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{weekLabel(monday)}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{total.toFixed(1)} mi planned</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {Object.entries(typeCounts).map(([label, count]) => (
                        <span key={label} className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                          {count} {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Run cards */}
                <div className="space-y-3">
                  {runs.map(run => (
                    <PlannedRunCard
                      key={run.id}
                      run={run}
                      onDelete={handleDeletePlan}
                      onMarkDone={(r) => setMarkDoneRun(r)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
