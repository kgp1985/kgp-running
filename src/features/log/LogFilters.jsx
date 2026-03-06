import { WORKOUT_TYPES } from '../../data/workoutTypes.js'

export default function LogFilters({ filters, onChange }) {
  const set = (field, value) => onChange({ ...filters, [field]: value })

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Workout type filter */}
      <div>
        <label className="label">Type</label>
        <select
          className="input w-40"
          value={filters.workoutType}
          onChange={e => set('workoutType', e.target.value)}
        >
          <option value="">All types</option>
          {Object.values(WORKOUT_TYPES).map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div>
        <label className="label">From</label>
        <input
          type="date"
          className="input w-36"
          value={filters.dateFrom}
          onChange={e => set('dateFrom', e.target.value)}
        />
      </div>

      {/* Date to */}
      <div>
        <label className="label">To</label>
        <input
          type="date"
          className="input w-36"
          value={filters.dateTo}
          onChange={e => set('dateTo', e.target.value)}
        />
      </div>

      {/* Sort */}
      <div>
        <label className="label">Sort By</label>
        <select
          className="input w-36"
          value={filters.sortBy}
          onChange={e => set('sortBy', e.target.value)}
        >
          <option value="date-desc">Date (newest)</option>
          <option value="date-asc">Date (oldest)</option>
          <option value="distance-desc">Distance (longest)</option>
          <option value="distance-asc">Distance (shortest)</option>
          <option value="pace-asc">Pace (fastest)</option>
        </select>
      </div>

      {/* Clear */}
      {(filters.workoutType || filters.dateFrom || filters.dateTo) && (
        <button
          className="btn-ghost self-end"
          onClick={() => onChange({ workoutType: '', dateFrom: '', dateTo: '', sortBy: 'date-desc' })}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
