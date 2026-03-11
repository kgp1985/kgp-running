import { useState } from 'react'
import { useRunningLogDb } from '../../hooks/useRunningLogDb.js'
import { secondsToTimeStr } from '../../utils/paceCalc.js'

// Returns YYYY-MM-DD for a Date object
function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function computeStats(runs, startISO, endISO) {
  const subset = runs.filter(r => r.date >= startISO && r.date <= endISO)
  if (subset.length === 0) return null
  const totalMiles    = subset.reduce((s, r) => s + r.distance, 0)
  const totalDuration = subset.reduce((s, r) => s + r.duration, 0)
  const uniqueDays    = new Set(subset.map(r => r.date)).size
  const longestRun    = Math.max(...subset.map(r => r.distance))
  const avgPace       = totalMiles > 0 ? totalDuration / totalMiles : null
  return { totalMiles, totalDuration, uniqueDays, totalRuns: subset.length, longestRun, avgPace }
}

function StatRow({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">
        {value}{sub && <span className="text-xs font-normal text-gray-400 ml-1">{sub}</span>}
      </span>
    </div>
  )
}

const TABS = [
  { key: 'month',    label: 'This Month' },
  { key: 'calyear',  label: 'Calendar Year' },
  { key: 'rolling',  label: 'Rolling Year' },
]

export default function PeriodStats() {
  const { runs } = useRunningLogDb()
  const [tab, setTab] = useState('month')

  const today = new Date()
  const todayISO = toISO(today)

  const ranges = {
    month: (() => {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: toISO(start), end: todayISO, weeks: today.getDate() / 7 }
    })(),
    calyear: (() => {
      const start = new Date(today.getFullYear(), 0, 1)
      const dayOfYear = Math.ceil((today - start) / 86400000) + 1
      return { start: toISO(start), end: todayISO, weeks: dayOfYear / 7 }
    })(),
    rolling: (() => {
      const start = new Date(today)
      start.setDate(start.getDate() - 364)
      return { start: toISO(start), end: todayISO, weeks: 52 }
    })(),
  }

  const range = ranges[tab]
  const stats = computeStats(runs, range.start, range.end)

  return (
    <div className="card">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Stats</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!stats ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm">No runs logged in this period yet.</p>
        </div>
      ) : (
        <div>
          {/* Hero number */}
          <div className="flex items-end gap-2 mb-4">
            <span className="text-4xl font-bold text-gray-900">{stats.totalMiles.toFixed(1)}</span>
            <span className="text-sm text-gray-400 pb-1">miles</span>
            <span className="ml-auto text-sm text-gray-400 pb-1">{stats.totalRuns} run{stats.totalRuns !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-0">
            <StatRow
              label="Days with a run"
              value={stats.uniqueDays}
              sub={`/ ${tab === 'month'
                ? today.getDate()
                : tab === 'calyear'
                ? Math.ceil((today - new Date(today.getFullYear(), 0, 1)) / 86400000) + 1
                : 365} days`}
            />
            <StatRow
              label="Total time"
              value={secondsToTimeStr(stats.totalDuration, true)}
            />
            <StatRow
              label="Longest run"
              value={stats.longestRun.toFixed(1)}
              sub="mi"
            />
            <StatRow
              label="Avg pace"
              value={stats.avgPace ? secondsToTimeStr(stats.avgPace) + '/mi' : '--'}
            />
            <StatRow
              label="Avg miles / week"
              value={range.weeks > 0 ? (stats.totalMiles / range.weeks).toFixed(1) : '--'}
              sub="mi/wk"
            />
          </div>
        </div>
      )}
    </div>
  )
}
