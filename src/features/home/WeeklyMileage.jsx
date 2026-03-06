import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Get the Monday of the week containing `date` (local time).
function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day) // shift so Monday = 0
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Format a Date as YYYY-MM-DD (local, not UTC)
function toLocalISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Return array of 7 YYYY-MM-DD strings Mon–Sun for the week of `monday`
function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return toLocalISO(d)
  })
}

// Build the last N complete week buckets (Mon–Sun) ending before this week,
// plus the current (in-progress) week as week 0.
function buildWeekBuckets(runs, count = 8) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisMonday = getMondayOf(today)

  // Build a map: ISO date → total miles
  const dailyMiles = {}
  for (const r of runs) {
    dailyMiles[r.date] = (dailyMiles[r.date] || 0) + r.distance
  }

  const weeks = []
  for (let i = 0; i < count; i++) {
    const monday = new Date(thisMonday)
    monday.setDate(monday.getDate() - i * 7)
    const dates = weekDates(monday)
    const miles = dates.map(d => dailyMiles[d] || 0)
    const total = miles.reduce((s, m) => s + m, 0)
    weeks.unshift({ monday: new Date(monday), dates, miles, total, isCurrent: i === 0 })
  }
  return weeks
}

// Format week label: "Jan 6" style from its Monday
function weekLabel(monday) {
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WeeklyMileage() {
  const { runs } = useRunningLogDb()

  const weeks = buildWeekBuckets(runs, 8)
  const currentWeek = weeks[weeks.length - 1] // last in array = this week
  const pastWeeks = weeks.slice(0, weeks.length - 1) // 7 prior weeks for chart

  // Today's day-of-week index (0=Mon … 6=Sun) for the current week bar
  const today = new Date()
  const todayISO = toLocalISO(today)
  const todayDayIdx = currentWeek.dates.indexOf(todayISO)

  // Chart: use all 8 weeks for the bar graph
  const chartMax = Math.max(...weeks.map(w => w.total), 1)

  return (
    <div className="card space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Weekly Mileage</h2>

      {/* ── Current week strip ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">This Week</span>
          <span className="text-xl font-bold text-gray-900">
            {currentWeek.total.toFixed(1)}
            <span className="text-sm font-normal text-gray-400 ml-1">mi</span>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((label, i) => {
            const miles = currentWeek.miles[i]
            const isPast = todayDayIdx >= 0 && i < todayDayIdx
            const isToday = i === todayDayIdx
            const isFuture = todayDayIdx >= 0 && i > todayDayIdx

            return (
              <div key={label} className="flex flex-col items-center gap-1">
                {/* Mileage bubble */}
                <div
                  className={`w-full rounded-lg flex items-center justify-center text-xs font-semibold py-2 transition-colors ${
                    miles > 0
                      ? 'bg-red-600 text-white'
                      : isToday
                      ? 'bg-gray-200 text-gray-500 ring-2 ring-red-400'
                      : isFuture
                      ? 'bg-gray-100 text-gray-300'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  title={miles > 0 ? `${miles.toFixed(1)} mi` : ''}
                >
                  {miles > 0 ? miles.toFixed(1) : '—'}
                </div>
                <span className={`text-xs ${isToday ? 'font-bold text-red-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 8-week bar chart ── */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-3">Past 8 Weeks</p>
        <div className="flex items-end gap-1.5 h-24">
          {weeks.map((w, i) => {
            const pct = chartMax > 0 ? w.total / chartMax : 0
            const barH = Math.max(pct * 100, w.total > 0 ? 4 : 0) // min 4% if any miles
            const isCurrent = w.isCurrent

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {weekLabel(w.monday)}: {w.total.toFixed(1)} mi
                </div>
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    isCurrent ? 'bg-red-500' : 'bg-red-200 hover:bg-red-400'
                  }`}
                  style={{ height: `${barH}%`, minHeight: w.total > 0 ? '3px' : '0' }}
                />
              </div>
            )
          })}
        </div>
        {/* X-axis labels */}
        <div className="flex gap-1.5 mt-1">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 text-center">
              <span className={`text-xs ${w.isCurrent ? 'font-bold text-red-600' : 'text-gray-400'}`}>
                {w.isCurrent ? 'Now' : weekLabel(w.monday)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {runs.length === 0 && (
        <p className="text-xs text-gray-400 text-center -mt-2">
          Log runs to see your weekly mileage chart.
        </p>
      )}
    </div>
  )
}
