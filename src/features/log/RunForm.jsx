import { useState } from 'react'
import { WORKOUT_TYPES } from '../../data/workoutTypes.js'
import { timeStrToSeconds } from '../../utils/paceCalc.js'

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Hot', 'Cold', 'Humid', 'Snow', 'Perfect']

const DEFAULT_FORM = {
  date: new Date().toISOString().slice(0, 10),
  distance: '',
  distanceUnit: 'mi',
  durationStr: '',
  heartRate: '',
  workoutType: 'easy',
  weather: '',
  notes: '',
}

export default function RunForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState({})

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
      </div>

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
