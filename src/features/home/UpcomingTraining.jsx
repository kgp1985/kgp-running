import { Link } from 'react-router-dom'
import { usePlannedRunsDb } from '../../hooks/usePlannedRunsDb.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { WORKOUT_TYPES, WORKOUT_TYPE_COLORS } from '../../data/workoutTypes.js'
import { ROUTES } from '../../constants/routes.js'

export default function UpcomingTraining() {
  const { user } = useAuth()
  const { upcomingRuns, getNextDays, loading } = usePlannedRunsDb()

  if (!user) return null

  const next7 = getNextDays(7)
  const nextRun = upcomingRuns[0] ?? null

  // Summarise next 7 days
  const totalMiles = next7.reduce((s, r) => s + r.distance, 0)
  const typeCounts = next7.reduce((acc, r) => {
    const label = WORKOUT_TYPES[r.workoutType]?.label ?? r.workoutType
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})

  if (!loading && upcomingRuns.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Training</h2>
          <Link to={ROUTES.PLAN} className="text-xs text-red-500 hover:text-red-700 font-medium">
            Plan runs →
          </Link>
        </div>
        <div className="text-center py-6 text-gray-400">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">No upcoming runs planned.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Training</h2>
        <Link to={ROUTES.PLAN} className="text-xs text-red-500 hover:text-red-700 font-medium">
          View plan →
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
      ) : (
        <>
          {/* Next run highlight */}
          {nextRun && (() => {
            const type = WORKOUT_TYPES[nextRun.workoutType]
            const colors = WORKOUT_TYPE_COLORS[type?.color ?? 'green']
            const isToday = nextRun.date === new Date().toISOString().slice(0, 10)
            const dateLabel = isToday
              ? 'Today'
              : new Date(nextRun.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

            return (
              <div className="bg-black rounded-xl p-4 text-white">
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Next Run</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base">{dateLabel}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${colors.bg} ${colors.text}`}>
                      {type?.label ?? nextRun.workoutType}
                    </span>
                    {nextRun.repsCount && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {nextRun.repsCount} × {nextRun.repDistanceMeters}m
                      </p>
                    )}
                    {nextRun.targetPace && (
                      <p className="text-xs text-zinc-400 mt-0.5">🎯 {nextRun.targetPace}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-red-400">{nextRun.distance.toFixed(1)}</p>
                    <p className="text-xs text-zinc-400">miles</p>
                  </div>
                </div>
                {nextRun.notes && (
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{nextRun.notes}</p>
                )}
              </div>
            )
          })()}

          {/* Next 7 days summary */}
          {next7.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next 7 Days</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{next7.length}</p>
                  <p className="text-xs text-gray-500">runs</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{totalMiles.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">miles</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{Object.keys(typeCounts).length}</p>
                  <p className="text-xs text-gray-500">types</p>
                </div>
              </div>
              {/* Workout type breakdown */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Object.entries(typeCounts).map(([label, count]) => (
                  <span key={label} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 font-medium">
                    {count} {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
