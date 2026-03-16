/**
 * PendingRunCard
 *
 * Displays a single watch-synced run awaiting review.
 * User can: Save as-is, Edit & Save (opens RunForm pre-filled), or Dismiss.
 */
import { useState } from 'react'
import RunForm from '../log/RunForm.jsx'
import { secondsToTimeStr } from '../../utils/paceCalc.js'
import { usePersonalRecordsDb } from '../../hooks/usePersonalRecordsDb.js'

const PROVIDER_LABELS = {
  garmin:   { label: 'Garmin',      icon: '⌚', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  coros:    { label: 'Coros',       icon: '⌚', color: 'bg-green-50 text-green-700 border-green-200' },
  strava:   { label: 'Strava',      icon: '🟠', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  fit_file: { label: 'File Upload', icon: '📁', color: 'bg-gray-50 text-gray-600 border-gray-200' },
}

function fmtDist(miles) {
  return `${miles.toFixed(2)} mi`
}

function fmtPace(miles, seconds) {
  if (!miles || !seconds) return null
  const secPerMile = seconds / miles
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60)
  return `${m}:${String(s).padStart(2, '0')} /mi`
}

export default function PendingRunCard({ run, onSave, onDismiss, defaultIsPublic = false }) {
  const [mode, setMode]       = useState('preview') // 'preview' | 'edit'
  const [saving, setSaving]   = useState(false)
  const { checkAndUpdatePR }  = usePersonalRecordsDb()

  const provider = PROVIDER_LABELS[run.provider] ?? { label: run.provider, icon: '⌚', color: 'bg-gray-50 text-gray-600 border-gray-200' }
  const miles    = run.distanceMiles
  const pace     = fmtPace(miles, run.durationSeconds)

  // Default values to pre-fill RunForm when editing
  const formDefaults = {
    date:        run.date,
    distance:    miles.toFixed(2),
    distanceUnit:'mi',
    durationStr: secondsToTimeStr(run.durationSeconds, run.durationSeconds >= 3600),
    heartRate:     run.heartRate ?? '',
    workoutType:   'easy',
    weather:       '',
    notes:         '',
    subtitle:      '',
    isPublic:      defaultIsPublic,
    elevationGain: run.elevationGainFeet ?? '',
    shoeId:        '',
    hasReps:       false,
    repsCount:     '',
    repDistanceMeters: '',
    restSeconds:   90,
  }

  const handleSaveAsIs = async () => {
    setSaving(true)
    try {
      await onSave(run.id, {
        date:        run.date,
        distance:    miles,
        distanceUnit:'mi',
        duration:    run.durationSeconds,
        heartRate:     run.heartRate ?? null,
        workoutType:   'easy',
        weather:       null,
        notes:         null,
        subtitle:      null,
        isPublic:      defaultIsPublic,
        elevationGain: run.elevationGainFeet ?? null,
        shoeId:        null,
        repsCount:     null,
        repDistanceMeters: null,
        restSeconds:   null,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditSubmit = async (runData) => {
    setSaving(true)
    try {
      await onSave(run.id, runData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${provider.color}`}>
          {provider.icon} {provider.label}
        </span>
        <button
          onClick={() => onDismiss(run.id)}
          className="text-gray-400 hover:text-gray-600 text-xs underline"
        >
          Dismiss
        </button>
      </div>

      {mode === 'preview' ? (
        <div className="px-4 pb-4">
          {/* Date */}
          <p className="text-xs text-gray-400 mb-3">
            {new Date(run.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          {/* Stats */}
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Distance</p>
              <p className="text-xl font-bold text-gray-900">{fmtDist(miles)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Time</p>
              <p className="text-xl font-bold text-gray-900">{secondsToTimeStr(run.durationSeconds, run.durationSeconds >= 3600)}</p>
            </div>
            {pace && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Pace</p>
                <p className="text-xl font-bold text-gray-900">{pace}</p>
              </div>
            )}
            {run.heartRate && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Avg HR</p>
                <p className="text-xl font-bold text-gray-900">{run.heartRate} bpm</p>
              </div>
            )}
            {run.elevationGainFeet && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Vert</p>
                <p className="text-xl font-bold text-gray-900">{run.elevationGainFeet.toLocaleString()} ft</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSaveAsIs}
              disabled={saving}
              className="flex-1 bg-black text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Run'}
            </button>
            <button
              onClick={() => setMode('edit')}
              disabled={saving}
              className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl py-2.5 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Edit & Save
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Add shoes, notes, and more:</p>
          <RunForm
            initialValues={formDefaults}
            onSubmit={handleEditSubmit}
            onCancel={() => setMode('preview')}
          />
        </div>
      )}
    </div>
  )
}
