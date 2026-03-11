import { Link } from 'react-router-dom'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { usePlannedRunsDb } from '../../hooks/usePlannedRunsDb.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROUTES } from '../../constants/routes.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toLocalISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return toLocalISO(d)
  })
}

export default function ThisWeek() {
  const { user } = useAuth()
  const { runs } = useRunningLogDb()
  const { plannedRuns } = usePlannedRunsDb()

  if (!user) return null

  const today = new Date()
  const todayISO = toLocalISO(today)
  const monday = getMondayOf(today)
  const dates = weekDates(monday)

  // Actual miles per day this week
  const actualByDay = {}
  for (const r of runs) {
    if (dates.includes(r.date)) {
      actualByDay[r.date] = (actualByDay[r.date] || 0) + r.distance
    }
  }

  // Planned miles per day this week
  const plannedByDay = {}
  for (const r of plannedRuns) {
    if (dates.includes(r.date)) {
      plannedByDay[r.date] = (plannedByDay[r.date] || 0) + r.distance
    }
  }

  const totalActual  = Object.values(actualByDay).reduce((s, v) => s + v, 0)
  const totalPlanned = Object.values(plannedByDay).reduce((s, v) => s + v, 0)
  const hasAnyData   = totalActual > 0 || totalPlanned > 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
        <Link to={ROUTES.PLAN} className="text-xs text-red-500 hover:text-red-700 font-medium">
          Training plan →
        </Link>
      </div>

      {!hasAnyData ? (
        <div className="text-center py-5 text-gray-400">
          <p className="text-sm">No runs or plans for this week yet.</p>
        </div>
      ) : (
        <>
          {/* Day columns */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dates.map((date, i) => {
              const actual  = actualByDay[date] || 0
              const planned = plannedByDay[date] || 0
              const isToday = date === todayISO
              const isPast  = date < todayISO
              const done    = actual > 0
              const hasPlanned = planned > 0

              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  {/* Actual miles bubble */}
                  <div
                    className={`w-full rounded-lg flex items-center justify-center text-xs font-semibold py-2 transition-colors ${
                      done
                        ? 'bg-red-600 text-white'
                        : isToday
                        ? 'bg-gray-200 text-gray-500 ring-2 ring-red-400'
                        : isPast
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-gray-50 text-gray-300'
                    }`}
                    title={done ? `${actual.toFixed(1)} mi run` : ''}
                  >
                    {done ? actual.toFixed(1) : '—'}
                  </div>

                  {/* Planned miles — small chip below */}
                  {hasPlanned && (
                    <div
                      className={`w-full rounded text-center text-[10px] font-medium py-0.5 px-1 ${
                        done
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-400'
                      }`}
                      title={`${planned.toFixed(1)} mi planned`}
                    >
                      {planned.toFixed(1)}p
                    </div>
                  )}

                  {/* Day label */}
                  <span className={`text-xs ${isToday ? 'font-bold text-red-600' : 'text-gray-400'}`}>
                    {DAY_LABELS[i]}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Week totals row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xl font-bold text-gray-900">{totalActual.toFixed(1)}</span>
                <span className="text-xs text-gray-400 ml-1">mi done</span>
              </div>
              {totalPlanned > 0 && (
                <div>
                  <span className="text-xl font-bold text-red-400">{totalPlanned.toFixed(1)}</span>
                  <span className="text-xs text-gray-400 ml-1">mi planned</span>
                </div>
              )}
            </div>
            {totalPlanned > 0 && totalActual > 0 && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                totalActual >= totalPlanned
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-50 text-orange-600'
              }`}>
                {totalActual >= totalPlanned
                  ? `+${(totalActual - totalPlanned).toFixed(1)} ahead`
                  : `${(totalPlanned - totalActual).toFixed(1)} to go`}
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-2">
            <span className="text-[10px] text-gray-400">Red bubble = miles done</span>
            <span className="text-[10px] text-gray-400">· chip = planned (p)</span>
          </div>
        </>
      )}
    </div>
  )
}
