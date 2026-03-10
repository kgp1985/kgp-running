import { useState } from 'react'
import { WORKOUT_TYPES } from '../../data/workoutTypes.js'
import { timeStrToSeconds } from '../../utils/paceCalc.js'
import { useShoesDb } from '../../hooks/useShoesDb.js'

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Hot', 'Cold', 'Humid', 'Snow', 'Perfect']

const REST_QUICK_PICKS = [
  { label: '60s',  value: 60 },
  { label: '90s',  value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
]

const DEFAULT_FORM = {
  date: new Date().toISOString().slice(0, 10),
  distance: '',
  distanceUnit: 'mi',
  durationStr: '',
  heartRate: '',
  workoutType: 'easy',
  weather: '',
  notes: '',
  shoeId: '',
  hasReps: false,
  repsCount: '',
  repDistanceMeters: '',
  restSeconds: 90,
}

export default function RunForm({ onSubmit, onCancel, initialValues }) {
  const [form, setForm] = useState(initialValues ? { ...DEFAULT_FORM, ...initialValues } : DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [customRest, setCustomRest] = useState('')
  const { activeShoes } = useShoesDb()

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
    if (!form.durationStr) {
      errs.durationStr = 'Required'
    } else if (!timeStrToSeconds(form.durationStr)) {
      errs.durationStr = 'Use format mm:ss or h:mm:ss'
    }
    if (form.heartRate && (isNaN(parseInt(form.heartRate)) || parseInt(form.heartRate) <= 0)) {
      errs.heartRate = 'Enter a valid HR'
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
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const distanceMiles = form.distanceUnit === 'km'
      ? parseFloat(form.distance) / 1.60934
      : parseFloat(form.distance)

    onSubmit({
      date: form.date,
      distance: distanceMiles,
      distanceUnit: form.distanceUnit,
      duration: timeStrToSeconds(form.durationStr),
      heartRate: form.heartRate ? parseInt(form.heartRate) : null,
      workoutType: form.workoutType,
      weather: form.weather,
      notes: form.notes,
      shoeId: form.shoeId || null,
      repsCount: form.hasReps ? parseInt(form.repsCount) : null,
      repDistanceMeters: form.hasReps ? parseInt(form.repDistanceMeters) : null,
      restSeconds: form.hasReps ? form.restSeconds : null,
    })
    setForm(DEFAULT_FORM)
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className={`input ${errors.date ? 'border-red-400 focus:ring-red-400' : ''}`}
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
        </div>

        {/* Workout type */}
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
          <label className="label">Distance</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              className={`input flex-1 ${errors.distance ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="0.00"
              value={form.distance}
              onChange={e => set('distance', e.target.value)}
            />
            <select
              className="input w-20"
              value={form.distanceUnit}
              onChange={e => set('distanceUnit', e.target.value)}
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
            </select>
          </div>
          {errors.distance && <p className="text-xs text-red-500 mt-1">{errors.distance}</p>}
        </div>

        {/* Duration */}
        <div>
          <label className="label">Time (mm:ss or h:mm:ss)</label>
          <input
            type="text"
            className={`input ${errors.durationStr ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="45:00"
            value={form.durationStr}
            onChange={e => set('durationStr', e.target.value)}
          />
          {errors.durationStr && <p className="text-xs text-red-500 mt-1">{errors.durationStr}</p>}
        </div>

        {/* Heart Rate */}
        <div>
          <label className="label">Avg Heart Rate (optional)</label>
          <input
            type="number"
            min="0"
            max="250"
            className={`input ${errors.heartRate ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="145 bpm"
            value={form.heartRate}
            onChange={e => set('heartRate', e.target.value)}
          />
          {errors.heartRate && <p className="text-xs text-red-500 mt-1">{errors.heartRate}</p>}
        </div>

        {/* Weather */}
        <div>
          <label className="label">Weather (optional)</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Sunny, 65°F..."
              value={form.weather}
              onChange={e => set('weather', e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {WEATHER_OPTIONS.map(w => (
              <button
                key={w}
                type="button"
                onClick={() => set('weather', w)}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 transition-colors"
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        {/* Shoes */}
        {activeShoes.length > 0 && (
          <div>
            <label className="label">Shoes (optional)</label>
            <select
              className="input"
              value={form.shoeId}
              onChange={e => set('shoeId', e.target.value)}
            >
              <option value="">— No shoe selected —</option>
              {activeShoes.map(shoe => (
                <option key={shoe.id} value={shoe.id}>{shoe.name}</option>
              ))}
            </select>
          </div>
        )}
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
                className={`input ${errors.repsCount ? 'border-red-400 focus:ring-red-400' : ''}`}
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
                className={`input ${errors.repDistanceMeters ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="800"
                value={form.repDistanceMeters}
                onChange={e => set('repDistanceMeters', e.target.value)}
              />
              {errors.repDistanceMeters && <p className="text-xs text-red-500 mt-1">{errors.repDistanceMeters}</p>}
            </div>
          </div>
          <div>
            <label className="label">Rest Between Reps</label>
            <div className="flex flex-wrap gap-2 items-center">
              {REST_QUICK_PICKS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { set('restSeconds', value); setCustomRest('') }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.restSeconds === value && customRest === ''
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  className="input w-20 text-sm py-1.5"
                  placeholder="Custom"
                  value={customRest}
                  onChange={e => {
                    const val = e.target.value
                    setCustomRest(val)
                    if (val && parseInt(val) > 0) set('restSeconds', parseInt(val))
                  }}
                />
                <span className="text-xs text-gray-400">sec</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Selected: {form.restSeconds < 60 ? `${form.restSeconds}s` : form.restSeconds % 60 === 0 ? `${form.restSeconds / 60}min` : `${form.restSeconds}s`}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder="How did it feel? Splits, course notes..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary flex-1 sm:flex-none sm:px-8">
          Save Run
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
