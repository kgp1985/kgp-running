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

// Nice round Y-axis tick values
function buildYTicks(max) {
  if (max <= 0) return [0]
  const rawStep = max / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const step = Math.ceil(rawStep / magnitude) * magnitude
  const ticks = []
  for (let v = 0; v <= max + step; v += step) {
    ticks.push(v)
    if (v >= max) break
  }
  return ticks
}

const CHART_HEIGHT = 120 // px — height of the bar area

export default function WeeklyMileage() {
  const { runs } = useRunningLogDb()

  const weeks = buildWeekBuckets(runs, 8)
  const currentWeek = weeks[weeks.length - 1]
  const pastWeeks = weeks.slice(0, weeks.length - 1)

  // Today's day-of-week index for the current week strip
  const today = new Date()
  const todayISO = toLocalISO(today)
  const todayDayIdx = currentWeek.dates.indexOf(todayISO)

  // Chart max and Y ticks
  const chartMax = Math.max(...weeks.map(w => w.total), 1)
  const yTicks = buildYTicks(chartMax)
  const yAxisMax = yTicks[yTicks.length - 1]

  // Average weekly mileage (all 8 weeks including current)
  const weeksWithRuns = weeks.filter(w => w.total > 0)
  const avgMiles = weeksWithRuns.length > 0
    ? weeksWithRuns.reduce((s, w) => s + w.total, 0) / weeksWithRuns.length
    : 0

  // Trend line Y position as a percentage from bottom
  const avgPct = yAxisMax > 0 ? (avgMiles / yAxisMax) * 100 : 0

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
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-600">Past 8 Weeks</p>
          {avgMiles > 0 && (
            <p className="text-xs text-gray-400">
              avg <span className="font-semibold text-gray-600">{avgMiles.toFixed(1)} mi/wk</span>
            </p>
          )}
        </div>

        {/* Chart area: Y axis + bars */}
        <div className="flex gap-2">

          {/* Y axis labels */}
          <div
            className="flex flex-col justify-between items-end shrink-0 pb-5"
            style={{ height: CHART_HEIGHT }}
          >
            {[...yTicks].reverse().map(tick => (
              <span key={tick} className="text-xs text-gray-400 leading-none">
                {tick}
              </span>
            ))}
          </div>

          {/* Bars + trend line container */}
          <div className="flex-1 flex flex-col">
            {/* Bar + trend line area */}
            <div
              className="relative flex items-end gap-1.5"
              style={{ height: CHART_HEIGHT - 20 }} // leave 20px for X labels
            >
              {/* Subtle grid lines */}
              {yTicks.map(tick => (
                <div
                  key={tick}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ bottom: `${(tick / yAxisMax) * 100}%` }}
                />
              ))}

              {/* Bars */}
              {weeks.map((w, i) => {
                const pct = yAxisMax > 0 ? (w.total / yAxisMax) * 100 : 0
                const barH = Math.max(pct, w.total > 0 ? 2 : 0)
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {weekLabel(w.monday)}: {w.total.toFixed(1)} mi
                    </div>
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        w.isCurrent ? 'bg-red-500' : 'bg-red-200 hover:bg-red-400'
                      }`}
                      style={{ height: `${barH}%`, minHeight: w.total > 0 ? '3px' : '0' }}
                    />
                  </div>
                )
              })}

              {/* Trend line — horizontal dashed line at average */}
              {avgMiles > 0 && (
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ bottom: `${avgPct}%` }}
                >
                  <div className="relative">
                    <div className="border-t-2 border-dashed border-gray-400 w-full" />
                  </div>
                </div>
              )}
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
