import { useState } from 'react'
import { WORKOUT_TYPES } from '../../data/workoutTypes.js'
import { generateWorkouts } from '../../utils/workoutGenerator.js'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { calculateVDOT } from '../../utils/vdot.js'

const REST_QUICK_PICKS = [
  { label: '60s',  value: 60 },
  { label: '90s',  value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
]

const SPEED_WORKOUT_TYPES = ['interval', 'repetition', 'tempo']

const DEFAULT_FORM = {
  date:             new Date().toISOString().slice(0, 10),
  distance:         '',
  workoutType:      'easy',
  hasReps:          false,
  repsCount:        '',
  repDistanceMeters:'',
  restSeconds:      90,
  notes:            '',
  targetPace:       '',
  targetRace:       '',
}

export default function PlannedRunForm({ onSubmit, onCancel, initialValues }) {
  const [form, setForm] = useState(initialValues ? { ...DEFAULT_FORM, ...initialValues } : DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const { getBestRaceRun } = useRunningLogDb()

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.date) errs.date = 'Required'
    if (!form.distance || isNaN(parseFloat(form.distance)) || parseFloat(form.distance) <= 0) {
      errs.distance = 'Enter a valid distance'
    }
    if (form.hasReps) {
      if (!form.repsCount || parseInt(form.repsCount) <= 0) errs.repsCount = 'Enter number of reps'
      if (!form.repDistanceMeters || parseInt(form.repDistanceMeters) <= 0) errs.repDistanceMeters = 'Enter rep distance'
    }
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      date:             form.date,
      distance:         parseFloat(form.distance),
      workoutType:      form.workoutType,
      repsCount:        form.hasReps ? parseInt(form.repsCount) : null,
      repDistanceMeters:form.hasReps ? parseInt(form.repDistanceMeters) : null,
      restSeconds:      form.hasReps ? form.restSeconds : null,
      notes:            form.notes,
      targetPace:       form.targetPace,
      targetRace:       form.targetRace,
    })
  }

  const handleSurpriseMe = () => {
    setSurpriseLoading(true)

    // Get VDOT from best logged race
    const bestRace = getBestRaceRun()
    let vdot = null
    if (bestRace) {
      // Try to compute VDOT from the best race run
      // We use distance in meters
      const distanceMeters = bestRace.distance * 1609.344
      try {
        vdot = calculateVDOT(distanceMeters, bestRace.duration)
      } catch {
        vdot = null
      }
    }

    // Pick a random speed workout type
    const speedTypes = SPEED_WORKOUT_TYPES
    const randomType = speedTypes[Math.floor(Math.random() * speedTypes.length)]
    const workouts = generateWorkouts(randomType, vdot)

    if (workouts.length > 0) {
      const picked = workouts[Math.floor(Math.random() * workouts.length)]
      // Parse estimated distance from totalDist string (e.g. "~8 miles" → 8)
      const distMatch = picked.totalDist?.match(/[\d.]+/)
      const dist = distMatch ? distMatch[0] : ''

      setForm(f => ({
        ...f,
        workoutType: randomType,
        distance:    dist,
        notes:       `${picked.title}\n\n${picked.details}${picked.notes ? '\n\nNote: ' + picked.notes : ''}`,
        hasReps:     false,
      }))
    }

    setSurpriseLoading(false)
  }

  // Import from Workout Types — fills notes with the first template for current workout type
  const handleImportWorkout = () => {
    const type = WORKOUT_TYPES[form.workoutType]
    if (!type || !type.workoutTemplates?.length) return
    const template = type.workoutTemplates[0]
    setForm(f => ({
      ...f,
      notes: `${template.title}\n\n${template.details}`,
    }))
  }

  const restLabel = (secs) => {
    if (secs < 60) return `${secs}s`
    if (secs % 60 === 0) return `${secs / 60}min`
    return `${secs}s`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className={`input ${errors.date ? 'border-red-400' : ''}`}
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
        </div>

        {/* Workout Type */}
        <div>
          <label className="label">Workout Type</label>
          <select
            className="input"
            value={form.workoutType}
            onChange={e => set('workoutType', e.target.value)}
          >
            {Object.values(WORKOUT_TYPES).map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Distance */}
        <div>
          <label className="label">Planned Distance (miles)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className={`input ${errors.distance ? 'border-red-400' : ''}`}
            placeholder="6.0"
            value={form.distance}
            onChange={e => set('distance', e.target.value)}
          />
          {errors.distance && <p className="text-xs text-red-500 mt-1">{errors.distance}</p>}
        </div>

        {/* Target Pace */}
        <div>
          <label className="label">Target Pace (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="6:45/mi"
            value={form.targetPace}
            onChange={e => set('targetPace', e.target.value)}
          />
        </div>

        {/* Target Race */}
        <div className="sm:col-span-2">
          <label className="label">Target Race (optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Boston Marathon 2026"
            value={form.targetRace}
            onChange={e => set('targetRace', e.target.value)}
          />
        </div>
      </div>

      {/* Reps toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-red-500"
            checked={form.hasReps}
            onChange={e => set('hasReps', e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">This workout has intervals / reps</span>
        </label>
      </div>

      {/* Reps details */}
      {form.hasReps && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Interval Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Number of Reps</label>
              <input
                type="number"
                min="1"
                className={`input ${errors.repsCount ? 'border-red-400' : ''}`}
                placeholder="6"
                value={form.repsCount}
                onChange={e => set('repsCount', e.target.value)}
              />
              {errors.repsCount && <p className="text-xs text-red-500 mt-1">{errors.repsCount}</p>}
            </div>
            <div>
              <label className="label">Rep Distance (meters)</label>
              <input
                type="number"
                min="1"
                className={`input ${errors.repDistanceMeters ? 'border-red-400' : ''}`}
                placeholder="800"
                value={form.repDistanceMeters}
                onChange={e => set('repDistanceMeters', e.target.value)}
              />
              {errors.repDistanceMeters && <p className="text-xs text-red-500 mt-1">{errors.repDistanceMeters}</p>}
            </div>
          </div>
          <div>
            <label className="label">Rest Between Reps</label>
            <div className="flex flex-wrap gap-2">
              {REST_QUICK_PICKS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('restSeconds', value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.restSeconds === value
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Selected: {restLabel(form.restSeconds)}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Notes / Description (optional)</label>
          <button
            type="button"
            onClick={handleImportWorkout}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Import from Workout Types
          </button>
        </div>
        <textarea
          className="input min-h-[100px] resize-none"
          placeholder="Describe the workout, pacing strategy, route notes..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" className="btn-primary flex-1 sm:flex-none sm:px-8">
          Save to Plan
        </button>
        <button
          type="button"
          onClick={handleSurpriseMe}
          disabled={surpriseLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-red-300 transition-colors"
        >
          🎲 Surprise Me
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400">
        🎲 Surprise Me generates a speed workout based on your best logged race performance.
      </p>
    </form>
  )
}
