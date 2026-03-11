import { useState } from 'react'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Get the Monday of the week containing `date` (local time).
function getMondayOf(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day)
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

// Build the last N complete week buckets plus the current in-progress week.
// Also fetches extra historical weeks so the rolling average has data to look back on.
function buildWeekBuckets(runs, displayCount = 8, lookback = 8) {
  const total = displayCount + lookback
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisMonday = getMondayOf(today)

  const dailyMiles = {}
  for (const r of runs) {
    dailyMiles[r.date] = (dailyMiles[r.date] || 0) + r.distance
  }

  const allWeeks = []
  for (let i = 0; i < total; i++) {
    const monday = new Date(thisMonday)
    monday.setDate(monday.getDate() - i * 7)
    const dates = weekDates(monday)
    const miles = dates.map(d => dailyMiles[d] || 0)
    const weekTotal = miles.reduce((s, m) => s + m, 0)
    allWeeks.unshift({ monday: new Date(monday), dates, miles, total: weekTotal, isCurrent: i === 0 })
  }

  // Compute rolling 8-week average for each displayed week
  // allWeeks[0..lookback-1] are the extra historical weeks (not displayed)
  const displayWeeks = allWeeks.slice(lookback)
  displayWeeks.forEach((w, i) => {
    // window = this week + 7 weeks before it in allWeeks
    const windowStart = i // index in allWeeks (lookback already shifted)
    const window8 = allWeeks.slice(windowStart, windowStart + lookback)
    w.rollingAvg = window8.reduce((s, wk) => s + wk.total, 0) / lookback
  })

  return displayWeeks
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

const CHART_HEIGHT = 120 // px

export default function WeeklyMileage() {
  const { runs } = useRunningLogDb()
  const [chartView, setChartView] = useState('8') // '8' | '18'

  const displayCount = chartView === '18' ? 18 : 8
  const weeks = buildWeekBuckets(runs, displayCount, 8)
  const currentWeek = weeks[weeks.length - 1]

  // Today's day-of-week index for the current week strip
  const today = new Date()
  const todayISO = toLocalISO(today)
  const todayDayIdx = currentWeek.dates.indexOf(todayISO)

  // Chart Y axis — scale to max of bars OR rolling avg points
  const chartMax = Math.max(
    ...weeks.map(w => w.total),
    ...weeks.map(w => w.rollingAvg),
    1
  )
  const yTicks = buildYTicks(chartMax)
  const yAxisMax = yTicks[yTicks.length - 1]

  // Build SVG polyline points for the rolling average line
  // Each bar is equally spaced; we plot the point at the center of each bar
  const barCount = weeks.length
  // We'll use a viewBox of 0 0 100 100 (percent-based)
  const linePoints = weeks.map((w, i) => {
    const x = (i + 0.5) * (100 / barCount)
    const y = 100 - (yAxisMax > 0 ? (w.rollingAvg / yAxisMax) * 100 : 0)
    return `${x},${y}`
  }).join(' ')

  const currentAvg = weeks[weeks.length - 1].rollingAvg

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

      {/* ── Bar chart (8 or 18 weeks) ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">
              Past {chartView === '18' ? '18' : '8'} Weeks
            </p>
            {/* Toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['8', '18'].map(v => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    chartView === v
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {v}w
                </button>
              ))}
            </div>
          </div>
          {currentAvg > 0 && (
            <p className="text-xs text-gray-400">
              {chartView === '18' ? '18' : '8'}-wk avg <span className="font-semibold text-gray-600">{currentAvg.toFixed(1)} mi/wk</span>
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-300" />
            <span className="text-xs text-gray-400">Weekly miles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="8" viewBox="0 0 16 8">
              <polyline points="0,4 16,4" stroke="#6b7280" strokeWidth="2" strokeDasharray="3,2" fill="none" />
            </svg>
            <span className="text-xs text-gray-400">8-week rolling avg</span>
          </div>
        </div>

        {/* Chart area: Y axis + bars + SVG trend line */}
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

          {/* Bars + SVG trend line container */}
          <div className="flex-1 flex flex-col">
            <div
              className="relative flex items-end gap-1.5"
              style={{ height: CHART_HEIGHT - 20 }}
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
                      <br />
                      8-wk avg: {w.rollingAvg.toFixed(1)} mi/wk
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

              {/* SVG rolling average trend line (dashed line only, no dots) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="1.5"
                  strokeDasharray="3,2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Round dots — rendered as absolutely positioned divs so they stay circular */}
              {weeks.map((w, i) => {
                const xPct = (i + 0.5) * (100 / barCount)
                const yPct = 100 - (yAxisMax > 0 ? (w.rollingAvg / yAxisMax) * 100 : 0)
                return (
                  <div
                    key={i}
                    className="absolute pointer-events-none w-3 h-3 rounded-full bg-white border-2 border-gray-400"
                    style={{
                      left: `${xPct}%`,
                      bottom: `${100 - yPct}%`,
                      transform: 'translate(-50%, 50%)',
                    }}
                  />
                )
              })}
            </div>

            {/* X-axis labels — show every 3rd label in 18-week view to avoid crowding */}
            <div className="flex gap-1.5 mt-1">
              {weeks.map((w, i) => {
                const showLabel = chartView === '8' || w.isCurrent || i % 3 === 0
                return (
                  <div key={i} className="flex-1 text-center overflow-hidden">
                    {showLabel && (
                      <span className={`text-xs ${w.isCurrent ? 'font-bold text-red-600' : 'text-gray-400'}`}>
                        {w.isCurrent ? 'Now' : weekLabel(w.monday)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Bars show total miles per week. The dashed line tracks your 8-week rolling average — each point represents the average weekly mileage over the preceding 8 weeks, giving you a smoothed view of how your training load is trending over time.
        </p>
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
