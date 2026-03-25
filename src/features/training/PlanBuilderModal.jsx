import { useState, useEffect } from 'react'
import { WORKOUT_TYPES, WORKOUT_TYPE_OPTIONS, WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'
import { fetchPlannedRuns } from '../../api/plannedRunsApi.js'
import { insertPlannedRun } from '../../api/plannedRunsApi.js'
import { useAuth } from '../../context/AuthContext.jsx'

function dateToString(date) {
  return date.toISOString().slice(0, 10)
}

function stringToDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
}

function addDays(dateStr, days) {
  const d = stringToDate(dateStr)
  d.setDate(d.getDate() + days)
  return dateToString(d)
}

export default function PlanBuilderModal({ onClose, onSave, initialRows }) {
  const { user } = useAuth()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState(initialRows || [])
  const [showTable, setShowTable] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Generate table on "Generate Table"
  const handleGenerateTable = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates')
      return
    }

    const start = stringToDate(startDate)
    const end = stringToDate(endDate)
    if (end < start) {
      setError('End date must be after start date')
      return
    }

    const newRows = []
    let current = startDate
    while (current <= endDate) {
      newRows.push({
        id: `temp-${Date.now()}-${Math.random()}`,
        date: current,
        distance: '',
        workoutType: 'easy',
        notes: '',
        targetPace: '',
      })
      current = addDays(current, 1)
    }
    setRows(newRows)
    setShowTable(true)
    setError(null)
  }

  // Update row
  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  // Delete row
  const deleteRow = (id) => {
    setRows(rows.filter(r => r.id !== id))
  }

  // Check for conflicts
  const checkConflicts = async () => {
    if (!user) return { conflicts: [], existingRuns: [] }

    const existing = await fetchPlannedRuns(user.id)
    const conflicts = []
    for (const row of rows) {
      if (row.distance === '' || row.distance === null) continue // Skip rest days
      const match = existing.find(r => r.date === row.date)
      if (match) conflicts.push(match)
    }
    return { conflicts, existing }
  }

  // Save plan
  const handleSavePlan = async () => {
    if (!user) {
      setError('Not authenticated')
      return
    }

    // Filter out rest days (empty distance)
    const toSave = rows.filter(r => r.distance !== '' && r.distance !== null && r.distance !== undefined)

    if (toSave.length === 0) {
      setError('No runs to save (all rows are rest days)')
      return
    }

    setSaving(true)
    try {
      const { conflicts, existing } = await checkConflicts()

      if (conflicts.length > 0) {
        setConflictWarning({
          count: conflicts.length,
          conflicts,
          toSave,
        })
        setSaving(false)
        return
      }

      // No conflicts, proceed with save
      await saveToDatabase(toSave)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const saveToDatabase = async (toSave) => {
    try {
      for (const row of toSave) {
        await insertPlannedRun(user.id, {
          date: row.date,
          distance: parseFloat(row.distance) || 0,
          workoutType: row.workoutType,
          notes: row.notes || null,
          targetPace: row.targetPace || null,
          planId: null,
        })
      }
      onSave(toSave)
    } catch (err) {
      setError(`Failed to save: ${err.message}`)
      setSaving(false)
    }
  }

  const handleConflictResolution = (action) => {
    setSaving(true)
    if (action === 'cancel') {
      setConflictWarning(null)
      setSaving(false)
      return
    }

    if (action === 'override') {
      // Save all (ignore existing dates)
      saveToDatabase(conflictWarning.toSave)
    } else if (action === 'skip') {
      // Skip conflicting dates
      const safe = conflictWarning.toSave.filter(
        r => !conflictWarning.conflicts.find(c => c.date === r.date)
      )
      if (safe.length === 0) {
        setError('No rows to save after skipping conflicts')
        setSaving(false)
        setConflictWarning(null)
        return
      }
      saveToDatabase(safe)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Build Training Plan</h2>
            <p className="text-sm text-gray-500 mt-1">Create a skeleton schedule by date range, then customize each workout.</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Conflict warning */}
        {conflictWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-yellow-900 mb-2">
              {conflictWarning.count} existing workout{conflictWarning.count !== 1 ? 's' : ''} on the same date{conflictWarning.count !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleConflictResolution('override')}
                disabled={saving}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Saving…' : 'Override'}
              </button>
              <button
                onClick={() => handleConflictResolution('skip')}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
              >
                Skip Duplicates
              </button>
              <button
                onClick={() => handleConflictResolution('cancel')}
                disabled={saving}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Date range input */}
        {!showTable ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setError(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setError(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateTable}
              className="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Generate Table
            </button>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 w-24">Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 w-20">Distance (mi)</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 w-32">Workout Type</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 flex-1">Notes</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700 w-24">Target Pace</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 font-medium">
                        {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.distance}
                          onChange={(e) => updateRow(row.id, 'distance', e.target.value)}
                          placeholder="e.g., 5.0"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.workoutType}
                          onChange={(e) => updateRow(row.id, 'workoutType', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        >
                          {WORKOUT_TYPE_OPTIONS.map(t => (
                            <option key={t.key} value={t.key}>{t.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                          placeholder="Optional notes"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.targetPace}
                          onChange={(e) => updateRow(row.id, 'targetPace', e.target.value)}
                          placeholder="e.g., 7:30"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors font-bold"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setShowTable(false)
                  setRows([])
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  disabled={saving || rows.length === 0}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors font-semibold"
                >
                  {saving ? 'Saving…' : 'Save Plan'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
