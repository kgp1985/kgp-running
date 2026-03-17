import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper.jsx'
import RunForm from '../features/log/RunForm.jsx'
import LogFilters from '../features/log/LogFilters.jsx'
import { useRunningLogDb } from '../hooks/useRunningLogDb.js'
import { usePersonalRecordsDb } from '../hooks/usePersonalRecordsDb.js'
import { useProfile } from '../hooks/useProfile.js'
import { secondsToTimeStr } from '../utils/paceCalc.js'
import PendingRunBanner from '../features/watch/PendingRunBanner.jsx'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../data/workoutTypes.js'

const DEFAULT_FILTERS = { workoutType: '', dateFrom: '', dateTo: '', sortBy: 'date-desc' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtPace(distance, duration, distanceUnit) {
  if (!distance || !duration) return null
  const miles = distanceUnit === 'km' ? distance / 1.60934 : distance
  const secPerMile = duration / miles
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function getTypeStyle(workoutType) {
  const type = WORKOUT_TYPES[workoutType]
  const color = type?.color ?? 'green'
  return { label: type?.label ?? workoutType, color, style: WORKOUT_TYPE_COLORS[color] }
}

const BORDER_MAP = {
  green:  'border-l-green-500',
  blue:   'border-l-blue-500',
  teal:   'border-l-teal-500',
  yellow: 'border-l-yellow-400',
  orange: 'border-l-orange-500',
  red:    'border-l-red-500',
  purple: 'border-l-purple-500',
  pink:   'border-l-pink-500',
}

function runToFormValues(run) {
  return {
    date:        run.date,
    distance:    run.distanceUnit === 'km'
      ? (run.distance * 1.60934).toFixed(2)
      : run.distance.toFixed(2),
    distanceUnit:    run.distanceUnit ?? 'mi',
    durationStr:     secondsToTimeStr(run.duration, run.duration >= 3600),
    heartRate:       run.heartRate ?? '',
    workoutType:     run.workoutType,
    weather:         run.weather ?? '',
    notes:           run.notes ?? '',
    subtitle:        run.subtitle ?? '',
    isPublic:        run.isPublic ?? false,
    elevationGain:   run.elevationGain ?? '',
    shoeId:          run.shoeId ?? '',
    hasReps:         !!run.repsCount,
    repsCount:       run.repsCount ?? '',
    repDistanceMeters: run.repDistanceMeters ?? '',
    restSeconds:     run.restSeconds ?? 90,
  }
}

// ── RunFeatureCard ─────────────────────────────────────────────────────────────

function RunFeatureCard({ run, onDelete, onEdit }) {
  const { label, color, style } = getTypeStyle(run.workoutType)
  const borderColor = BORDER_MAP[color] ?? 'border-l-gray-400'
  const distMi = run.distanceUnit === 'km' ? run.distance / 1.60934 : run.distance
  const pace = fmtPace(run.distance, run.duration, run.distanceUnit)

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${borderColor} overflow-hidden flex flex-col`}>
      <div className="px-5 pt-5 pb-4 flex-1">
        {/* Date + type pill */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 font-medium">{fmtDate(run.date)}</p>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            {label}
          </span>
        </div>

        {/* Subtitle / notes */}
        {(run.subtitle || run.notes) && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {run.subtitle || run.notes}
          </p>
        )}

        {/* Big distance */}
        <p className="text-4xl font-black text-gray-900 leading-none mb-1">
          {run.distanceUnit === 'km'
            ? `${distMi.toFixed(2)} mi`
            : `${run.distance.toFixed(2)} mi`}
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <Stat label="Time" value={secondsToTimeStr(run.duration, run.duration >= 3600)} />
          {pace && <Stat label="Pace" value={`${pace} /mi`} />}
          {run.heartRate && <Stat label="HR" value={`${run.heartRate} bpm`} />}
          {run.elevationGain && <Stat label="Vert" value={`${run.elevationGain.toLocaleString()} ft`} />}
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100">
        <button
          onClick={() => onEdit(run)}
          className="flex-1 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 py-2.5 transition-colors"
        >
          Edit
        </button>
        <div className="w-px bg-gray-100" />
        <button
          onClick={() => onDelete(run.id)}
          className="flex-1 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 py-2.5 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-sm font-bold text-gray-700">{value}</p>
    </div>
  )
}

// ── RunListRow ─────────────────────────────────────────────────────────────────

function RunListRow({ run, onDelete, onEdit }) {
  const { label, color, style } = getTypeStyle(run.workoutType)
  const pace = fmtPace(run.distance, run.duration, run.distanceUnit)

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl">
      {/* Color dot */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />

      {/* Date */}
      <p className="text-xs text-gray-500 w-28 flex-shrink-0 hidden sm:block">{fmtDate(run.date)}</p>

      {/* Type pill */}
      <span className={`hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full w-28 justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
        {label}
      </span>

      {/* Distance */}
      <p className="text-sm font-bold text-gray-900 w-20 flex-shrink-0">
        {run.distance.toFixed(2)} mi
      </p>

      {/* Time */}
      <p className="text-xs text-gray-500 w-16 flex-shrink-0 hidden sm:block">
        {secondsToTimeStr(run.duration, run.duration >= 3600)}
      </p>

      {/* Pace */}
      {pace
        ? <p className="text-xs text-gray-500 w-20 flex-shrink-0 hidden md:block">{pace} /mi</p>
        : <div className="w-20 flex-shrink-0 hidden md:block" />
      }

      {/* HR / vert */}
      <div className="hidden lg:flex gap-3 flex-1">
        {run.heartRate && (
          <p className="text-xs text-gray-400">{run.heartRate} bpm</p>
        )}
        {run.elevationGain && (
          <p className="text-xs text-gray-400">{run.elevationGain.toLocaleString()} ft ↑</p>
        )}
      </div>

      {/* Subtitle/notes on mobile */}
      <p className="text-xs text-gray-400 flex-1 truncate sm:hidden">
        {run.subtitle || run.notes || label}
      </p>

      {/* Edit / Delete — revealed on hover */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(run)}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(run.id)}
          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function RunningLog() {
  const [showForm, setShowForm]     = useState(false)
  const [editingRun, setEditingRun] = useState(null)
  const [filters, setFilters]       = useState(DEFAULT_FILTERS)
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
        case 'date-asc':      return a.date.localeCompare(b.date)
        case 'distance-desc': return b.distance - a.distance
        case 'distance-asc':  return a.distance - b.distance
        case 'pace-asc':      return (a.duration / a.distance) - (b.duration / b.distance)
        default:              return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
      }
    })

  const recentRuns = filtered.slice(0, 3)
  const olderRuns  = filtered.slice(3)
  const totalMiles = filtered.reduce((s, r) => {
    return s + (r.distanceUnit === 'km' ? r.distance / 1.60934 : r.distance)
  }, 0)

  if (loading) {
    return (
      <PageWrapper>
        <p className="text-sm text-gray-400 text-center py-16">Loading your runs...</p>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* Watch sync pending runs */}
      <PendingRunBanner />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">
            {profile?.displayName
              ? `${profile.displayName.trim().split(' ')[0]}'s Log`
              : 'My Log'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {runs.length} run{runs.length !== 1 ? 's' : ''} · {totalMiles.toFixed(1)} mi shown
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
        <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-6">
          <LogFilters filters={filters} onChange={setFilters} />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-sm font-medium text-gray-500">No runs yet</p>
          <p className="text-xs mt-1">Add your first run using the button above.</p>
        </div>
      )}

      {/* Recent feature cards */}
      {recentRuns.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-500 mb-3">
            Recent runs
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentRuns.map(run => (
              <RunFeatureCard
                key={run.id}
                run={run}
                onDelete={deleteRun}
                onEdit={run => setEditingRun(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Older runs list */}
      {olderRuns.length > 0 && (
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">
            History · {olderRuns.length} run{olderRuns.length !== 1 ? 's' : ''}
          </p>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 mb-1">
            <div className="w-2.5 flex-shrink-0" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-28 hidden sm:block">Date</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-28 hidden sm:block">Type</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-20">Distance</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-16 hidden sm:block">Time</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-20 hidden md:block">Pace</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 flex-1 hidden lg:block">Details</p>
          </div>

          <div className="divide-y divide-gray-50">
            {olderRuns.map(run => (
              <RunListRow
                key={run.id}
                run={run}
                onDelete={deleteRun}
                onEdit={run => setEditingRun(run)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingRun && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-8 mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Edit Run</h2>
              <button
                onClick={() => setEditingRun(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
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
