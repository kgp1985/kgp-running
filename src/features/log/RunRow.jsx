import { useState } from 'react'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'
import { secondsToTimeStr } from '../../utils/paceCalc.js'
import { formatDate, formatHR } from '../../utils/formatters.js'

export default function RunRow({ run, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const type = WORKOUT_TYPES[run.workoutType] || { label: run.workoutType, color: 'blue' }
  const colors = WORKOUT_TYPE_COLORS[type.color] || WORKOUT_TYPE_COLORS.blue

  const pacePerMile = run.duration / run.distance
  const displayDist = run.distanceUnit === 'km'
    ? (run.distance * 1.60934).toFixed(2) + ' km'
    : run.distance.toFixed(2) + ' mi'

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(run.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(run.date)}</td>
        <td className="px-4 py-3">
          <span className={`badge ${colors.bg} ${colors.text}`}>{type.label}</span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{displayDist}</td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{secondsToTimeStr(run.duration, true)}</td>
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {secondsToTimeStr(pacePerMile)}/mi
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatHR(run.heartRate)}</td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          {typeof onDelete === 'function' && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-600 font-semibold hover:text-red-800"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="Delete run"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )
          )}
        </td>
      </tr>

      {/* Expanded details */}
      {expanded && (run.notes || run.weather) && (
        <tr className="bg-red-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
              {run.weather && (
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Weather: </span>
                  {run.weather}
                </div>
              )}
              {run.notes && (
                <div className="flex-1">
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Notes: </span>
                  {run.notes}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
